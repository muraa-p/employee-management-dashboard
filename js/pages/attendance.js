import { supabase } from '../supabase.js';
import Chart from 'chart.js/auto';
import { blockDemoWrite, isReadOnlyDemo } from '../demo-mode.js';

let donutChart = null;

export async function renderAttendance(container, employee) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 class="page-title" style="margin-bottom:0">Attendance</h1>
      <button class="btn btn-dark" id="mark-att-btn" ${isReadOnlyDemo(employee) ? 'disabled title="Disabled in public demo"' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Mark Attendance
      </button>
    </div>
    <div class="attendance-grid">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Attendance Overview</h3></div>
        <div class="donut-chart-container">
          <canvas id="attendanceDonut" width="260" height="260"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Today's Summary</h3></div>
        <div class="attendance-stats" id="attendance-summary">
          <div class="loading-spinner" style="grid-column:1/-1"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <h3 class="card-title">Today's Attendance</h3>
        <div class="table-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="att-search" placeholder="Search employee" />
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Working Hours</th>
          </tr>
        </thead>
        <tbody id="att-table-body">
          <tr><td colspan="5"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="att-modal"></div>
  `;

  loadAttendanceData();
  setupMarkAttendance(employee);
}

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#6366F1'];
function getColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }

function formatTime(time) {
  if (!time) return '—';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

async function loadAttendanceData() {
  const today = new Date().toISOString().split('T')[0];

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*, employees(name, role)')
    .eq('date', today)
    .order('check_in', { ascending: true });

  if (!attendance) return;

  const present  = attendance.filter(a => a.status === 'present').length;
  const absent   = attendance.filter(a => a.status === 'absent').length;
  const onLeave  = attendance.filter(a => a.status === 'on-leave').length;
  const halfDay  = attendance.filter(a => a.status === 'half-day').length;
  const total    = attendance.length;

  const summaryEl = document.getElementById('attendance-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="attendance-stat"><div class="value" style="color:var(--c-green)">${present}</div><div class="label">Present</div></div>
      <div class="attendance-stat"><div class="value" style="color:var(--c-red)">${absent}</div><div class="label">Absent</div></div>
      <div class="attendance-stat"><div class="value" style="color:var(--c-orange)">${onLeave}</div><div class="label">On Leave</div></div>
      <div class="attendance-stat"><div class="value" style="color:var(--c-blue)">${halfDay}</div><div class="label">Half Day</div></div>
      <div class="attendance-stat" style="grid-column:1/-1"><div class="value">~8.5h</div><div class="label">Average Working Hours</div></div>
    `;
  }

  const ctx = document.getElementById('attendanceDonut');
  if (ctx) {
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent', 'On Leave', 'Half Day'],
        datasets: [{ data: [present, absent, onLeave, halfDay], backgroundColor: ['#22C55E','#EF4444','#F59E0B','#3B82F6'], borderWidth: 0, spacing: 4, borderRadius: 4 }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { family: 'Urbanist', size: 12, weight: '500' }, usePointStyle: true, pointStyleWidth: 10 } },
          tooltip: {
            backgroundColor: '#090909',
            titleFont: { family: 'Urbanist', weight: '600' },
            bodyFont: { family: 'Urbanist' },
            padding: 12, cornerRadius: 8,
            callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${total > 0 ? Math.round((c.raw / total) * 100) : 0}%)` }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw(chart) {
          const { width, height, ctx: c } = chart;
          c.save();
          c.font = '700 28px Urbanist'; c.fillStyle = '#090909';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;
          c.fillText(`${pct}%`, width / 2, height / 2 - 10);
          c.font = '400 12px Urbanist'; c.fillStyle = '#9CA3AF';
          c.fillText('Present Rate', width / 2, height / 2 + 14);
          c.restore();
        }
      }]
    });
  }

  const tbody = document.getElementById('att-table-body');
  if (tbody) {
    const statusConfig = {
      present:   { class: 'available', label: 'Present'  },
      absent:    { class: 'absent',    label: 'Absent'   },
      'on-leave':{ class: 'on-leave',  label: 'On Leave' },
      'half-day':{ class: 'available', label: 'Half Day' },
    };

    tbody.innerHTML = attendance.map(a => {
      const s = statusConfig[a.status] || statusConfig.present;
      return `
        <tr>
          <td>
            <div class="employee-cell">
              <div class="member-avatar" style="background:${getColor(a.employees?.name || '')}">
                ${initials(a.employees?.name || '?')}
              </div>
              <div>
                <div class="name">${a.employees?.name || 'Unknown'}</div>
                <div class="role">${a.employees?.role || ''}</div>
              </div>
            </div>
          </td>
          <td><span class="status-badge ${s.class}">${s.label}</span></td>
          <td>${formatTime(a.check_in)}</td>
          <td>${formatTime(a.check_out)}</td>
          <td style="font-weight:600">${calcHours(a.check_in, a.check_out)}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('att-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      tbody.querySelectorAll('tr').forEach(tr => {
        const name = tr.querySelector('.name')?.textContent.toLowerCase() || '';
        tr.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }
}

async function setupMarkAttendance(employee) {
  document.getElementById('mark-att-btn')?.addEventListener('click', async () => {
    if (blockDemoWrite(employee, 'Attendance updates are disabled in the public demo.')) return;
    const { data: emps } = await supabase.from('employees').select('id, name').eq('status', 'active').order('name');
    const modal = document.getElementById('att-modal');
    if (!modal) return;

    const today = new Date().toISOString().split('T')[0];
    const empOptions = (emps || []).map(e => `<option value="${e.id}">${e.name}</option>`).join('');

    modal.innerHTML = `
      <div class="modal-overlay" id="att-modal-overlay">
        <div class="modal">
          <h2>Mark Attendance</h2>
          <form id="att-form">
            <div class="form-group">
              <label>Employee</label>
              <select name="employee_id" required>
                <option value="">Select Employee</option>
                ${empOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" name="date" value="${today}" required />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="on-leave">On Leave</option>
                <option value="half-day">Half Day</option>
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="form-group" style="margin-bottom:0">
                <label>Check In</label><input type="time" name="check_in" />
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label>Check Out</label><input type="time" name="check_out" />
              </div>
            </div>
            <div class="modal-actions" style="margin-top:16px">
              <button type="button" class="btn btn-outline" id="att-cancel">Cancel</button>
              <button type="submit" class="btn btn-dark">Save Record</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('att-cancel').addEventListener('click', () => { modal.innerHTML = ''; });
    document.getElementById('att-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) modal.innerHTML = '';
    });

    document.getElementById('att-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (blockDemoWrite(employee, 'Attendance updates are disabled in the public demo.')) return;
      const data = Object.fromEntries(new FormData(e.target));
      if (!data.check_in) delete data.check_in;
      if (!data.check_out) delete data.check_out;
      await supabase.from('attendance').upsert(data, { onConflict: 'employee_id,date' });
      modal.innerHTML = '';
      loadAttendanceData();
    });
  });
}
