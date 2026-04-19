import { supabase } from '../supabase.js';

export async function renderMyAttendance(container, employee) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  container.innerHTML = `
    <h1 class="page-title">My Attendance</h1>
    <div class="my-attendance-grid" id="att-stats">
      <div class="loading-spinner" style="grid-column:1/-1"><div class="spinner"></div></div>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <h3 class="card-title">Attendance History</h3>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="month" id="month-picker" class="filter-select"
            value="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}" />
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>Status</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody id="att-tbody">
          <tr><td colspan="6"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  await loadAttendance(employee, monthStart, today);

  document.getElementById('month-picker')?.addEventListener('change', async (e) => {
    const [year, month] = e.target.value.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    await loadAttendance(employee, start, end);
  });
}

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr-12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function calcHours(ci, co) {
  if (!ci || !co) return '—';
  const [h1,m1] = ci.split(':').map(Number);
  const [h2,m2] = co.split(':').map(Number);
  const diff = (h2*60+m2) - (h1*60+m1);
  return `${Math.floor(diff/60)}h ${diff%60}m`;
}

async function loadAttendance(employee, from, to) {
  const { data: records } = await supabase.from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });

  const stats = document.getElementById('att-stats');
  const tbody = document.getElementById('att-tbody');
  if (!stats || !tbody) return;

  const present = records?.filter(r => r.status === 'present').length || 0;
  const absent  = records?.filter(r => r.status === 'absent').length || 0;
  const onLeave = records?.filter(r => r.status === 'on-leave').length || 0;

  // Average hours
  const workingHours = records?.filter(r => r.check_in && r.check_out).map(r => {
    const [h1,m1] = r.check_in.split(':').map(Number);
    const [h2,m2] = r.check_out.split(':').map(Number);
    return (h2*60+m2) - (h1*60+m1);
  }) || [];
  const avgMin = workingHours.length > 0 ? Math.round(workingHours.reduce((a,b)=>a+b,0) / workingHours.length) : 0;
  const avgStr = avgMin > 0 ? `${Math.floor(avgMin/60)}h ${avgMin%60}m` : '—';

  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon green">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
      </div></div>
      <span class="stat-card-label">Present Days</span>
      <span class="stat-card-value">${present}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon red">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div></div>
      <span class="stat-card-label">Absent Days</span>
      <span class="stat-card-value">${absent}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon orange">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div></div>
      <span class="stat-card-label">On Leave</span>
      <span class="stat-card-value">${onLeave}</span>
    </div>
    <div class="stat-card">
      <div class="stat-card-header"><div class="stat-card-icon blue">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div></div>
      <span class="stat-card-label">Avg Hours/Day</span>
      <span class="stat-card-value" style="font-size:18px">${avgStr}</span>
    </div>
  `;

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--c-gray-400);padding:32px">No attendance records for this period.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const d = new Date(r.date);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const sConfig = {
      present: { cls: 'available', label: 'Present' },
      absent:  { cls: 'absent',    label: 'Absent'  },
      'on-leave': { cls: 'on-leave', label: 'On Leave' },
      'half-day': { cls: 'available', label: 'Half Day' },
    };
    const s = sConfig[r.status] || sConfig.present;
    return `
      <tr>
        <td>${dateStr}</td>
        <td style="color:var(--c-gray-500)">${day}</td>
        <td><span class="status-badge ${s.cls}">${s.label}</span></td>
        <td>${formatTime(r.check_in)}</td>
        <td>${formatTime(r.check_out)}</td>
        <td style="font-weight:600">${calcHours(r.check_in, r.check_out)}</td>
      </tr>
    `;
  }).join('');
}
