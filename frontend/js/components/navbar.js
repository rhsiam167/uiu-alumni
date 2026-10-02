// Shared Navbar Component
import { auth } from '../auth.js';
import { getIcon, getInitials, getRelativeRoot, escapeHtml } from '../utils.js';

export function renderNavbar(activePage = 'home') {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  const currentUser = auth.getCurrentUser();
  const role = currentUser ? currentUser.role : 'guest';
  const root = getRelativeRoot();

  let navLinks = [];

  if (role === 'guest') {
    navLinks = [
      { id: 'home', label: 'Home', href: `${root}index.html` },
      { id: 'mentorship', label: 'Mentorship', href: `${root}pages/mentorship.html` },
      { id: 'jobs', label: 'Jobs', href: `${root}pages/jobs.html` },
      { id: 'events', label: 'Events', href: `${root}pages/events.html` }
    ];
  } else if (role === 'student' || role === 'alumni') {
    navLinks = [
      { id: 'dashboard', label: 'Dashboard', href: `${root}pages/dashboard.html` },
      { id: 'mentorship', label: 'Mentorship', href: `${root}pages/mentorship.html` },
      { id: 'jobs', label: 'Jobs', href: `${root}pages/jobs.html` },
      { id: 'chat', label: 'Chat', href: `${root}pages/chat.html` },
      { id: 'events', label: 'Events', href: `${root}pages/events.html` },
      { id: 'donate', label: 'Donate', href: `${root}pages/donate.html` }
    ];
  } else if (role === 'admin') {
    navLinks = [
      { id: 'admin-dashboard', label: 'Dashboard', href: `${root}pages/admin/dashboard.html` },
      { id: 'admin-users', label: 'Users', href: `${root}pages/admin/users.html` },
      { id: 'admin-jobs', label: 'Jobs', href: `${root}pages/admin/jobs.html` },
      { id: 'admin-events', label: 'Events', href: `${root}pages/admin/events.html` },
      { id: 'admin-donations', label: 'Donations', href: `${root}pages/admin/donations.html` }
    ];
  }

  const linksHtml = navLinks.map(link => `
    <li>
      <a href="${link.href}" class="nav-link ${activePage === link.id ? 'active' : ''}">${link.label}</a>
    </li>
  `).join('');

  let rightActionsHtml = '';

  if (role === 'guest') {
    rightActionsHtml = `
      <a href="${root}pages/login.html" class="btn btn-ghost">Login</a>
      <a href="${root}pages/register.html" class="btn btn-primary">Register</a>
    `;
  } else {
    const initials = getInitials(currentUser.name);
    const firstName = escapeHtml(currentUser.name.split(' ')[0]);
    const fullName = escapeHtml(currentUser.name);
    const email = escapeHtml(currentUser.email);

    rightActionsHtml = `
      <div class="user-menu">
        <button id="user-menu-btn" class="user-trigger" aria-label="User menu">
          <div class="avatar avatar-sm">${initials}</div>
          <span style="font-size: var(--font-size-sm); font-weight: 600;">${firstName}</span>
          ${getIcon('chevronDown')}
        </button>
        <div id="user-dropdown" class="user-dropdown">
          <div class="dropdown-header">
            <div class="dropdown-name">${fullName}</div>
            <div class="dropdown-email">${email}</div>
          </div>
          <a href="${root}pages/profile.html?id=${escapeHtml(currentUser.id)}" class="dropdown-item">
            ${getIcon('user')} My Profile
          </a>
          <a href="${root}pages/settings.html" class="dropdown-item">
            ${getIcon('settings')} Settings
          </a>
          <div class="dropdown-divider"></div>
          <button id="logout-btn" class="dropdown-item danger" style="width: 100%; border: none; background: none; cursor: pointer;">
            ${getIcon('logOut')} Logout
          </button>
        </div>
      </div>
    `;
  }

  const navbarHtml = `
    <nav class="navbar">
      <div class="container navbar-container">
        <a href="${root}index.html" class="navbar-brand">
          <div class="brand-title">UIU <span>Alumni</span></div>
        </a>

        <ul class="nav-links" id="nav-links-menu">
          ${linksHtml}
        </ul>

        <div class="nav-actions">
          ${rightActionsHtml}
          <button class="hamburger-btn" id="hamburger-toggle" aria-label="Toggle menu">
            ${getIcon('menu')}
          </button>
        </div>
      </div>
    </nav>
  `;

  container.innerHTML = navbarHtml;

  // Add event listeners
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => await auth.logout());
  }

  const hamburgerBtn = document.getElementById('hamburger-toggle');
  const navLinksMenu = document.getElementById('nav-links-menu');
  if (hamburgerBtn && navLinksMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navLinksMenu.classList.toggle('show');
    });
  }
}
