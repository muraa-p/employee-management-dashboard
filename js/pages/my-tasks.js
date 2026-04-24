import { supabase } from '../supabase.js';
import { blockDemoWrite } from '../demo-mode.js';

export async function renderMyTasks(container, employee) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 class="page-title" style="margin-bottom:0">My Tasks</h1>
      <div style="display:flex;gap:8px">
        <select class="filter-select" id="task-status-filter">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
    <div id="tasks-container">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
  `;

  await loadAllMyTasks(employee, '');

  document.getElementById('task-status-filter')?.addEventListener('change', (e) => {
    loadAllMyTasks(employee, e.target.value);
  });
}

async function loadAllMyTasks(employee, statusFilter) {
  let query = supabase.from('tasks')
    .select('*, projects(id, name), employees!tasks_assigned_to_fkey(name)')
    .eq('assigned_to', employee.id)
    .order('deadline', { ascending: true });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: tasks } = await query;

  const container = document.getElementById('tasks-container');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No tasks found</h3><p>You have no tasks assigned${statusFilter ? ` with status "${statusFilter}"` : ''}.</p></div>`;
    return;
  }

  // Group by project
  const grouped = {};
  tasks.forEach(t => {
    const pName = t.projects?.name || 'No Project';
    if (!grouped[pName]) grouped[pName] = [];
    grouped[pName].push(t);
  });

  container.innerHTML = Object.entries(grouped).map(([projectName, ptasks]) => {
    const done = ptasks.filter(t => t.status === 'done').length;
    const pct = Math.round((done / ptasks.length) * 100);

    return `
      <div class="card" style="margin-bottom:18px">
        <div class="card-header" style="margin-bottom:12px">
          <div>
            <h3 class="card-title">${projectName}</h3>
            <div style="font-size:12px;color:var(--c-gray-500)">${done}/${ptasks.length} completed</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="progress-bar" style="width:120px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span style="font-size:12px;font-weight:700">${pct}%</span>
          </div>
        </div>
        <div class="task-list">
          ${ptasks.map(t => `
            <div class="task-item" data-tid="${t.id}">
              <div class="task-item-check ${t.status}"></div>
              <div class="task-item-body">
                <div class="task-item-title ${t.status==='done'?'done':''}">${t.title}</div>
                <div class="task-item-meta">
                  ${t.deadline
                    ? `Due: ${new Date(t.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`
                    : 'No deadline'}
                </div>
              </div>
              <select class="task-status-select" data-tid="${t.id}">
                <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
                <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
                <option value="done" ${t.status==='done'?'selected':''}>Done</option>
              </select>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Status change handlers
  container.querySelectorAll('.task-status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const tid = e.target.dataset.tid;
      const newStatus = e.target.value;
      if (blockDemoWrite(employee, 'Task updates are disabled in the public demo.')) {
        e.target.value = e.target.dataset.oldStatus || 'pending';
        return;
      }
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', tid);

      if (error) {
        alert('Failed to update task: ' + error.message);
        e.target.value = e.target.dataset.oldStatus || 'pending';
        return;
      }
      e.target.dataset.oldStatus = newStatus;

      // Update the check indicator
      const item = container.querySelector(`.task-item[data-tid="${tid}"]`);
      if (item) {
        const check = item.querySelector('.task-item-check');
        const title = item.querySelector('.task-item-title');
        if (check) check.className = `task-item-check ${newStatus}`;
        if (title) {
          if (newStatus === 'done') title.classList.add('done');
          else title.classList.remove('done');
        }
      }

      // Update progress bar for this project group
      const card = e.target.closest('.card');
      if (card) {
        const allSelects = [...card.querySelectorAll('.task-status-select')];
        const doneCount = allSelects.filter(s => s.value === 'done').length;
        const total = allSelects.length;
        const pct = Math.round((doneCount / total) * 100);
        const fill = card.querySelector('.progress-fill');
        if (fill) fill.style.width = `${pct}%`;
        const subtitle = card.querySelector('.card-header div div');
        if (subtitle) subtitle.textContent = `${doneCount}/${total} completed`;
        const pctLabel = card.querySelector('.card-header > div:last-child span');
        if (pctLabel) pctLabel.textContent = `${pct}%`;
      }
    });
  });
}
