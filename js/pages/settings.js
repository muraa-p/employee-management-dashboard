import { supabase } from '../supabase.js';

export async function renderSettings(container, employee) {
  // Get latest employee info (in case it changed)
  const { data: latestEmp } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .eq('id', employee.id)
    .single();

  const emp = latestEmp || employee;

  container.innerHTML = `
    <h1 class="page-title">Settings</h1>
    
    <div class="settings-grid" style="display:grid;gap:24px;grid-template-columns:1fr;max-width:800px">
      
      <!-- Profile Information -->
      <div class="card">
        <h3 style="margin-bottom:16px;border-bottom:1px solid var(--c-gray-200);padding-bottom:12px">Profile Information</h3>
        
        <form id="profile-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value="${emp.name}" required />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" name="phone" value="${emp.phone || ''}" placeholder="e.g. +1 234 567 890" />
            </div>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div class="form-group">
              <label>Email Address <span style="color:var(--c-gray-400);font-weight:normal">(Constant)</span></label>
              <input type="email" value="${emp.email}" disabled style="background:#f9fafb;color:var(--c-gray-500)"/>
            </div>
            <div class="form-group">
              <label>Role <span style="color:var(--c-gray-400);font-weight:normal">(Constant)</span></label>
              <input type="text" value="${emp.role}" disabled style="background:#f9fafb;color:var(--c-gray-500)"/>
            </div>
          </div>
          
          <div style="display:flex;justify-content:flex-end">
            <button type="submit" class="btn btn-dark" id="btn-save-profile">Save Profile</button>
          </div>
        </form>
      </div>

      <!-- Security Settings -->
      <div class="card">
        <h3 style="margin-bottom:16px;border-bottom:1px solid var(--c-gray-200);padding-bottom:12px">Security</h3>
        <p style="font-size:13px;color:var(--c-gray-500);margin-bottom:16px">Update your password here. You will be logged out after a successful password change if done from another device, but kept logged in here.</p>
        
        <form id="password-form">
          <div class="form-group">
            <label>New Password</label>
            <input type="password" name="password" minlength="6" placeholder="Enter new password" required />
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label>Confirm New Password</label>
            <input type="password" name="confirm_password" minlength="6" placeholder="Confirm new password" required />
          </div>
          
          <div style="display:flex;justify-content:flex-end">
            <button type="submit" class="btn btn-outline" style="border-color:var(--c-red-500);color:var(--c-red-500)" id="btn-save-password">Update Password</button>
          </div>
        </form>
      </div>

    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-profile');
    const ogText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const d = Object.fromEntries(new FormData(e.target));
    
    const { error } = await supabase.from('employees').update({
      name: d.name,
      phone: d.phone
    }).eq('id', employee.id);

    btn.textContent = ogText;
    btn.disabled = false;

    if (error) {
      alert('Error updating profile: ' + error.message);
    } else {
      alert('Profile information updated successfully!');
      // Update local storage or trigger a small UI refresh if needed
      // Actually sidebar name needs a full reload or DOM update, we'll just alert
    }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pass = fd.get('password');
    const conf = fd.get('confirm_password');

    if (pass !== conf) {
      alert('Passwords do not match!');
      return;
    }

    const btn = document.getElementById('btn-save-password');
    const ogText = btn.textContent;
    btn.textContent = 'Updating...';
    btn.disabled = true;

    // Update password in Auth system
    const { error } = await supabase.auth.updateUser({ password: pass });

    btn.textContent = ogText;
    btn.disabled = false;

    if (error) {
      alert('Failed to update password: ' + error.message);
    } else {
      alert('Password updated successfully!');
      e.target.reset();
    }
  });
}
