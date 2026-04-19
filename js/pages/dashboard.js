import { supabase } from '../supabase.js';
import { navigate } from '../router.js';
import Chart from 'chart.js/auto';

let barChart = null;

export async function renderDashboard(container, employee) {
  container.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <div class="stats-row" id="dash-stats">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card" style="grid-column:1/3">
        <div class="card-header">
          <h3 class="card-title">Weekly Working Hours</h3>
          <div class="week-tabs" id="week-tabs">
            <button class="week-tab active" data-week="0">This Week</button>
            <button class="week-tab" data-week="-1">Last Week</button>
          </div>
        </div>
        <div class="chart-container" style="position:relative;height:220px">
          <canvas id="weeklyChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Team Members</h3>
          <span class="card-action" id="view-all-employees">View All</span>
        </div>
        <div id="team-members-list">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Projects</h3>
          <span class="card-action" id="view-all-projects">View All</span>
        </div>
        <div id="recent-projects-list">
          <div class="loading-spinner"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('view-all-employees')?.addEventListener('click', () => navigate('employees'));
  document.getElementById('view-all-projects')?.addEventListener('click', () => navigate('projects'));

  await Promise.all([loadDashboardStats(), loadTeamMembers(), loadRecentProjects(), loadChart(0)]);

  document.getElementById('week-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.week-tab');
    if (!btn) return;
    document.querySelectorAll('.week-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadChart(parseInt(btn.dataset.week));
  });
}

async function loadDashboardStats() {
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalEmp },
    { count: activeProjects },
    { count: presentToday },
    { count: pendingLeaves },
  ] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
    supabase.from('leaves').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  document.getElementById('dash-stats').innerHTML = `
    ${statCard('Total Employees', totalEmp, 'blue', 'path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"', '+5%', 'up')}
    ${statCard('Active Projects', activeProjects, 'yellow', 'path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"', 'This month', '')}
    ${statCard('Present Today', presentToday, 'green', 'circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"', '', '')}
    ${statCard('Pending Leaves', pendingLeaves, 'orange', 'circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"', '', '')}
  `;
}

function statCard(label, value, color, icon, trend, dir) {
  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon ${color}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><${icon}/></svg>
        </div>
        ${trend ? `<span class="stat-trend ${dir}">${trend}</span>` : ''}
      </div>
      <span class="stat-card-label">${label}</span>
      <span class="stat-card-value">${value ?? 0}</span>
    </div>`;
}

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
function getColor(name) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function initials(name) { return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2); }

async function loadTeamMembers() {
  const { data: emps } = await supabase.from('employees')
    .select('id, name, role, status')
    .eq('status', 'active')
    .order('name')
    .limit(5);

  const el = document.getElementById('team-members-list');
  if (!el || !emps) return;

  el.innerHTML = emps.map(e => `
    <div class="member-row">
      <div class="employee-cell" style="gap:8px">
        <div class="member-avatar" style="background:${getColor(e.name)};width:34px;height:34px;font-size:13px">${initials(e.name)}</div>
        <div>
          <div style="font-size:13px;font-weight:600">${e.name}</div>
          <div style="font-size:12px;color:var(--c-gray-500)">${e.role}</div>
        </div>
      </div>
      <span class="status-dot ${e.status}">${e.status}</span>
    </div>
  `).join('');
}

async function loadRecentProjects() {
  const { data: projects } = await supabase.from('projects')
    .select('id, name, status, deadline, total_tasks, completed_tasks')
    .order('created_at', { ascending: false })
    .limit(5);

  const el = document.getElementById('recent-projects-list');
  if (!el || !projects) return;

  el.innerHTML = projects.map(p => {
    const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
    const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    return `
      <div class="member-row" style="flex-direction:column;align-items:flex-start;gap:6px">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span style="font-size:13px;font-weight:600">${p.name}</span>
          <span class="status-badge ${p.status === 'active' ? 'available' : p.status === 'completed' ? 'available' : 'on-leave'}">${p.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;width:100%;font-size:12px;color:var(--c-gray-500)">
          <span>${p.completed_tasks}/${p.total_tasks} tasks</span>
          <span>${deadline}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

async function loadChart(weekOffset = 0) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1) + weekOffset * 7);

  const dates = days.map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const { data: att } = await supabase.from('attendance')
    .select('date, check_in, check_out')
    .in('date', dates);

  const hours = dates.map(date => {
    const records = att?.filter(a => a.date === date) || [];
    const total = records.reduce((sum, a) => {
      if (!a.check_in || !a.check_out) return sum;
      const [h1,m1] = a.check_in.split(':').map(Number);
      const [h2,m2] = a.check_out.split(':').map(Number);
      return sum + ((h2*60+m2) - (h1*60+m1)) / 60;
    }, 0);
    return +total.toFixed(1);
  });

  const ctx = document.getElementById('weeklyChart');
  if (!ctx) return;
  if (barChart) { barChart.destroy(); barChart = null; }

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        data: hours,
        backgroundColor: hours.map((_, i) => i === (dayOfWeek - 1) ? '#090909' : '#FFED6E'),
        borderRadius: 8,
        barThickness: 28,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}h avg` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Urbanist', size: 12 }, color: '#6B7280' } },
        y: { grid: { color: '#F3F4F6' }, border: { display: false }, ticks: { font: { family: 'Urbanist', size: 11 }, color: '#9CA3AF', stepSize: 2 } }
      }
    }
  });
}
