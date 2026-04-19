import './style.css';
import { supabase, getCurrentEmployee, clearCurrentEmployee } from './js/supabase.js';
import { initRouter, navigate } from './js/router.js';

// HR pages
import { renderDashboard } from './js/pages/dashboard.js';
import { renderEmployees } from './js/pages/employees.js';
import { renderProjects } from './js/pages/projects.js';
import { renderAttendance } from './js/pages/attendance.js';
import { renderLeaves } from './js/pages/leaves.js';

// Employee pages
import { renderEmployeeDashboard } from './js/pages/employee-dashboard.js';
import { renderMyProjects } from './js/pages/my-projects.js';
import { renderMyTasks } from './js/pages/my-tasks.js';
import { renderMyAttendance } from './js/pages/my-attendance.js';

// Shared pages
import { renderSettings } from './js/pages/settings.js';

const AVATAR_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899'];
function getColor(name) {
  let h = 0; for(let i=0;i<name.length;i++) h = name.charCodeAt(i)+((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];
}

const HR_NAV = [
  { page: 'dashboard', label: 'Dashboard', icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>` },
  { page: 'projects', label: 'Projects', icon: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>` },
  { page: 'employees', label: 'Employees', icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>` },
  { page: 'attendance', label: 'Attendance', icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>` },
  { page: 'leaves', label: 'Leaves', icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>` },
];

const EMP_NAV = [
  { page: 'dashboard', label: 'My Dashboard', icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>` },
  { page: 'my-projects', label: 'My Projects', icon: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>` },
  { page: 'my-tasks', label: 'My Tasks', icon: `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>` },
  { page: 'leaves', label: 'Leaves', icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>` },
  { page: 'my-attendance', label: 'My Attendance', icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>` },
];

function buildSidebar(employee) {
  const isHR = employee?.role_type === 'hr';
  const nav = isHR ? HR_NAV : EMP_NAV;
  const initials = employee?.name?.split(' ').map(n => n[0]).join('').slice(0,2) || 'U';
  const color = employee?.name ? getColor(employee.name) : '#666';

  document.getElementById('sidebar-nav').innerHTML = nav.map(item => `
    <a href="#/${item.page === 'dashboard' ? '' : item.page}" class="nav-item" data-page="${item.page}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
      <span>${item.label}</span>
    </a>
  `).join('');

  // User info in sidebar footer
  const userInfo = document.getElementById('sidebar-user');
  if (userInfo) {
    userInfo.innerHTML = `
      <div class="sidebar-user-info">
        <div class="member-avatar" style="background:${color};flex-shrink:0">${initials}</div>
        <div class="sidebar-user-details">
          <div class="sidebar-user-name">${employee?.name || 'User'}</div>
          <span class="role-badge ${isHR ? 'role-hr' : 'role-emp'}">${isHR ? 'HR' : 'Employee'}</span>
        </div>
      </div>
    `;
  }

  // Update header avatar
  const headerAvatar = document.getElementById('user-avatar');
  if (headerAvatar) {
    headerAvatar.innerHTML = `<div class="avatar-circle" style="background:${color};font-size:13px;font-weight:700;color:#090909">${initials}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const pageContent = document.getElementById('page-content');

  // --- AUTH CHECK ---
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    setupAuth();
    return;
  }

  await bootApp(session.user);

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Logout
  document.getElementById('logout-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearCurrentEmployee();
    await supabase.auth.signOut();
    window.location.reload();
  });

  async function bootApp(user) {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    const employee = await getCurrentEmployee();
    if (!employee) {
      authScreen.classList.remove('hidden');
      mainApp.classList.add('hidden');
      document.getElementById('auth-error').textContent = 'No employee account found for this email.';
      document.getElementById('auth-error').classList.remove('hidden');
      await supabase.auth.signOut();
      return;
    }

    buildSidebar(employee);

    const isHR = employee.role_type === 'hr';

    initRouter(async (page) => {
      pageContent.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

      if (isHR) {
        switch (page) {
          case 'dashboard': await renderDashboard(pageContent, employee); break;
          case 'projects':  await renderProjects(pageContent, employee); break;
          case 'employees': await renderEmployees(pageContent, employee); break;
          case 'attendance':await renderAttendance(pageContent, employee); break;
          case 'leaves':    await renderLeaves(pageContent, employee); break;
          case 'settings':  await renderSettings(pageContent, employee); break;
          default:          await renderDashboard(pageContent, employee); break;
        }
      } else {
        switch (page) {
          case 'dashboard':     await renderEmployeeDashboard(pageContent, employee); break;
          case 'my-projects':   await renderMyProjects(pageContent, employee); break;
          case 'my-tasks':      await renderMyTasks(pageContent, employee); break;
          case 'leaves':        await renderLeaves(pageContent, employee); break;
          case 'my-attendance': await renderMyAttendance(pageContent, employee); break;
          case 'settings':      await renderSettings(pageContent, employee); break;
          default:              await renderEmployeeDashboard(pageContent, employee); break;
        }
      }

      // Re-sync active nav after render
      const hash = window.location.hash.slice(1) || '/';
      const activePage = hash === '/' ? 'dashboard' : hash.slice(1);
      document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === activePage);
      });
    });
  }

  function setupAuth() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('auth-toggle');
    const submitBtn = document.getElementById('auth-submit');
    const errorEl = document.getElementById('auth-error');
    let isSignUp = false;

    toggleLink?.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUp = !isSignUp;
      submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
      document.querySelector('.auth-container h1').textContent = isSignUp ? 'Create Account' : 'Welcome Back';
      toggleLink.parentElement.textContent = '';
      toggleLink.textContent = isSignUp ? 'Sign In' : 'Sign Up';
      toggleLink.parentElement.append(isSignUp ? "Already have an account? " : "Don't have an account? ", toggleLink);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;

      let error;
      let user;
      if (isSignUp) {
        const res = await supabase.auth.signUp({ email, password });
        error = res.error; user = res.data?.user;
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        error = res.error; user = res.data?.user;
      }

      if (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
        return;
      }

      if (user) await bootApp(user);
    });
  }
});
