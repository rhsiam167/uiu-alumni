// Profile Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { getInitials, getRelativeRoot, getIcon, escapeHtml, safeUrl } from '../utils.js';
import { renderTimeline } from '../components/timeline.js';
import { showToast } from '../components/toast.js';
import { showConfirmModal } from '../components/modal.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('profile');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  let userId = urlParams.get('id');

  const currentUser = auth.getCurrentUser();
  if (!userId && currentUser) {
    userId = currentUser.id;
  }

  if (!userId) {
    window.location.href = getRelativeRoot() + 'index.html';
    return;
  }

  const mainCard = document.getElementById('profile-main-card');
  const timelineBox = document.getElementById('profile-timeline-container');

  try {
    const [targetUser, allRequests] = await Promise.all([
      apiClient.get('/users/' + userId),
      currentUser ? apiClient.get('/mentorship/requests') : Promise.resolve([])
    ]);

    if (!targetUser) {
      mainCard.innerHTML = '<p>User not found.</p>';
      return;
    }

    const isOwnProfile = currentUser && currentUser.id === targetUser.id;
    const isGuestView = auth.isGuest();

    // Get the latest relevant request between currentUser and targetUser
    function getLatestRequest(reqs) {
      const relevant = (reqs || []).filter(r =>
        (r.requesterId === currentUser.id && r.mentorId === targetUser.id) ||
        (r.requesterId === targetUser.id && r.mentorId === currentUser.id)
      );
      if (relevant.length === 0) return null;
      return relevant.reduce((a, b) =>
        new Date(a.createdAt || 0) >= new Date(b.createdAt || 0) ? a : b
      );
    }

    function renderActionBtns(reqs) {
      const btnsContainer = document.getElementById('profile-action-btns');
      if (!btnsContainer) return;
      btnsContainer.innerHTML = buildBtnHtml(reqs);
      bindBtnListeners(reqs);
    }

    function buildBtnHtml(reqs) {
      if (isOwnProfile) {
        return '<a href="' + getRelativeRoot() + 'pages/settings.html" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-full);">Edit Profile</a>';
      }
      if (isGuestView) return '';

      const req = getLatestRequest(reqs);
      let mentorshipBtn = '';

      if (targetUser.role === 'alumni' && targetUser.willingToMentor) {
        if (!req || req.status === 'cancelled' || req.status === 'declined' || req.status === 'ended') {
          // Can request again
          mentorshipBtn = '<a href="' + getRelativeRoot() + 'pages/mentorship.html" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full);">Request Mentorship</a>';
        } else if (req.status === 'pending') {
          const isRequester = req.requesterId === currentUser.id;
          if (isRequester) {
            mentorshipBtn = '<button id="cancel-mentorship-btn" class="btn btn-secondary btn-sm" data-req-id="' + escapeHtml(req.id) + '" data-req-status="' + escapeHtml(req.status) + '" style="border-radius: var(--radius-full);">' + getIcon('x') + ' Cancel Request</button>';
          } else {
            // Mentor sees pending from this user
            mentorshipBtn = '<span class="badge badge-pending">Incoming Request</span>';
          }
        } else if (req.status === 'accepted') {
          mentorshipBtn = '<button id="cancel-mentorship-btn" class="btn btn-danger btn-sm" data-req-id="' + escapeHtml(req.id) + '" data-req-status="' + escapeHtml(req.status) + '" style="border-radius: var(--radius-full);">' + getIcon('x') + ' End Mentorship</button>';
        }
      } else if (targetUser.role === 'student' || (targetUser.role === 'alumni' && !targetUser.willingToMentor)) {
        if (req && req.status === 'accepted') {
          mentorshipBtn = '<button id="cancel-mentorship-btn" class="btn btn-danger btn-sm" data-req-id="' + escapeHtml(req.id) + '" data-req-status="' + escapeHtml(req.status) + '" style="border-radius: var(--radius-full);">' + getIcon('x') + ' End Mentorship</button>';
        }
      }

      return '<div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">'
        + '<a href="' + getRelativeRoot() + 'pages/chat.html?user=' + escapeHtml(targetUser.id) + '" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-full);">Message</a>'
        + mentorshipBtn
        + '</div>';
    }

    function bindBtnListeners(reqs) {
      const cancelBtn = document.getElementById('cancel-mentorship-btn');
      if (!cancelBtn) return;
      cancelBtn.addEventListener('click', () => {
        const reqId = cancelBtn.getAttribute('data-req-id');
        const reqStatus = cancelBtn.getAttribute('data-req-status');
        const label = reqStatus === 'accepted' ? 'end this mentorship' : 'cancel this request';

        showConfirmModal({
          title: 'Confirm',
          message: 'Are you sure you want to ' + label + '?',
          confirmText: 'Yes, confirm',
          cancelText: 'Go back',
          onConfirm: async () => {
            try {
              await apiClient.delete('/mentorship/requests/' + reqId);
              showToast('Done.', 'info');
              // Refresh request list and re-render button without page reload
              const freshReqs = await apiClient.get('/mentorship/requests');
              renderActionBtns(freshReqs);
            } catch (err) {
              console.error('Cancel mentorship error:', err);
              showToast(err.message || 'Failed to cancel.', 'error');
            }
          }
        });
      });
    }

    // Build main card HTML
    mainCard.innerHTML = `
      <div style="display: flex; gap: var(--space-6); flex-wrap: wrap; align-items: flex-start;">
        <div class="avatar avatar-xl" style="width: 96px; height: 96px; font-size: 32px;">${getInitials(targetUser.name)}</div>
        
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <h1 style="font-size: var(--font-size-2xl); font-weight: 800;">${escapeHtml(targetUser.name)}</h1>
                ${targetUser.verified ? '<span class="badge badge-verified">' + getIcon('badgeCheck') + ' Verified</span>' : ''}
                <span class="badge badge-${escapeHtml(targetUser.role)}">${escapeHtml(targetUser.role)}</span>
              </div>
              <p style="font-size: var(--font-size-base); font-weight: 600; color: var(--color-primary); margin-top: 4px;">
                ${escapeHtml(targetUser.jobTitle || '')} ${targetUser.company ? '@ ' + escapeHtml(targetUser.company) : ''}
              </p>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <span>${escapeHtml(targetUser.department)} ${targetUser.graduationYear ? '&middot; Class of ' + escapeHtml(targetUser.graduationYear) : ''}</span>
                ${targetUser.city ? '<span>&middot; ' + getIcon('mapPin') + ' ' + escapeHtml(targetUser.city) + '</span>' : ''}
              </div>
            </div>

            <div id="profile-action-btns">
              ${buildBtnHtml(allRequests)}
            </div>
          </div>

          ${targetUser.bio ? '<p style="margin-top: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-main); line-height: 1.6;">' + escapeHtml(targetUser.bio) + '</p>' : ''}

          ${!isGuestView ? `
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-bg-subtle); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
              ${targetUser.email ? '<div style="display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-muted);">' + getIcon('mail') + '<span style="font-weight: 600; color: var(--color-text-main);">' + escapeHtml(targetUser.email) + '</span></div>' : ''}
              ${targetUser.studentId ? '<div style="display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-muted);">' + getIcon('fileText') + '<span>Student/Alumni ID: <strong style="color: var(--color-text-main);">' + escapeHtml(targetUser.studentId) + '</strong></span></div>' : ''}
              ${targetUser.department ? '<div style="display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-muted);">' + getIcon('graduationCap') + '<span>' + escapeHtml(targetUser.department) + (targetUser.program ? ' &middot; ' + escapeHtml(targetUser.program) : '') + '</span></div>' : ''}
            </div>
          ` : ''}

          <div style="display: flex; gap: var(--space-4); margin-top: var(--space-4); font-size: var(--font-size-sm);">
            ${targetUser.linkedin ? '<a href="' + safeUrl(targetUser.linkedin) + '" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px;">LinkedIn ' + getIcon('externalLink') + '</a>' : ''}
            ${targetUser.github ? '<a href="' + safeUrl(targetUser.github) + '" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px;">GitHub ' + getIcon('externalLink') + '</a>' : ''}
            ${targetUser.portfolio ? '<a href="' + safeUrl(targetUser.portfolio) + '" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px;">Portfolio ' + getIcon('externalLink') + '</a>' : ''}
          </div>
        </div>
      </div>
    `;

    bindBtnListeners(allRequests);
    timelineBox.innerHTML = renderTimeline(targetUser.careerTimeline || []);

  } catch (err) {
    console.error('Profile load error:', err);
    mainCard.innerHTML = '<p style="color: var(--color-danger);">Failed to load profile details.</p>';
  }
});
