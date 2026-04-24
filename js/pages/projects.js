import { supabase } from '../supabase.js';
import { blockDemoWrite, isReadOnlyDemo } from '../demo-mode.js';

const SORT_MAP = {
  name:       { col: 'name',       asc: true  },
  deadline:   { col: 'deadline',   asc: true  },
  created_at: { col: 'created_at', asc: false },
};

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#6366F1'];
function getColor(name) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function initials(n) { return (n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

export async function renderProjects(container, employee) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 class="page-title" style="margin-bottom:0">Projects</h1>
      <button class="btn btn-dark" id="add-project-btn" ${isReadOnlyDemo(employee) ? 'disabled title="Disabled in public demo"' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Project
      </button>
    </div>
    <div class="projects-filters" id="projects-filters">
      <div class="filter-tabs" id="status-tabs">
        <button class="filter-tab active" data-status="">All</button>
        <button class="filter-tab" data-status="active">Active</button>
        <button class="filter-tab" data-status="completed">Completed</button>
        <button class="filter-tab" data-status="on-hold">On Hold</button>
      </div>
      <div style="display:flex;gap:8px">
        <select class="filter-select" id="sort-select">
          <option value="created_at">Sort By: Latest</option>
          <option value="name">Sort By: Name</option>
          <option value="deadline">Sort By: Deadline</option>
        </select>
        <div class="table-search" style="width:200px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="project-search" placeholder="Search projects" />
        </div>
      </div>
    </div>
    <div class="projects-grid" id="projects-grid">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div id="project-modal"></div>
  `;

  let filters = { status: '', sort: 'created_at', search: '' };

  async function load() {
    const { col, asc } = SORT_MAP[filters.sort] || SORT_MAP.created_at;
    let q = supabase.from('projects')
      .select('*, employees!projects_lead_id_fkey(name, role), project_members(count)')
      .order(col, { ascending: asc });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.search) q = q.ilike('name', `%${filters.search}%`);

    const { data: projects, error } = await q;
    renderGrid(projects || []);
  }

  function renderGrid(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (projects.length === 0) {
      grid.innerHTML = `<div class="empty-state"><h3>No projects found</h3><p>Add a project to get started.</p></div>`;
      return;
    }

    grid.innerHTML = projects.map(p => {
      const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
      const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
      const leadName = p.employees?.name || 'Unassigned';
      const statusClass = p.status === 'active' ? 'available' : p.status === 'completed' ? 'available' : 'on-leave';
      const memberCount = p.project_members?.[0]?.count ?? 0;

      return `
        <div class="project-card" data-id="${p.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div class="project-card-name">${p.name}</div>
            <span class="status-badge ${statusClass}">${p.status}</span>
          </div>
          ${p.description ? `<div class="project-card-desc">${p.description}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
            <div class="member-avatar" style="background:${getColor(leadName)};width:26px;height:26px;font-size:11px">${initials(leadName)}</div>
            <div>
              <div style="font-size:12px;font-weight:600">${leadName}</div>
              <div style="font-size:11px;color:var(--c-gray-500)">Project Lead · ${memberCount} member${memberCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
              <span style="color:var(--c-gray-500)">${p.completed_tasks} / ${p.total_tasks} tasks done</span>
              <span style="font-weight:700">${pct}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--c-gray-200);padding-top:12px;gap:8px">
            <div style="font-size:11px;color:var(--c-gray-500)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${deadline}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-outline btn-sm members-btn" data-id="${p.id}" data-name="${p.name}" style="font-size:11px;padding:4px 10px">Members</button>
              <button class="btn btn-outline btn-sm tasks-btn" data-id="${p.id}" data-name="${p.name}" style="font-size:11px;padding:4px 10px">Tasks</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire up Members buttons
    grid.querySelectorAll('.members-btn').forEach(btn => {
      btn.addEventListener('click', () => showMembersModal(btn.dataset.id, btn.dataset.name, employee));
    });
    // Wire up Tasks buttons
    grid.querySelectorAll('.tasks-btn').forEach(btn => {
      btn.addEventListener('click', () => showTasksModal(btn.dataset.id, btn.dataset.name, employee));
    });
  }

  // Status tab filter
  document.getElementById('status-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filters.status = btn.dataset.status;
    load();
  });

  // Sort select
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    filters.sort = e.target.value;
    load();
  });

  // Search
  let st;
  document.getElementById('project-search')?.addEventListener('input', (e) => {
    clearTimeout(st);
    st = setTimeout(() => { filters.search = e.target.value; load(); }, 300);
  });

  // Add project
  document.getElementById('add-project-btn')?.addEventListener('click', () => {
    if (blockDemoWrite(employee, 'Project creation is disabled in the public demo.')) return;
    showAddProjectModal(load, employee);
  });

  load();
}

function showAddProjectModal(onSuccess, employee) {
  const modal = document.getElementById('project-modal');
  if (!modal) return;

  supabase.from('employees').select('id, name').eq('status','active').order('name').then(({ data: emps }) => {
    modal.innerHTML = `
      <div class="modal-overlay" id="proj-modal-overlay">
        <div class="modal">
          <h2>New Project</h2>
          <form id="proj-form">
            <div class="form-group"><label>Project Name</label><input type="text" name="name" required /></div>
            <div class="form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
            <div class="form-group">
              <label>Project Lead</label>
              <select name="lead_id" required>
                <option value="">Select Lead</option>
                ${emps?.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Deadline</label><input type="date" name="deadline" /></div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="proj-cancel">Cancel</button>
              <button type="submit" class="btn btn-dark" id="proj-submit">Create Project</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('proj-cancel').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('proj-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) modal.innerHTML = ''; });

    document.getElementById('proj-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (blockDemoWrite(employee, 'Project creation is disabled in the public demo.')) return;
      const btn = document.getElementById('proj-submit');
      btn.disabled = true; btn.textContent = 'Creating...';
      const data = Object.fromEntries(new FormData(e.target));
      if (!data.deadline) delete data.deadline;
      await supabase.from('projects').insert({ ...data, total_tasks: 0, completed_tasks: 0 });
      modal.innerHTML = '';
      onSuccess();
    });
  });
}

async function showMembersModal(projectId, projectName, employee) {
  const modal = document.getElementById('project-modal');

  const [{ data: allEmps }, { data: currentMembers }] = await Promise.all([
    supabase.from('employees').select('id, name, role').eq('status', 'active').order('name'),
    supabase.from('project_members').select('employee_id, employees(name)').eq('project_id', projectId),
  ]);

  const memberIds = new Set(currentMembers?.map(m => m.employee_id) || []);

  modal.innerHTML = `
    <div class="modal-overlay" id="members-modal-overlay">
      <div class="modal">
        <h2>Members — ${projectName}</h2>
        <p style="font-size:13px;color:var(--c-gray-500);margin-bottom:16px">Select team members for this project.</p>
        <div class="members-checkboxes" style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
          ${allEmps?.map(e => `
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px;border-radius:8px;border:1px solid var(--c-gray-200);">
              <input type="checkbox" value="${e.id}" ${memberIds.has(e.id) ? 'checked' : ''} />
              <span style="font-size:13px;font-weight:500">${e.name}</span>
              <span style="font-size:11px;color:var(--c-gray-500)">${e.role}</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="mem-cancel">Cancel</button>
          <button class="btn btn-dark" id="mem-save">Save Members</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('mem-cancel').addEventListener('click', () => modal.innerHTML = '');
  document.getElementById('members-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) modal.innerHTML = ''; });

  document.getElementById('mem-save').addEventListener('click', async () => {
    if (blockDemoWrite(employee, 'Project membership changes are disabled in the public demo.')) return;
    const checked = [...modal.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
    // Delete old, insert new
    await supabase.from('project_members').delete().eq('project_id', projectId);
    if (checked.length > 0) {
      await supabase.from('project_members').insert(checked.map(eid => ({ project_id: projectId, employee_id: eid })));
    }
    modal.innerHTML = '';
  });
}

async function showTasksModal(projectId, projectName, employee) {
  const modal = document.getElementById('project-modal');

  const [{ data: tasks }, { data: members }, { data: project }] = await Promise.all([
    supabase.from('tasks').select('*, employees!tasks_assigned_to_fkey(name)').eq('project_id', projectId).order('created_at'),
    supabase.from('project_members').select('employee_id, employees(name)').eq('project_id', projectId),
    supabase.from('projects').select('lead_id, employees!projects_lead_id_fkey(name)').eq('id', projectId).single()
  ]);

  if (project?.lead_id && !members?.find(m => m.employee_id === project.lead_id)) {
    members.push({ employee_id: project.lead_id, employees: { name: project.employees?.name + ' (Lead)' } });
  }

  function renderTasks(taskList) {
    return taskList?.length > 0 ? taskList.map(t => `
      <div class="task-item" data-tid="${t.id}">
        <div class="task-item-check ${t.status}" data-tid="${t.id}"></div>
        <div class="task-item-body">
          <div class="task-item-title ${t.status === 'done' ? 'done' : ''}">${t.title}</div>
          <div class="task-item-meta">
            ${t.employees?.name ? `Assigned: ${t.employees.name} · ` : ''}
            ${t.deadline ? `Due: ${new Date(t.deadline).toLocaleDateString('en-US', { month:'short', day:'numeric' })}` : 'No deadline'}
          </div>
        </div>
        <select class="task-status-select" data-tid="${t.id}">
          <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="done" ${t.status==='done'?'selected':''}>Done</option>
        </select>
        <button class="btn-icon del-task" data-tid="${t.id}" title="Delete task" style="color:var(--c-red,#ef4444)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
    `).join('') : '<p style="color:var(--c-gray-400);font-size:13px;text-align:center;padding:16px">No tasks yet</p>';
  }

  const memberOptions = members?.map(m => `<option value="${m.employee_id}">${m.employees?.name}</option>`).join('') || '';

  modal.innerHTML = `
    <div class="modal-overlay" id="tasks-modal-overlay">
      <div class="modal" style="max-width:640px">
        <h2>Tasks — ${projectName}</h2>
        <div id="tasks-list" class="task-list">${renderTasks(tasks)}</div>
        <form id="add-task-form" style="margin-top:16px;border-top:1px solid var(--c-gray-200);padding-top:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group" style="margin-bottom:0"><label>Task Title</label><input type="text" name="title" placeholder="Enter task…" required /></div>
            <div class="form-group" style="margin-bottom:0"><label>Assign To</label>
              <select name="assigned_to">
                <option value="">Unassigned</option>
                ${memberOptions}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:10px;align-items:flex-end">
            <div class="form-group" style="margin-bottom:0"><label>Deadline</label><input type="date" name="deadline" /></div>
            <button type="submit" class="btn btn-dark">Add Task</button>
          </div>
        </form>
        <div class="modal-actions" style="margin-top:16px">
          <button class="btn btn-outline" id="tasks-close">Close</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('tasks-close').addEventListener('click', () => modal.innerHTML = '');
  document.getElementById('tasks-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) modal.innerHTML = ''; });

  // Status change
  modal.addEventListener('change', async (e) => {
    if (e.target.matches('.task-status-select')) {
      const tid = e.target.dataset.tid;
      const newStatus = e.target.value;
      if (blockDemoWrite(employee, 'Task updates are disabled in the public demo.')) {
        e.target.value = e.target.defaultValue;
        return;
      }
      await supabase.from('tasks').update({ status: newStatus }).eq('id', tid);
      e.target.defaultValue = newStatus;
      // Update check indicator
      const check = modal.querySelector(`.task-item-check[data-tid="${tid}"]`);
      if (check) { check.className = `task-item-check ${newStatus}`; }
    }
  });

  // Delete task
  modal.addEventListener('click', async (e) => {
    const btn = e.target.closest('.del-task');
    if (!btn) return;
    if (confirm('Delete this task?')) {
      if (blockDemoWrite(employee, 'Task deletion is disabled in the public demo.')) return;
      await supabase.from('tasks').delete().eq('id', btn.dataset.tid);
      const { data: updated } = await supabase.from('tasks').select('*, employees!tasks_assigned_to_fkey(name)').eq('project_id', projectId).order('created_at');
      document.getElementById('tasks-list').innerHTML = renderTasks(updated);
    }
  });

  // Add task
  document.getElementById('add-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (blockDemoWrite(employee, 'Task creation is disabled in the public demo.')) return;
    const d = Object.fromEntries(new FormData(e.target));
    d.project_id = projectId;
    if (!d.assigned_to) delete d.assigned_to;
    if (!d.deadline) delete d.deadline;
    await supabase.from('tasks').insert(d);
    e.target.reset();
    const { data: updated } = await supabase.from('tasks').select('*, employees!tasks_assigned_to_fkey(name)').eq('project_id', projectId).order('created_at');
    document.getElementById('tasks-list').innerHTML = renderTasks(updated);
  });
}
