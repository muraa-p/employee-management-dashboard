import { supabase } from '../supabase.js';
import { blockDemoWrite, isReadOnlyDemo } from '../demo-mode.js';

export async function renderEmployees(container, employee) {
  container.innerHTML = `
    <h1 class="page-title">Employees</h1>
    <div class="stats-row" id="emp-stats">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <div class="table-filters">
          <select class="filter-select" id="dept-filter">
            <option value="">Department</option>
          </select>
          <select class="filter-select" id="status-filter">
            <option value="">Select Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select class="filter-select" id="sort-filter">
            <option value="name">Sort By: Name</option>
            <option value="joining_date">Sort By: Joining Date</option>
            <option value="emp_id">Sort By: Emp ID</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="table-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="emp-search" placeholder="Search" />
          </div>
          <button class="btn btn-dark" id="add-employee-btn" ${isReadOnlyDemo(employee) ? 'disabled title="Disabled in public demo"' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
          </button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Emp ID</th>
            <th>Contact</th>
            <th>Joining Date</th>
            <th>Department</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="emp-table-body">
          <tr><td colspan="7"><div class="loading-spinner"><div class="spinner"></div></div></td></tr>
        </tbody>
      </table>
    </div>
    <div id="employee-modal"></div>
  `;

  loadEmployeeData(employee);
  setupFilters(employee);
  setupAddEmployee(employee);
}

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#6366F1'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

async function loadEmployeeData(employee, filters = {}) {
  let query = supabase.from('employees').select('*, departments(name)');

  if (filters.department) query = query.eq('department_id', filters.department);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters.sort) query = query.order(filters.sort, { ascending: true });
  else query = query.order('name', { ascending: true });

  const { data: employees } = await query;
  if (!employees) return;

  const total = employees.length;
  const active = employees.filter(e => e.status === 'active').length;
  const inactive = employees.filter(e => e.status === 'inactive').length;

  const statsEl = document.getElementById('emp-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <div class="stat-card-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <span class="stat-trend up">+20%</span>
        </div>
        <span class="stat-card-label">Total</span>
        <span class="stat-card-value">${total}</span>
        <span class="stat-card-footer">Last week</span>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div class="stat-card-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
          </div>
          <span class="stat-trend up">+20%</span>
        </div>
        <span class="stat-card-label">Active</span>
        <span class="stat-card-value">${active}</span>
        <span class="stat-card-footer">Last week</span>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <div class="stat-card-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <span class="stat-trend down">-10%</span>
        </div>
        <span class="stat-card-label">Inactive</span>
        <span class="stat-card-value">${inactive}</span>
        <span class="stat-card-footer">Last week</span>
      </div>
    `;
  }

  const tbody = document.getElementById('emp-table-body');
  if (!tbody) return;

  tbody.innerHTML = employees.map(emp => `
    <tr data-id="${emp.id}">
      <td>
        <div class="employee-cell">
          <div class="member-avatar" style="background:${getAvatarColor(emp.name)}">
            ${getInitials(emp.name)}
          </div>
          <div>
            <div class="name">${emp.name}</div>
            <div class="role">${emp.role}</div>
          </div>
        </div>
      </td>
      <td>${emp.emp_id}</td>
      <td>
        <div style="font-size:12px">${emp.phone || '—'}</div>
        <div style="font-size:11px;color:var(--c-gray-500)">${emp.email}</div>
      </td>
      <td>${new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td><span class="dept-badge">${emp.departments?.name || '—'}</span></td>
      <td><span class="status-dot ${emp.status}">${emp.status}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn-icon edit-emp" data-id="${emp.id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button class="btn-icon delete-emp" data-id="${emp.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Attach delete handlers
  tbody.querySelectorAll('.delete-emp').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this employee?')) {
        if (blockDemoWrite(employee, 'Employee deletion is disabled in the public demo.')) return;
        await supabase.from('employees').delete().eq('id', btn.dataset.id);
        loadEmployeeData(employee, getCurrentFilters());
      }
    });
  });

  // Attach edit handlers
  tbody.querySelectorAll('.edit-emp').forEach(btn => {
    btn.addEventListener('click', () => {
      showEmployeeModal(btn.dataset.id, employee);
    });
  });
}

function getCurrentFilters() {
  return {
    department: document.getElementById('dept-filter')?.value || '',
    status: document.getElementById('status-filter')?.value || '',
    search: document.getElementById('emp-search')?.value || '',
    sort: document.getElementById('sort-filter')?.value || 'name',
  };
}

async function setupFilters(employee) {
  // Load departments into filter
  const { data: depts } = await supabase.from('departments').select('id, name').order('name');
  const deptFilter = document.getElementById('dept-filter');
  if (deptFilter && depts) {
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      deptFilter.appendChild(opt);
    });
  }

  // Add event listeners
  ['dept-filter', 'status-filter', 'sort-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => loadEmployeeData(employee, getCurrentFilters()));
  });

  let searchTimeout;
  document.getElementById('emp-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadEmployeeData(employee, getCurrentFilters()), 300);
  });
}

function setupAddEmployee(employee) {
  document.getElementById('add-employee-btn')?.addEventListener('click', () => {
    if (blockDemoWrite(employee, 'Adding employees is disabled in the public demo.')) return;
    showEmployeeModal(null, employee);
  });
}

async function showEmployeeModal(employeeId = null, currentEmployee = null) {
  const { data: depts } = await supabase.from('departments').select('id, name').order('name');
  let employee = null;

  if (employeeId) {
    const { data } = await supabase.from('employees').select('*').eq('id', employeeId).single();
    employee = data;
  }

  const modal = document.getElementById('employee-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <h2>${employee ? 'Edit Employee' : 'Add Employee'}</h2>
        <form id="employee-form">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value="${employee?.name || ''}" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" value="${employee?.email || ''}" required />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" name="phone" value="${employee?.phone || ''}" />
          </div>
          <div class="form-group">
            <label>Role</label>
            <input type="text" name="role" value="${employee?.role || ''}" required />
          </div>
          <div class="form-group">
            <label>Department</label>
            <select name="department_id" required>
              <option value="">Select Department</option>
              ${depts?.map(d => `<option value="${d.id}" ${employee?.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Joining Date</label>
            <input type="date" name="joining_date" value="${employee?.joining_date || new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active" ${employee?.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${employee?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-dark">${employee ? 'Update' : 'Add'} Employee</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-cancel').addEventListener('click', () => modal.innerHTML = '');
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) modal.innerHTML = '';
  });

  document.getElementById('employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (blockDemoWrite(currentEmployee, 'Employee changes are disabled in the public demo.')) return;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    if (employee) {
      await supabase.from('employees').update(data).eq('id', employeeId);
    } else {
      // Generate emp_id
      const { data: last } = await supabase.from('employees').select('emp_id').order('emp_id', { ascending: false }).limit(1);
      const lastNum = last?.[0] ? parseInt(last[0].emp_id.replace('Emp-', '')) : 0;
      data.emp_id = `Emp-${String(lastNum + 1).padStart(3, '0')}`;
      
      const prevBtnText = e.target.querySelector('button[type="submit"]').textContent;
      e.target.querySelector('button[type="submit"]').textContent = 'Adding...';
      
      const { data: edgeData, error } = await supabase.functions.invoke('create-employee', {
        body: data
      });

      e.target.querySelector('button[type="submit"]').textContent = prevBtnText;

      if (error || (edgeData && edgeData.error)) {
        alert('Failed to create employee: ' + (error?.message || edgeData?.error));
        return;
      }
      
      alert(`Employee created successfully!\n\nEmail: ${data.email}\nTemporary Password: ${edgeData.tempPassword}\n\nPlease securely share this password with the new employee so they can log in.`);
    }

    modal.innerHTML = '';
    loadEmployeeData(currentEmployee, getCurrentFilters());
  });
}
