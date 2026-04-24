import { supabase } from '../supabase.js';
import { blockDemoWrite } from '../demo-mode.js';

export async function renderMyProjects(container, employee) {
  container.innerHTML = `
    <h1 class="page-title">My Projects</h1>
    <div class="projects-grid" id="my-projects-grid">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div id="my-proj-modal"></div>
  `;

  await loadMyProjects(employee);
}

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
function getColor(name) { let h=0;for(let i=0;i<(name||'').length;i++) h=(name||'').charCodeAt(i)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function initials(n) { return (n||'?').split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2); }

async function loadMyProjects(employee) {
  // Get projects where I'm a member
  const { data: memberships } = await supabase
    .from('project_members').select('project_id').eq('employee_id', employee.id);
  // Get projects where I'm the lead
  const { data: led } = await supabase
    .from('projects').select('id').eq('lead_id', employee.id);

  const ids = [...new Set([...(memberships?.map(m => m.project_id) || []), ...(led?.map(p => p.id) || [])])];

  const grid = document.getElementById('my-projects-grid');
  if (!grid) return;

  if (ids.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No projects assigned</h3><p>Ask HR or your project lead to add you to a project.</p></div>`;
    return;
  }

  const { data: projects } = await supabase.from('projects')
    .select('*, employees!projects_lead_id_fkey(id, name)')
    .in('id', ids);

  if (!projects || projects.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No projects found.</h3></div>`;
    return;
  }

  // Get task counts per project for me
  const { data: myTasks } = await supabase.from('tasks')
    .select('project_id, status')
    .eq('assigned_to', employee.id)
    .in('project_id', ids);

  grid.innerHTML = projects.map(p => {
    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
    const isLead = p.employees?.id === employee.id;
    const myProjTasks = myTasks?.filter(t => t.project_id === p.id) || [];
    const myDone = myProjTasks.filter(t => t.status === 'done').length;
    const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'No deadline';

    return `
      <div class="project-card" data-id="${p.id}">
        ${isLead ? `<div style="margin-bottom:8px"><span class="role-badge role-hr" style="background:#E0F2FE;color:#0369A1">Project Lead</span></div>` : ''}
        <div class="project-card-name">${p.name}</div>
        ${p.description ? `<div class="project-card-desc">${p.description}</div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:12px;color:var(--c-gray-500)">
          <span>My tasks: ${myDone}/${myProjTasks.length} done</span>
          <span>${deadline}</span>
        </div>
        <div class="progress-bar" style="margin-bottom:14px"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--c-gray-200);padding-top:12px">
          <span class="status-badge ${p.status==='active'?'available':'on-leave'}">${p.status}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm view-tasks-btn" data-id="${p.id}" data-name="${p.name}" style="font-size:11px;padding:4px 10px">My Tasks</button>
            ${isLead ? `<button class="btn btn-outline btn-sm manage-team-btn" data-id="${p.id}" data-name="${p.name}" style="font-size:11px;padding:4px 10px">Manage Team</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.view-tasks-btn').forEach(btn => {
    btn.addEventListener('click', () => showMyTasksModal(btn.dataset.id, btn.dataset.name, employee));
  });
  grid.querySelectorAll('.manage-team-btn').forEach(btn => {
    btn.addEventListener('click', () => showManageTeamModal(btn.dataset.id, btn.dataset.name, employee));
  });
}

async function showMyTasksModal(projectId, projectName, employee) {
  const modal = document.getElementById('my-proj-modal');

  const { data: tasks } = await supabase.from('tasks')
    .select('*').eq('project_id', projectId).eq('assigned_to', employee.id).order('deadline', { ascending: true });

  function renderItems(list) {
    return list?.length > 0 ? list.map(t => `
      <div class="task-item" data-tid="${t.id}">
        <div class="task-item-check ${t.status}" data-tid="${t.id}"></div>
        <div class="task-item-body">
          <div class="task-item-title ${t.status==='done'?'done':''}">${t.title}</div>
          <div class="task-item-meta">${t.deadline ? `Due: ${new Date(t.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : 'No deadline'}</div>
        </div>
        <select class="task-status-select" data-tid="${t.id}">
          <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="done" ${t.status==='done'?'selected':''}>Done</option>
        </select>
      </div>
    `).join('') : `<p style="color:var(--c-gray-400);font-size:13px;padding:16px;text-align:center">No tasks assigned to you in this project.</p>`;
  }

  modal.innerHTML = `
    <div class="modal-overlay" id="my-tasks-overlay">
      <div class="modal">
        <h2>My Tasks — ${projectName}</h2>
        <div class="task-list" id="my-proj-tasks">${renderItems(tasks)}</div>
        <div class="modal-actions" style="margin-top:16px">
          <button class="btn btn-outline" id="mpt-close">Close</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('mpt-close').addEventListener('click', () => modal.innerHTML = '');
  document.getElementById('my-tasks-overlay').addEventListener('click', e => { if(e.target===e.currentTarget) modal.innerHTML=''; });

  modal.addEventListener('change', async (e) => {
    if (e.target.matches('.task-status-select')) {
      const tid = e.target.dataset.tid;
      if (blockDemoWrite(employee, 'Task updates are disabled in the public demo.')) {
        return;
      }
      await supabase.from('tasks').update({ status: e.target.value }).eq('id', tid);
      const check = modal.querySelector(`.task-item-check[data-tid="${tid}"]`);
      if (check) check.className = `task-item-check ${e.target.value}`;
    }
  });
}

async function showManageTeamModal(projectId, projectName, employee) {
  const modal = document.getElementById('my-proj-modal');

  const [{ data: members }, { data: allTasks }] = await Promise.all([
    supabase.from('project_members').select('employee_id, employees(id, name, role)').eq('project_id', projectId),
    supabase.from('tasks').select('*, employees!tasks_assigned_to_fkey(name)').eq('project_id', projectId).order('created_at'),
  ]);

  const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6'];
  function gc(n) { let h=0;for(let i=0;i<(n||'').length;i++) h=(n||'').charCodeAt(i)+((h<<5)-h);return COLORS[Math.abs(h)%COLORS.length]; }

  // Include the Leader themselves in the Assign To options
  const allTeam = [];
  if (!members?.find(m => m.employee_id === employee.id)) {
    allTeam.push({ employee_id: employee.id, employees: { name: employee.name + ' (Lead)' } });
  }
  if (members) allTeam.push(...members);
  const memberOptions = allTeam.map(m => `<option value="${m.employee_id}">${m.employees?.name}</option>`).join('');

  function renderTaskList(list) {
    return list?.length > 0 ? list.map(t => `
      <div class="task-item" style="margin-bottom:8px" data-tid="${t.id}">
        <div class="task-item-check ${t.status}" data-tid="${t.id}"></div>
        <div class="task-item-body">
          <div class="task-item-title ${t.status==='done'?'done':''}">${t.title}</div>
          <div class="task-item-meta">
            ${t.employees?.name || 'Unassigned'} · ${t.deadline ? new Date(t.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'No deadline'}
          </div>
        </div>
        <select class="task-status-select" data-tid="${t.id}" style="margin-left:auto">
          <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="done" ${t.status==='done'?'selected':''}>Done</option>
        </select>
      </div>
    `).join('') : `<p style="font-size:13px;color:var(--c-gray-400);text-align:center;padding:12px">No tasks yet. Add one below.</p>`;
  }

  modal.innerHTML = `
    <div class="modal-overlay" id="team-modal-overlay">
      <div class="modal" style="max-width:640px">
        <h2>Manage Team — ${projectName}</h2>
        <div class="member-chips" style="margin-bottom:16px">
          ${members?.map(m => `
            <div class="member-chip">
              <div class="mini-avatar" style="background:${gc(m.employees?.name||'')}">
                ${(m.employees?.name||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
              </div>
              ${m.employees?.name || 'Unknown'}
            </div>`).join('') || 'No members'}
        </div>
        <div class="task-list" id="team-task-list">${renderTaskList(allTasks)}</div>
        <form id="team-add-task" style="margin-top:16px;border-top:1px solid var(--c-gray-200);padding-top:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group" style="margin-bottom:0"><label>Task Title</label><input type="text" name="title" placeholder="Add a task…" required /></div>
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
        <div class="modal-actions" style="margin-top:12px">
          <button class="btn btn-outline" id="team-close">Close</button>
        </div>
      </div>
    </div>
  `;

  const overlay = document.getElementById('team-modal-overlay');
  document.getElementById('team-close').addEventListener('click', () => modal.innerHTML = '');
  overlay.addEventListener('click', e => { if(e.target===e.currentTarget) modal.innerHTML=''; });

  overlay.addEventListener('change', async (e) => {
    if (e.target.matches('.task-status-select')) {
      const tid = e.target.dataset.tid;
      if (blockDemoWrite(employee, 'Task updates are disabled in the public demo.')) {
        return;
      }
      const { error } = await supabase.from('tasks').update({ status: e.target.value }).eq('id', tid);
      if (error) {
        alert('Failed to update task: ' + error.message);
        return;
      }
      const check = overlay.querySelector(`.task-item-check[data-tid="${tid}"]`);
      if (check) check.className = `task-item-check ${e.target.value}`;
      const title = overlay.querySelector(`.task-item[data-tid="${tid}"] .task-item-title`);
      if (title) title.className = `task-item-title ${e.target.value === 'done' ? 'done' : ''}`;
    }
  });

  document.getElementById('team-add-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (blockDemoWrite(employee, 'Task creation is disabled in the public demo.')) return;
    const d = Object.fromEntries(new FormData(e.target));
    d.project_id = projectId;
    if (!d.assigned_to) delete d.assigned_to;
    if (!d.deadline) delete d.deadline;
    await supabase.from('tasks').insert(d);
    e.target.reset();
    const { data: updated } = await supabase.from('tasks').select('*, employees!tasks_assigned_to_fkey(name)').eq('project_id', projectId).order('created_at');
    document.getElementById('team-task-list').innerHTML = renderTaskList(updated);
  });
}
