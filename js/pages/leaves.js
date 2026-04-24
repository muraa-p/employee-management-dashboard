import { supabase } from '../supabase.js';
import { blockDemoWrite, isReadOnlyDemo } from '../demo-mode.js';

export async function renderLeaves(container, employee) {
  const isHR = employee?.role_type === 'hr';

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 class="page-title" style="margin-bottom:0">${isHR ? 'Leave Management' : 'My Leaves'}</h1>
      <button class="btn btn-dark" id="request-leave-btn" ${isReadOnlyDemo(employee) ? 'disabled title="Disabled in public demo"' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${isHR ? 'Add Leave' : 'Request Leave'}
      </button>
    </div>
    <div class="stats-row" id="leave-stats">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div class="leaves-grid" id="leaves-grid">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div id="leave-modal"></div>
  `;

  loadLeaves(isHR, employee);
  setupRequestLeave(isHR, employee);
}

async function loadLeaves(isHR, employee) {
  let query = supabase.from('leaves').select('*, employees(name, role)').order('created_at', { ascending: false });

  if (!isHR) {
    // Employee only sees their own leaves
    query = query.eq('employee_id', employee.id);
  }

  const { data: leaves } = await query;
  if (!leaves) return;

  const approved = leaves.filter(l => l.status === 'approved').length;
  const pending  = leaves.filter(l => l.status === 'pending').length;
  const rejected = leaves.filter(l => l.status === 'rejected').length;

  const statsEl = document.getElementById('leave-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header"><div class="stat-card-icon green">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
        </div></div>
        <span class="stat-card-label">Approved</span>
        <span class="stat-card-value">${approved}</span>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><div class="stat-card-icon orange">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div></div>
        <span class="stat-card-label">Pending</span>
        <span class="stat-card-value">${pending}</span>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><div class="stat-card-icon red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div></div>
        <span class="stat-card-label">Rejected</span>
        <span class="stat-card-value">${rejected}</span>
      </div>
    `;
  }

  const grid = document.getElementById('leaves-grid');
  if (!grid) return;

  if (leaves.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No leave records found</h3><p>${isHR ? 'All leave requests will appear here.' : 'Submit a leave request to get started.'}</p></div>`;
    return;
  }

  grid.innerHTML = leaves.map(l => {
    const startDate = new Date(l.start_date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    const endDate   = new Date(l.end_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const days = Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / (1000*60*60*24)) + 1;
    const statusClass = l.status === 'approved' ? 'available' : l.status === 'pending' ? 'on-leave' : 'absent';

    return `
      <div class="leave-card ${l.status}">
        <div class="leave-card-header">
          <h4>${l.employees?.name || 'Unknown'}</h4>
          <span class="leave-type-badge ${l.type}">${l.type}</span>
        </div>
        <div style="font-size:12px;color:var(--c-gray-500);margin-bottom:4px">${l.employees?.role || ''}</div>
        <div class="leave-dates">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${startDate} — ${endDate} (${days} day${days>1?'s':''})
        </div>
        <span class="status-badge ${statusClass}">${l.status.charAt(0).toUpperCase() + l.status.slice(1)}</span>
        ${isHR && l.status === 'pending' ? `
          <div class="leave-actions">
            <button class="btn-approve" data-lid="${l.id}">✓ Approve</button>
            <button class="btn-reject"  data-lid="${l.id}">✕ Reject</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // HR approve/reject
  if (isHR) {
    grid.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (blockDemoWrite(employee, 'Leave approval is disabled in the public demo.')) return;
        await supabase.from('leaves').update({ status: 'approved' }).eq('id', btn.dataset.lid);
        loadLeaves(isHR, employee);
      });
    });
    grid.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (blockDemoWrite(employee, 'Leave rejection is disabled in the public demo.')) return;
        await supabase.from('leaves').update({ status: 'rejected' }).eq('id', btn.dataset.lid);
        loadLeaves(isHR, employee);
      });
    });
  }
}

function setupRequestLeave(isHR, employee) {
  document.getElementById('request-leave-btn')?.addEventListener('click', async () => {
    if (blockDemoWrite(employee, 'Leave requests are disabled in the public demo.')) return;
    let employeeSelect = '';
    if (isHR) {
      const { data: emps } = await supabase.from('employees').select('id, name').eq('status','active').order('name');
      employeeSelect = `
        <div class="form-group">
          <label>Employee</label>
          <select name="employee_id" required>
            <option value="">Select Employee</option>
            ${emps?.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
          </select>
        </div>
      `;
    }

    const modal = document.getElementById('leave-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-overlay" id="leave-modal-overlay">
        <div class="modal">
          <h2>${isHR ? 'Add Leave Record' : 'Request Leave'}</h2>
          <form id="leave-form">
            ${employeeSelect}
            <div class="form-group">
              <label>Leave Type</label>
              <select name="type" required>
                <option value="paid">Paid Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
              </select>
            </div>
            <div class="form-group"><label>Start Date</label><input type="date" name="start_date" required /></div>
            <div class="form-group"><label>End Date</label><input type="date" name="end_date" required /></div>
            ${isHR ? `
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>` : ''}
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="leave-cancel">Cancel</button>
              <button type="submit" class="btn btn-dark">Submit</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('leave-cancel').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('leave-modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) modal.innerHTML = ''; });

    document.getElementById('leave-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (blockDemoWrite(employee, 'Leave requests are disabled in the public demo.')) return;
      const data = Object.fromEntries(new FormData(e.target));
      if (!isHR) { data.employee_id = employee.id; data.status = 'pending'; }
      if (!data.status) data.status = 'pending';
      await supabase.from('leaves').insert(data);
      modal.innerHTML = '';
      loadLeaves(isHR, employee);
    });
  });
}
