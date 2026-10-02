// Mentorship Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { renderMentorCard } from '../components/cards.js';
import { showModal, showConfirmModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getRelativeRoot, formatDate, getInitials, getIcon } from '../utils.js';

let allMentors = [];
let allRequests = [];
let currentUser = null;
let activeDeptFilter = '';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('mentorship');
  renderFooter();

  currentUser = auth.getCurrentUser();
  const root = getRelativeRoot();

  const heroSecWrapper = document.getElementById('hero-secondary-btn-wrapper');
  if (heroSecWrapper) {
    if (!currentUser) {
      heroSecWrapper.innerHTML = '<a href="' + root + 'pages/register.html" class="btn btn-secondary btn-lg" style="border-radius: var(--radius-full);">Join as Alumni</a>';
    } else if (currentUser.role === 'alumni' && !currentUser.willingToMentor) {
      heroSecWrapper.innerHTML = '<a href="' + root + 'pages/settings.html" class="btn btn-secondary btn-lg" style="border-radius: var(--radius-full);">Become a Mentor</a>';
    }
  }

  if (currentUser) {
    const userSec = document.getElementById('user-mentorship-section');
    if (userSec) userSec.style.display = 'block';
  }

  await loadMentors();
  if (currentUser) {
    await loadRequests();
  }

  const heroSearch = document.getElementById('hero-mentor-search');
  const heroSearchBtn = document.getElementById('hero-search-btn');

  const filterMentors = () => {
    const q = (heroSearch ? heroSearch.value : '').toLowerCase().trim();
    const dept = activeDeptFilter;
    const filtered = allMentors.filter(m => {
      const matchQ = !q || m.name.toLowerCase().includes(q) ||
                         (m.company && m.company.toLowerCase().includes(q)) ||
                         (m.jobTitle && m.jobTitle.toLowerCase().includes(q)) ||
                         (m.mentorExpertise && m.mentorExpertise.some(e => e.toLowerCase().includes(q)));
      const matchDept = !dept || m.department === dept;
      return matchQ && matchDept;
    });
    renderMentorsGrid(filtered);
  };

  if (heroSearchBtn) heroSearchBtn.addEventListener('click', filterMentors);
  if (heroSearch) heroSearch.addEventListener('keyup', (e) => { if (e.key === 'Enter') filterMentors(); });

  const deptTabs = document.querySelectorAll('#dept-tabs-container .tab-item');
  deptTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      deptTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeDeptFilter = tab.getAttribute('data-dept') || '';
      filterMentors();
    });
  });
});

async function loadMentors() {
  const container = document.getElementById('mentors-grid');
  try {
    allMentors = await apiClient.get('/users/mentors');
    renderMentorsGrid(allMentors);
  } catch (err) {
    if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Failed to load mentors</div></div>';
  }
}

async function loadRequests() {
  try {
    allRequests = await apiClient.get('/mentorship/requests') || [];
    renderRequestsPanel();
    renderActiveMentorshipsPanel();
    renderMentorsGrid(allMentors); // refresh cards with latest request state
  } catch (err) {
    console.error('Failed to load mentorship requests:', err);
  }
}

// Derive the "latest relevant" request between currentUser and a mentor
function getLatestRequestWith(mentorId) {
  if (!currentUser) return null;
  const relevant = allRequests.filter(r =>
    (r.requesterId === currentUser.id && r.mentorId === mentorId) ||
    (r.mentorId === currentUser.id && r.requesterId === mentorId)
  );
  if (relevant.length === 0) return null;
  return relevant.reduce((latest, r) => {
    const rTime = new Date(r.createdAt || 0).getTime();
    const lTime = new Date(latest.createdAt || 0).getTime();
    return rTime > lTime ? r : latest;
  });
}

async function handleCancelRequest(reqId, label) {
  return new Promise((resolve) => {
    showConfirmModal({
      title: 'Confirm',
      message: 'Are you sure you want to ' + label + '? This action cannot be undone.',
      confirmText: 'Yes, ' + label,
      cancelText: 'Go back',
      onConfirm: async () => {
        try {
          await apiClient.delete('/mentorship/requests/' + reqId);
          showToast('Done.', 'info');
          await loadRequests();
          resolve(true);
        } catch (err) {
          console.error('Cancel mentorship error:', err);
          showToast(err.message || 'Failed.', 'error');
          resolve(false);
        }
      }
    });
  });
}

function renderRequestsPanel() {
  const container = document.getElementById('mentorship-requests-panel');
  const titleEl = document.getElementById('requests-panel-title');
  const badgeEl = document.getElementById('requests-count-badge');
  if (!container) return;

  const root = getRelativeRoot();

  if (currentUser.role === 'alumni' && currentUser.willingToMentor) {
    if (titleEl) titleEl.textContent = 'Received Requests';
    const received = allRequests.filter(r => r.mentorId === currentUser.id && r.status === 'pending');
    if (badgeEl) badgeEl.textContent = received.length + ' Pending';

    if (received.length === 0) {
      container.innerHTML = '<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-4) 0;">No pending mentorship requests.</p>';
      return;
    }

    container.innerHTML = received.map(r => {
      const initials = getInitials(r.requesterName);
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); gap: var(--space-3);">
          <a href="${root}pages/profile.html?id=${r.requesterId}" title="View profile" style="text-decoration: none; flex-shrink: 0;">
            <div class="avatar avatar-sm" style="cursor: pointer;">${initials}</div>
          </a>
          <div style="flex: 1; min-width: 0;">
            <a href="${root}pages/profile.html?id=${r.requesterId}" style="text-decoration: none; color: inherit;">
              <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-main);">${r.requesterName}</div>
            </a>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">${r.topic} &middot; "${r.message}"</div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
            <button class="btn btn-success btn-sm action-accept" data-id="${r.id}">${getIcon('check')}</button>
            <button class="btn btn-danger btn-sm action-decline" data-id="${r.id}">${getIcon('x')}</button>
            <a href="${root}pages/chat.html?user=${r.requesterId}" class="btn btn-secondary btn-sm" style="padding: 4px 8px;" title="Chat">${getIcon('message')}</a>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.action-accept').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await apiClient.put('/mentorship/requests/' + id, { status: 'accepted' });
        showToast('Request accepted!', 'success');
        await loadRequests();
      });
    });

    container.querySelectorAll('.action-decline').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await apiClient.put('/mentorship/requests/' + id, { status: 'declined' });
        showToast('Request declined.', 'info');
        await loadRequests();
      });
    });

  } else {
    // Student / non-mentor alumni: show sent pending requests with Cancel button
    if (titleEl) titleEl.textContent = 'My Sent Requests';
    const sent = allRequests.filter(r => r.requesterId === currentUser.id && r.status === 'pending');
    if (badgeEl) badgeEl.textContent = sent.length + ' Pending';

    if (sent.length === 0) {
      container.innerHTML = '<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-4) 0;">No pending mentorship requests.</p>';
      return;
    }

    container.innerHTML = sent.map(r => {
      const initials = getInitials(r.mentorName);
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); gap: var(--space-3);">
          <a href="${root}pages/profile.html?id=${r.mentorId}" title="View profile" style="text-decoration: none; flex-shrink: 0;">
            <div class="avatar avatar-sm" style="cursor: pointer;">${initials}</div>
          </a>
          <div style="flex: 1; min-width: 0;">
            <a href="${root}pages/profile.html?id=${r.mentorId}" style="text-decoration: none; color: inherit;">
              <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text-main);">${r.mentorName}</div>
            </a>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">${r.topic} &middot; "${r.message}"</div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
            <span class="badge badge-pending" style="flex-shrink: 0;">Pending</span>
            <button class="btn btn-ghost btn-sm action-cancel-req" data-id="${r.id}" style="color: var(--color-danger); font-size: 11px; padding: 2px 8px;">Cancel</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.action-cancel-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        handleCancelRequest(id, 'cancel request');
      });
    });
  }
}

function renderActiveMentorshipsPanel() {
  const container = document.getElementById('active-mentorships-panel');
  if (!container) return;

  const root = getRelativeRoot();
  const accepted = allRequests.filter(r =>
    (r.requesterId === currentUser.id || r.mentorId === currentUser.id) && r.status === 'accepted'
  );

  if (accepted.length === 0) {
    container.innerHTML = '<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); padding: var(--space-2) 0;">No active mentorship sessions.</p>';
    return;
  }

  container.innerHTML = accepted.map(r => {
    const partnerId = r.requesterId === currentUser.id ? r.mentorId : r.requesterId;
    const partnerName = r.requesterId === currentUser.id ? r.mentorName : r.requesterName;
    const partnerInitials = getInitials(partnerName);
    const endLabel = r.requesterId === currentUser.id ? 'End Mentorship' : 'End Mentorship';

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light); gap: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex: 1; min-width: 0;">
          <a href="${root}pages/profile.html?id=${partnerId}" title="View profile" style="text-decoration: none; flex-shrink: 0;">
            <div class="avatar avatar-sm" style="cursor: pointer;">${partnerInitials}</div>
          </a>
          <div>
            <a href="${root}pages/profile.html?id=${partnerId}" style="text-decoration: none; color: inherit;">
              <div style="font-size: var(--font-size-xs); font-weight: 700;">${partnerName}</div>
            </a>
            <div style="font-size: 11px; color: var(--color-text-muted);">${r.topic}</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
          <a href="${root}pages/chat.html?user=${partnerId}" class="btn btn-outline btn-sm" style="border-radius: var(--radius-full); font-size: 11px;">Join Chat</a>
          <button class="btn btn-ghost btn-sm action-end-mentorship" data-id="${r.id}" style="color: var(--color-danger); font-size: 11px; padding: 2px 8px;">${endLabel}</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.action-end-mentorship').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleCancelRequest(id, 'end mentorship');
    });
  });
}

function renderMentorsGrid(mentors) {
  const container = document.getElementById('mentors-grid');
  const countEl = document.getElementById('mentors-count-num');
  if (countEl) countEl.textContent = mentors ? mentors.length : 0;

  if (!mentors || mentors.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; background: #FFFFFF; border-radius: var(--radius-xl); padding: var(--space-12); border: 1px solid var(--color-border-light);"><div class="empty-state-title">No mentors found</div><p style="color: var(--color-text-muted);">Try selecting another department or adjusting your search.</p></div>';
    return;
  }

  container.innerHTML = mentors.map(m => {
    const latestReq = currentUser ? getLatestRequestWith(m.id) : null;
    // Derive button state from latest request status
    let requestState = 'none'; // none | pending | accepted | other (cancelled/declined/ended)
    if (latestReq) {
      requestState = latestReq.status === 'pending' ? 'pending'
        : latestReq.status === 'accepted' ? 'accepted'
        : 'other';
    }
    return renderMentorCard(m, { currentUser, requestState, latestReq });
  }).join('');

  container.querySelectorAll('.request-mentor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mentorId = btn.getAttribute('data-id');
      const mentorName = btn.getAttribute('data-name');
      handleRequestMentorship(mentorId, mentorName);
    });
  });

  container.querySelectorAll('.cancel-mentor-req-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.getAttribute('data-req-id');
      handleCancelRequest(reqId, 'cancel request');
    });
  });

  container.querySelectorAll('.end-mentorship-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.getAttribute('data-req-id');
      handleCancelRequest(reqId, 'end mentorship');
    });
  });
}

function handleRequestMentorship(mentorId, mentorName) {
  if (!currentUser) {
    const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = getRelativeRoot() + 'pages/login.html?redirect=' + currentPath;
    return;
  }

  if (currentUser.id === mentorId) {
    showToast('You cannot request mentorship from yourself.', 'error');
    return;
  }

  const content = `
    <form id="mentorship-request-form">
      <div class="form-group">
        <label class="form-label">Mentor</label>
        <input type="text" class="form-control" value="${mentorName}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Topic <span class="required">*</span></label>
        <select id="req-topic" class="form-control" required>
          <option value="Career Advice">Career Advice</option>
          <option value="Resume Review">Resume Review</option>
          <option value="Interview Prep">Interview Prep</option>
          <option value="Project Feedback">Project Feedback</option>
          <option value="Higher Studies">Higher Studies</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Message / Objective <span class="required">*</span></label>
        <textarea id="req-message" class="form-control" rows="4" placeholder="Briefly describe what guidance you are seeking..." required></textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button id="close-req-modal" class="btn btn-secondary">Cancel</button>
    <button id="submit-req-modal" class="btn btn-primary" style="border-radius: var(--radius-full);">Send Request</button>
  `;

  const modal = showModal({ title: 'Request Mentorship', content, footerHtml });

  document.getElementById('close-req-modal').addEventListener('click', () => modal.close());
  document.getElementById('submit-req-modal').addEventListener('click', async () => {
    const topic = document.getElementById('req-topic').value;
    const message = document.getElementById('req-message').value.trim();

    if (!message) {
      showToast('Please include a short message.', 'error');
      return;
    }

    try {
      await apiClient.post('/mentorship/requests', {
        mentorId,
        mentorName,
        requesterId: currentUser.id,
        requesterName: currentUser.name,
        topic,
        message
      });
      modal.close();
      showToast('Mentorship request sent successfully!', 'success');
      await loadRequests();
    } catch (err) {
      showToast(err.message || 'Failed to send request.', 'error');
    }
  });
}
