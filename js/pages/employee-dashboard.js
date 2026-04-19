import { supabase } from '../supabase.js';
import { navigate } from '../router.js';
import Chart from 'chart.js/auto';

let barChart = null;

export async function renderEmployeeDashboard(container, employee) {
  container.innerHTML = `
    <h1 class="page-title">My Dashboard</h1>
    <div class="stats-row" id="my-stats">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">My Projects</h3>
          <span class="card-action" id="view-all-my-projects">View All</span>
        </div>
        <div id="my-projects-preview">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Upcoming Tasks</h3>
          <span class="card-action" id="view-all-my-tasks">View All</span>
        </div>
        <div id="my-tasks-preview" class="task-list">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="card" style="grid-column:1/-1">
        <div class="card-header">
          <h3 class="card-title">My Working Hours</h3>
        </div>
        <div class="chart-container" style="position:relative;height:200px">
          <canvas id="myWeeklyChart"></canvas>
        </div>
      </div>
    </div>
  `;

  document.getElementById('view-all-my-projects')?.addEventListener('click', () => navigate('my-projects'));
  document.getElementById('view-all-my-tasks')?.addEventListener('click', () => navigate('my-tasks'));

  await Promise.all([
    loadMyStats(employee),
    loadMyProjectsPreview(employee),
    loadMyTasksPreview(employee),
    loadMyChart(employee),
  ]);
}

async function loadMyStats(employee) {
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: projectMemberships },
    { data: myTasks },
    { data: myLeaves },
    { data: todayAtt },
  ] = await Promise.all([
    supabase.from('project_members').select('project_id').eq('employee_id', employee.id),
    supabase.from('tasks').select('status').eq('assigned_to', employee.id),
    supabase.from('leaves').select('status').eq('employee_id', employee.id).eq('status', 'pending'),
    supabase.from('attendance').select('status').eq('employee_id', employee.id).eq('date', today).single(),
  ]);

  const activeProjects = projectMemberships?.length || 0;
  const doneTasks = myTasks?.filter(t => t.status === 'done').length || 0;
  const pendingLeaves = myLeaves?.length || 0;
  const todayStatus = todayAtt?.status || 'not marked';
  const todayColor = todayStatus === 'present' ? 'green' : todayStatus === 'absent' ? 'red' : 'orange';

  document.getElementById('my-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon blue">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </div></div>
      <span class="stat-card-label">My Projects</span>
      <span class="stat-card-value">${activeProjects}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon green">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div></div>
      <span class="stat-card-label">Tasks Done</span>
      <span class="stat-card-value">${doneTasks}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon orange">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div></div>
      <span class="stat-card-label">Pending Leaves</span>
      <span class="stat-card-value">${pendingLeaves}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon ${todayColor}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div></div>
      <span class="stat-card-label">Today's Status</span>
      <span class="stat-card-value" style="font-size:16px;text-transform:capitalize">${todayStatus}</span>
    </div>
  `;
}

async function loadMyProjectsPreview(employee) {
  const { data: memberships } = await supabase
    .from('project_members').select('project_id').eq('employee_id', employee.id);
  const { data: led } = await supabase
    .from('projects').select('id').eq('lead_id', employee.id);

  const ids = [...new Set([...(memberships?.map(m => m.project_id) || []), ...(led?.map(p => p.id) || [])])];

  const el = document.getElementById('my-projects-preview');
  if (!el) return;

  if (ids.length === 0) {
    el.innerHTML = `<p style="color:var(--c-gray-400);font-size:13px">No projects assigned yet.</p>`;
    return;
  }

  const { data: projects } = await supabase.from('projects')
    .select('id, name, status, total_tasks, completed_tasks')
    .in('id', ids).limit(4);

  el.innerHTML = (projects || []).map(p => {
    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
    return `
      <div class="member-row" style="flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span style="font-size:13px;font-weight:600">${p.name}</span>
          <span class="status-badge ${p.status==='active'?'available':'on-leave'}">${p.status}</span>
        </div>
        <div style="font-size:12px;color:var(--c-gray-500)">${p.completed_tasks}/${p.total_tasks} tasks · ${pct}%</div>
        <div class="progress-bar" style="width:100%"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

async function loadMyTasksPreview(employee) {
  const { data: tasks } = await supabase.from('tasks')
    .select('id, title, status, deadline, projects(name)')
    .eq('assigned_to', employee.id)
    .neq('status', 'done')
    .order('deadline', { ascending: true })
    .limit(5);

  const el = document.getElementById('my-tasks-preview');
  if (!el) return;

  if (!tasks || tasks.length === 0) {
    el.innerHTML = `<p style="color:var(--c-gray-400);font-size:13px">No pending tasks. Nice!</p>`;
    return;
  }

  el.innerHTML = tasks.map(t => `
    <div class="task-item">
      <div class="task-item-check ${t.status}"></div>
      <div class="task-item-body">
        <div class="task-item-title">${t.title}</div>
        <div class="task-item-meta">${t.projects?.name || ''} · ${t.deadline ? new Date(t.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'No deadline'}</div>
      </div>
    </div>
  `).join('');
}

async function loadMyChart(employee) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow - 1));

  const dates = days.map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const { data: att } = await supabase.from('attendance')
    .select('date, check_in, check_out')
    .eq('employee_id', employee.id)
    .in('date', dates);

  const hours = dates.map(date => {
    const r = att?.find(a => a.date === date);
    if (!r?.check_in || !r?.check_out) return 0;
    const [h1,m1] = r.check_in.split(':').map(Number);
    const [h2,m2] = r.check_out.split(':').map(Number);
    return +( ((h2*60+m2) - (h1*60+m1)) / 60 ).toFixed(1);
  });

  const ctx = document.getElementById('myWeeklyChart');
  if (!ctx) return;
  if (barChart) { barChart.destroy(); barChart = null; }

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{ data: hours, backgroundColor: hours.map((_,i) => i===(dow-1)?'#090909':'#FFED6E'), borderRadius: 8, barThickness: 28 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Urbanist', size: 12 }, color: '#6B7280' } },
        y: { grid: { color: '#F3F4F6' }, border: { display: false }, ticks: { font: { family: 'Urbanist', size: 11 }, color: '#9CA3AF', stepSize: 2 } }
      }
    }
  });
}
