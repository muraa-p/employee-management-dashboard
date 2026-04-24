insert into public.departments (name)
values
  ('Human Resources'),
  ('Engineering'),
  ('Product')
on conflict (name) do nothing;

insert into public.employees (
  emp_id,
  name,
  email,
  phone,
  role,
  role_type,
  department_id,
  joining_date,
  status
)
select *
from (
  select
    'Emp-001',
    'Public Demo HR',
    'hr@test.com',
    '+60 12-345 6789',
    'HR Manager',
    'hr',
    (select id from public.departments where name = 'Human Resources'),
    current_date - interval '540 days',
    'active'
  union all
  select
    'Emp-002',
    'Public Demo Employee',
    'emp@test.com',
    '+60 18-222 3344',
    'Frontend Engineer',
    'employee',
    (select id from public.departments where name = 'Engineering'),
    current_date - interval '320 days',
    'active'
  union all
  select
    'Emp-003',
    'Internal Demo Designer',
    'designer@test.com',
    '+60 17-111 5566',
    'Product Designer',
    'employee',
    (select id from public.departments where name = 'Product'),
    current_date - interval '260 days',
    'active'
) as seed (
  emp_id,
  name,
  email,
  phone,
  role,
  role_type,
  department_id,
  joining_date,
  status
)
on conflict (email) do nothing;

insert into public.projects (
  name,
  description,
  lead_id,
  deadline,
  status
)
select
  'Employee Portal Refresh',
  'Refresh the internal workspace for attendance, leave tracking, and employee self-service.',
  e.id,
  current_date + interval '30 days',
  'active'
from public.employees e
where e.email = 'hr@test.com'
on conflict do nothing;

insert into public.project_members (project_id, employee_id)
select p.id, e.id
from public.projects p
cross join public.employees e
where p.name = 'Employee Portal Refresh'
  and e.email in ('hr@test.com', 'emp@test.com', 'designer@test.com')
on conflict do nothing;

insert into public.tasks (project_id, title, assigned_to, status, deadline)
select
  p.id,
  seed.title,
  e.id,
  seed.status,
  seed.deadline
from public.projects p
join (
  values
    ('Finalize dashboard cards', 'emp@test.com', 'in-progress', current_date + interval '7 days'),
    ('Prepare employee management UI polish', 'designer@test.com', 'pending', current_date + interval '10 days'),
    ('Review leave request workflow copy', 'hr@test.com', 'done', current_date + interval '3 days')
) as seed (title, email, status, deadline)
  on true
join public.employees e
  on e.email = seed.email
where p.name = 'Employee Portal Refresh'
on conflict do nothing;

insert into public.attendance (employee_id, date, status, check_in, check_out)
select
  e.id,
  current_date,
  seed.status,
  seed.check_in,
  seed.check_out
from public.employees e
join (
  values
    ('hr@test.com', 'present', '08:55', '17:35'),
    ('emp@test.com', 'present', '09:10', '18:02'),
    ('designer@test.com', 'half-day', '09:30', '13:15')
) as seed (email, status, check_in, check_out)
  on e.email = seed.email
on conflict (employee_id, date) do nothing;

insert into public.leaves (employee_id, type, start_date, end_date, status)
select
  e.id,
  seed.type,
  seed.start_date,
  seed.end_date,
  seed.status
from public.employees e
join (
  values
    ('emp@test.com', 'paid', current_date + interval '14 days', current_date + interval '16 days', 'pending'),
    ('designer@test.com', 'sick', current_date - interval '4 days', current_date - interval '3 days', 'approved')
) as seed (email, type, start_date, end_date, status)
  on e.email = seed.email
on conflict do nothing;

-- After inserting these rows, create matching Supabase Auth users for:
--   hr@test.com
--   emp@test.com
--   designer@test.com
-- The app matches logged-in users to employee profiles by email.
-- After creating auth users, run:
--   select public.sync_employee_auth_links();
