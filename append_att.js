const fs = require('fs');
const path = require('path');

const append = `
async function setupMarkAttendance() {
  document.getElementById('mark-att-btn')?.addEventListener('click', async () => {
    const { data: emps } = await supabase.from('employees').select('id, name').eq('status','active').order('name');
    const modal = document.getElementById('att-modal');
    if (!modal) return;
    const today = new Date().toISOString().split('T')[0];
    const empOptions = emps?.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('') || '';
    modal.innerHTML = '<div class="modal-overlay" id="att-modal-overlay"><div class="modal"><h2>Mark Attendance</h2><form id="att-form"><div class="form-group"><label>Employee</label><select name="employee_id" required><option value="">Select Employee</option>' + empOptions + '</select></div><div class="form-group"><label>Date</label><input type="date" name="date" value="' + today + '" required /></div><div class="form-group"><label>Status</label><select name="status"><option value="present">Present</option><option value="absent">Absent</option><option value="on-leave">On Leave</option><option value="half-day">Half Day</option></select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-group" style="margin-bottom:0"><label>Check In</label><input type="time" name="check_in" /></div><div class="form-group" style="margin-bottom:0"><label>Check Out</label><input type="time" name="check_out" /></div></div><div class="modal-actions" style="margin-top:16px"><button type="button" class="btn btn-outline" id="att-cancel">Cancel</button><button type="submit" class="btn btn-dark">Save Record</button></div></form></div></div>';
    document.getElementById('att-cancel').addEventListener('click', () => { modal.innerHTML = ''; });
    document.getElementById('att-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) modal.innerHTML = ''; });
    document.getElementById('att-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (!data.check_in) delete data.check_in;
      if (!data.check_out) delete data.check_out;
      await supabase.from('attendance').upsert(data, { onConflict: 'employee_id,date' });
      modal.innerHTML = '';
      loadAttendanceData();
    });
  });
}
`;

const filePath = path.join(__dirname, 'js', 'pages', 'attendance.js');
fs.appendFileSync(filePath, append, 'utf8');
console.log('Done — setupMarkAttendance appended.');
