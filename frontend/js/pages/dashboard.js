// Dashboard Page Script (Alumni & Student)
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { getInitials, formatDate, getRelativeRoot, getIcon } from '../utils.js';
import { renderTimeline } from '../components/timeline.js';
import { showToast } from '../components/toast.js';
import { CONFIG } from '../config.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.requireAuth()) return;
  const user = auth.getCurrentUser();

  if (user.role === 'admin') {
    window.location.href = `${getRelativeRoot()}pages/admin/dashboard.html`;
    return;
  }

  renderNavbar('dashboard');
  renderFooter();

  // Header User Summary
  document.getElementById('user-avatar-badge').textContent = getInitials(user.name);
  document.getElementById('user-display-name').textContent = user.name;
  
  const roleBadge = document.getElementById('user-role-badge');
  roleBadge.textContent = user.role.toUpperCase();
  roleBadge.className = `badge badge-${user.role}`;

  if (user.role === 'alumni') {
    document.getElementById('user-sub-info').textContent = `${user.program || user.department} · Batch ${user.graduationYear || 'N/A'} ${user.jobTitle ? `| ${user.jobTitle} @ ${user.company || ''}` : ''}`;
    
    // Show mentor toggle
    const mentorToggleWrapper = document.getElementById('alumni-mentor-toggle-wrapper');
    const mentorToggleInput = document.getElementById('mentor-toggle-input');
    mentorToggleWrapper.style.display = 'flex';
    mentorToggleInput.checked = !!user.willingToMentor;

    mentorToggleInput.addEventListener('change', async () => {
      try {
        user.willingToMentor = mentorToggleInput.checked;
        await apiClient.put(`/users/${user.id}`, { willingToMentor: user.willingToMentor });
        auth.setCurrentUser(user);
        showToast(user.willingToMentor ? 'You are now visible as a mentor!' : 'Mentorship status updated to inactive.', 'success');
      } catch (err) {
        showToast('Failed to update mentorship status.', 'error');
      }
    });
  } else {
    document.getElementById('user-sub-info').textContent = `${user.program || user.department} · ID: ${user.studentId} · ${user.currentSemester || 'Student'}`;
  }

  // Quick Action Cards
  const quickActionsGrid = document.getElementById('quick-actions-grid');
  const root = getRelativeRoot();
  if (user.role === 'alumni') {
    quickActionsGrid.innerHTML = `
      <a href="${root}pages/post-job.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('briefcase')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Post Job</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Share opportunity</div>
        </div>
      </a>
      <a href="${root}pages/donate.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('heartHandshake')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Donate</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Support UIU funds</div>
        </div>
      </a>
      <a href="${root}pages/mentorship.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('users')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Requests</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Review mentorships</div>
        </div>
      </a>
      <a href="${root}pages/settings.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('settings')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Update Career</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Manage experience</div>
        </div>
      </a>
    `;
  } else {
    quickActionsGrid.innerHTML = `
      <a href="${root}pages/mentorship.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('graduationCap')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Find a Mentor</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Connect with alumni</div>
        </div>
      </a>
      <a href="${root}pages/jobs.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('briefcase')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Browse Jobs</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Explore openings</div>
        </div>
      </a>
      <a href="${root}pages/events.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('calendar')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Upcoming Events</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Register & attend</div>
        </div>
      </a>
      <a href="${root}pages/donate.html" class="card card-hover" style="text-decoration: none; display: flex; align-items: center; gap: var(--space-3);">
        <div class="stat-icon">${getIcon('heartHandshake')}</div>
        <div>
          <div style="font-weight: 700; color: var(--color-text-main);">Donate</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Support campus</div>
        </div>
      </a>
    `;
  }

  // Load Mentorship Requests
  loadMentorshipRequests(user);

  // Load Secondary Section (Timeline for Alumni / Applications for Student)
  loadSecondaryContent(user);

  // Load Messages Preview
  loadMessagesPreview(user);

  // Load Registered Events
  loadRegisteredEvents(user);

  // Refresh messages on back-navigation and periodically
  window.addEventListener('pageshow', () => loadMessagesPreview(user));
  setInterval(() => loadMessagesPreview(user), CONFIG.POLL_INTERVAL_MS);
});

async function loadMentorshipRequests(user) {
  const container = document.getElementById('dashboard-mentorship-list');
  try {
    const requests = await apiClient.get('/mentorship/requests');
    
    // Filter relevant requests
    const myReqs = user.role === 'alumni' 
      ? requests.filter(r => r.mentorId === user.id)
      : requests.filter(r => r.requesterId === user.id);

    if (myReqs.length === 0) {
      container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No mentorship requests right now.</p>`;
      return;
    }

    container.innerHTML = myReqs.map(req => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light);">
        <div>
          <div style="font-weight: 600; font-size: var(--font-size-sm); color: var(--color-text-main);">${user.role === 'alumni' ? req.requesterName : req.mentorName}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${req.topic} · ${req.createdAt}</div>
        </div>
        <span class="badge badge-${req.status}">${req.status}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No active requests.</p>`;
  }
}

async function loadSecondaryContent(user) {
  const container = document.getElementById('dashboard-secondary-content');
  const titleEl = document.getElementById('secondary-section-title');

  titleEl.textContent = 'My Career Timeline';
  container.innerHTML = renderTimeline(user.careerTimeline || []);
}

async function loadMessagesPreview(user) {
  const container = document.getElementById('dashboard-messages-list');
  if (!container) return;
  try {
    const conversations = await apiClient.get('/chat/conversations');
    const root = getRelativeRoot();

    if (!conversations || conversations.length === 0) {
      container.innerHTML = '<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No recent messages.</p>';
      return;
    }

    const top3 = conversations.slice(0, 3);

    function relativeTime(isoStr) {
      if (!isoStr) return '';
      const diff = Date.now() - new Date(isoStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      const days = Math.floor(hrs / 24);
      return days + 'd ago';
    }

    container.innerHTML = top3.map(conv => {
      const initials = conv.avatarInitials || (conv.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const preview = conv.lastMessageText || 'No messages yet';
      const time = relativeTime(conv.lastMessageAt);
      return `
        <a href="${root}pages/chat.html?user=${conv.userId}" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); text-decoration: none; color: inherit; transition: background 0.15s;" class="card-hover">
          <div class="avatar avatar-sm" style="flex-shrink: 0;">${initials}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: var(--font-size-sm); color: var(--color-text-main);">${conv.name}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${preview}</div>
          </div>
          <div style="font-size: 11px; color: var(--color-text-muted); flex-shrink: 0;">${time}</div>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load messages preview:', err);
    container.innerHTML = '<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No messages.</p>';
  }
}

async function loadRegisteredEvents(user) {
  const container = document.getElementById('dashboard-events-list');
  try {
    const events = await apiClient.get('/events');
    const registered = events.filter(e => e.isRegistered);

    if (registered.length === 0) {
      container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">You haven't registered for any events yet.</p>`;
      return;
    }

    container.innerHTML = registered.map(ev => `
      <div style="padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light);">
        <div style="font-weight: 600; font-size: var(--font-size-sm); color: var(--color-text-main);">${ev.title}</div>
        <div style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 600;">${getIcon('calendar', 'icon-sm')} ${formatDate(ev.date)} · ${ev.venue}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No registered events.</p>`;
  }
}
