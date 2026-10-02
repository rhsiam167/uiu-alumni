// Admin User Details Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { formatDate, getRelativeRoot, getIcon, escapeHtml } from '../../utils.js';
import { showToast } from '../../components/toast.js';
import { showModal } from '../../components/modal.js';

let targetUser = null;

function init() {
  auth.requireRole('admin').then(ok => {
    if (!ok) return;

    renderNavbar('admin-users');
    renderFooter();

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
      window.location.href = `${getRelativeRoot()}pages/admin/users.html`;
      return;
    }

    loadUser(userId);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function loadUser(userId) {
  const container = document.getElementById('admin-user-detail-card');
  if (!container) return;

  try {
    targetUser = await apiClient.get(`/admin/users/${userId}`);

    if (!targetUser) {
      container.innerHTML = `
        <div style="padding: var(--space-6); text-align: center;">
          <h3 style="margin-bottom: var(--space-2);">User Not Found</h3>
          <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">No user details found for ID: ${userId}</p>
          <a href="users.html" class="btn btn-secondary btn-sm">← Back to Users List</a>
        </div>
      `;
      return;
    }

    // --- Admin Decision & Actions block ---
    let decisionHtml = '';
    let actionButtonsHtml = '';

    if (targetUser.status === 'pending') {
      // Show Approve / Reject buttons for pending users
      decisionHtml = `
        <button id="btn-approve-user" class="btn btn-success">Approve User</button>
        <button id="btn-reject-user" class="btn btn-danger">Reject User</button>
      `;
    } else if (targetUser.status === 'approved') {
      decisionHtml = `<span class="badge badge-approved" style="font-size: var(--font-size-sm); padding: var(--space-1) var(--space-3);">Approved</span>`;
    } else if (targetUser.status === 'rejected') {
      decisionHtml = `<span class="badge badge-rejected" style="font-size: var(--font-size-sm); padding: var(--space-1) var(--space-3);">Rejected</span>`;
      if (targetUser.rejectionReason) {
        decisionHtml += `<span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Reason: ${escapeHtml(targetUser.rejectionReason)}</span>`;
      }
    } else if (targetUser.status === 'suspended') {
      decisionHtml = `
        <span class="badge badge-suspended" style="font-size: var(--font-size-sm); padding: var(--space-1) var(--space-3);">Suspended</span>
        <button id="btn-suspend-user" class="btn btn-secondary">Reactivate Account</button>
      `;
    }

    // Grant Verified Badge and Suspend Account — approved users only
    if (targetUser.status === 'approved') {
      actionButtonsHtml += `<button id="btn-verify-user" class="btn btn-outline">${targetUser.verified ? 'Un-verify Badge' : 'Grant Verified Badge'}</button>`;
      actionButtonsHtml += `<button id="btn-suspend-user" class="btn btn-secondary">Suspend Account</button>`;
    }

    // Remove User — shown for all non-admin users (admin's own account excluded too)
    const currentUser = auth.getUser ? auth.getUser() : null;
    const isSelf = currentUser && currentUser.id === targetUser.id;
    if (targetUser.role !== 'admin' && !isSelf) {
      actionButtonsHtml += `<button id="btn-remove-user" class="btn btn-danger">Remove User</button>`;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--color-border-light); padding-bottom: var(--space-4); margin-bottom: var(--space-6);">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <h1 style="font-size: var(--font-size-2xl); font-weight: 800;">${escapeHtml(targetUser.name)}</h1>
            <span class="badge badge-${targetUser.role}">${targetUser.role}</span>
            <span class="badge badge-${targetUser.status}">${targetUser.status}</span>
            ${targetUser.verified ? `<span class="badge badge-verified" style="display: inline-flex; align-items: center; gap: 4px;">${getIcon('badgeCheck')} Verified Alumni</span>` : ''}
          </div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 4px;">
            Registered on ${formatDate(targetUser.createdAt)}
          </p>
        </div>
      </div>

      <!-- User Information Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-8);">
        <div>
          <h3 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-3);">Account &amp; Personal Details</h3>
          <div style="font-size: var(--font-size-sm); display: flex; flex-direction: column; gap: var(--space-2);">
            <div><strong>Email:</strong> ${escapeHtml(targetUser.email)}</div>
            <div><strong>Phone:</strong> ${escapeHtml(targetUser.phone || 'N/A')}</div>
            <div><strong>City:</strong> ${escapeHtml(targetUser.city || 'N/A')}</div>
            <div><strong>Bio:</strong> ${escapeHtml(targetUser.bio || 'None provided')}</div>
          </div>
        </div>

        <div>
          <h3 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-3);">Academic &amp; Professional</h3>
          <div style="font-size: var(--font-size-sm); display: flex; flex-direction: column; gap: var(--space-2);">
            <div><strong>Student/Alumni ID:</strong> ${escapeHtml(targetUser.studentId || 'N/A')}</div>
            <div><strong>Department:</strong> ${escapeHtml(targetUser.department || 'N/A')}</div>
            <div><strong>Program:</strong> ${escapeHtml(targetUser.program || 'N/A')}</div>
            ${targetUser.graduationYear ? `<div><strong>Graduation Year:</strong> ${targetUser.graduationYear}</div>` : ''}
            ${targetUser.company ? `<div><strong>Current Company:</strong> ${escapeHtml(targetUser.company)} (${escapeHtml(targetUser.jobTitle || '')})</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Admin Action Controls -->
      <div style="background: var(--color-bg-subtle); padding: var(--space-6); border-radius: var(--radius-lg); border: 1px solid var(--color-border-light);">
        <h3 style="font-size: var(--font-size-base); font-weight: 700; margin-bottom: var(--space-4);">Admin Decision &amp; Actions</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center;">
          ${decisionHtml}
          ${actionButtonsHtml}
        </div>
      </div>
    `;

    // Wire up event listeners

    const btnApprove = document.getElementById('btn-approve-user');
    if (btnApprove) btnApprove.addEventListener('click', () => updateStatus({ status: 'approved' }));

    const btnReject = document.getElementById('btn-reject-user');
    if (btnReject) btnReject.addEventListener('click', () => {
      promptRejectionReason(reason => updateStatus({ status: 'rejected', rejectionReason: reason }));
    });

    const btnVerify = document.getElementById('btn-verify-user');
    if (btnVerify) btnVerify.addEventListener('click', () => {
      updateStatus({ verified: !targetUser.verified });
    });

    const btnSuspend = document.getElementById('btn-suspend-user');
    if (btnSuspend) btnSuspend.addEventListener('click', () => {
      const newStatus = targetUser.status === 'suspended' ? 'approved' : 'suspended';
      updateStatus({ status: newStatus });
    });

    const btnRemove = document.getElementById('btn-remove-user');
    if (btnRemove) btnRemove.addEventListener('click', () => removeUser());

  } catch (err) {
    console.error('Error rendering user details:', err);
    container.innerHTML = `
      <div style="padding: var(--space-6); text-align: center; color: var(--color-danger);">
        <p>An error occurred while loading user details: ${escapeHtml(err.message)}</p>
        <a href="users.html" class="btn btn-secondary btn-sm" style="margin-top: var(--space-3);">← Back to Users List</a>
      </div>
    `;
  }
}

function promptRejectionReason(onConfirm) {
  const content = `
    <div class="form-group">
      <label class="form-label">Rejection Reason <span class="required">*</span></label>
      <textarea id="rejection-reason-text" class="form-control" rows="3" placeholder="Enter reason for rejection..."></textarea>
    </div>
  `;
  const footerHtml = `
    <button id="cancel-rej-modal" class="btn btn-secondary">Cancel</button>
    <button id="submit-rej-modal" class="btn btn-danger">Confirm Rejection</button>
  `;
  const modal = showModal({ title: 'Reject User Registration', content, footerHtml });

  document.getElementById('cancel-rej-modal').addEventListener('click', () => modal.close());
  document.getElementById('submit-rej-modal').addEventListener('click', () => {
    const reason = document.getElementById('rejection-reason-text').value.trim();
    if (!reason) {
      showToast('A rejection reason is required.', 'error');
      return;
    }
    modal.close();
    onConfirm(reason);
  });
}

async function updateStatus(payload) {
  try {
    await apiClient.put(`/admin/users/${targetUser.id}`, payload);
    showToast('User updated successfully.', 'success');
    loadUser(targetUser.id);
  } catch (err) {
    console.error('Update user error:', err);
    showToast(err.message || 'Failed to update user.', 'error');
  }
}

function removeUser() {
  const userName = escapeHtml(targetUser.name);
  const content = `
    <p>Permanently remove <strong>${userName}</strong>? This deletes their account and all their data (profile, jobs, applications, messages, event registrations, donations). This cannot be undone.</p>
  `;
  const footerHtml = `
    <button id="cancel-remove-modal" class="btn btn-secondary">Cancel</button>
    <button id="confirm-remove-modal" class="btn btn-danger">Yes, Remove User</button>
  `;
  const modal = showModal({ title: 'Remove User', content, footerHtml });

  document.getElementById('cancel-remove-modal').addEventListener('click', () => modal.close());
  document.getElementById('confirm-remove-modal').addEventListener('click', async () => {
    modal.close();
    try {
      await apiClient.delete(`/admin/users/${targetUser.id}`);
      showToast('User removed successfully.', 'success');
      window.location.href = `${getRelativeRoot()}pages/admin/users.html`;
    } catch (err) {
      console.error('Remove user error:', err);
      showToast(err.message || 'Failed to remove user.', 'error');
    }
  });
}
