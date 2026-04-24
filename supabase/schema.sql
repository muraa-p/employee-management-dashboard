create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  emp_id text not null unique,
  name text not null,
  email text not null unique,
  phone text,
  role text not null,
  role_type text not null default 'employee' check (role_type in ('hr', 'employee')),
  department_id uuid references public.departments(id) on delete set null,
  joining_date date not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  lead_id uuid references public.employees(id) on delete set null,
  deadline date,
  status text not null default 'active' check (status in ('active', 'on-hold', 'completed')),
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, employee_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  assigned_to uuid references public.employees(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'done')),
  deadline date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'on-leave', 'half-day')),
  check_in time,
  check_out time,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, date)
);

create table if not exists public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type text not null check (type in ('paid', 'sick', 'casual')),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);

create index if not exists idx_employees_department_id on public.employees(department_id);
create index if not exists idx_employees_email on public.employees(email);
create index if not exists idx_projects_lead_id on public.projects(lead_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);
create index if not exists idx_attendance_employee_date on public.attendance(employee_id, date);
create index if not exists idx_leaves_employee_id on public.leaves(employee_id);

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists trg_leaves_updated_at on public.leaves;
create trigger trg_leaves_updated_at
before update on public.leaves
for each row execute function public.set_updated_at();

create or replace function public.current_employee_id()
returns uuid
language sql
stable
as $$
  select id
  from public.employees
  where lower(email) = lower(auth.email())
  limit 1
$$;

create or replace function public.is_hr_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.employees
    where lower(email) = lower(auth.email())
      and role_type = 'hr'
      and status = 'active'
  )
$$;

create or replace function public.sync_project_task_totals()
returns trigger
language plpgsql
as $$
declare
  target_project_id uuid;
begin
  target_project_id := coalesce(new.project_id, old.project_id);

  update public.projects p
  set total_tasks = coalesce(src.total_tasks, 0),
      completed_tasks = coalesce(src.completed_tasks, 0),
      updated_at = timezone('utc', now())
  from (
    select
      project_id,
      count(*)::integer as total_tasks,
      count(*) filter (where status = 'done')::integer as completed_tasks
    from public.tasks
    where project_id = target_project_id
    group by project_id
  ) src
  where p.id = src.project_id;

  update public.projects
  set total_tasks = 0,
      completed_tasks = 0,
      updated_at = timezone('utc', now())
  where id = target_project_id
    and not exists (
      select 1 from public.tasks where project_id = target_project_id
    );

  return null;
end;
$$;

drop trigger if exists trg_sync_project_task_totals on public.tasks;
create trigger trg_sync_project_task_totals
after insert or update or delete on public.tasks
for each row execute function public.sync_project_task_totals();

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;

drop policy if exists "departments_select_authenticated" on public.departments;
create policy "departments_select_authenticated"
on public.departments
for select
to authenticated
using (true);

drop policy if exists "departments_manage_hr" on public.departments;
create policy "departments_manage_hr"
on public.departments
for all
to authenticated
using (public.is_hr_user())
with check (public.is_hr_user());

drop policy if exists "employees_select_authenticated" on public.employees;
create policy "employees_select_authenticated"
on public.employees
for select
to authenticated
using (true);

drop policy if exists "employees_insert_hr" on public.employees;
create policy "employees_insert_hr"
on public.employees
for insert
to authenticated
with check (public.is_hr_user());

drop policy if exists "employees_update_self_or_hr" on public.employees;
create policy "employees_update_self_or_hr"
on public.employees
for update
to authenticated
using (public.is_hr_user() or lower(email) = lower(auth.email()))
with check (public.is_hr_user() or lower(email) = lower(auth.email()));

drop policy if exists "employees_delete_hr" on public.employees;
create policy "employees_delete_hr"
on public.employees
for delete
to authenticated
using (public.is_hr_user());

drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "projects_manage_hr" on public.projects;
create policy "projects_manage_hr"
on public.projects
for all
to authenticated
using (public.is_hr_user())
with check (public.is_hr_user());

drop policy if exists "project_members_select_authenticated" on public.project_members;
create policy "project_members_select_authenticated"
on public.project_members
for select
to authenticated
using (true);

drop policy if exists "project_members_manage_hr" on public.project_members;
create policy "project_members_manage_hr"
on public.project_members
for all
to authenticated
using (public.is_hr_user())
with check (public.is_hr_user());

drop policy if exists "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated"
on public.tasks
for select
to authenticated
using (true);

drop policy if exists "tasks_insert_hr" on public.tasks;
create policy "tasks_insert_hr"
on public.tasks
for insert
to authenticated
with check (public.is_hr_user());

drop policy if exists "tasks_update_assignee_or_hr" on public.tasks;
create policy "tasks_update_assignee_or_hr"
on public.tasks
for update
to authenticated
using (public.is_hr_user() or assigned_to = public.current_employee_id())
with check (public.is_hr_user() or assigned_to = public.current_employee_id());

drop policy if exists "tasks_delete_hr" on public.tasks;
create policy "tasks_delete_hr"
on public.tasks
for delete
to authenticated
using (public.is_hr_user());

drop policy if exists "attendance_select_authenticated" on public.attendance;
create policy "attendance_select_authenticated"
on public.attendance
for select
to authenticated
using (true);

drop policy if exists "attendance_manage_hr" on public.attendance;
create policy "attendance_manage_hr"
on public.attendance
for all
to authenticated
using (public.is_hr_user())
with check (public.is_hr_user());

drop policy if exists "leaves_select_own_or_hr" on public.leaves;
create policy "leaves_select_own_or_hr"
on public.leaves
for select
to authenticated
using (public.is_hr_user() or employee_id = public.current_employee_id());

drop policy if exists "leaves_insert_own_or_hr" on public.leaves;
create policy "leaves_insert_own_or_hr"
on public.leaves
for insert
to authenticated
with check (public.is_hr_user() or employee_id = public.current_employee_id());

drop policy if exists "leaves_update_hr" on public.leaves;
create policy "leaves_update_hr"
on public.leaves
for update
to authenticated
using (public.is_hr_user())
with check (public.is_hr_user());

drop policy if exists "leaves_delete_hr" on public.leaves;
create policy "leaves_delete_hr"
on public.leaves
for delete
to authenticated
using (public.is_hr_user());
