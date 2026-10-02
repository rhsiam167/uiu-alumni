// Admin Dashboard Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { escapeHtml, formatDate, getRelativeRoot } from '../../utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthed = await auth.requireRole('admin');
  if (!isAuthed) return;

  await renderNavbar('admin-dashboard');
  renderFooter();

  try {
    const stats = await apiClient.get('/admin/stats');
    document.getElementById('admin-stat-pending').textContent = stats.pendingApprovalsCount || 0;
    document.getElementById('admin-stat-alumni').textContent = stats.totalAlumniCount || 0;
    document.getElementById('admin-stat-students').textContent = stats.totalStudentsCount || 0;
    document.getElementById('admin-stat-jobs').textContent = stats.pendingJobsCount || 0;
    document.getElementById('admin-stat-donations').textContent = `${(Number(stats.totalDonationsAmount) || 0).toLocaleString()} BDT`;
    const eventsEl = document.getElementById('admin-stat-events');
    if (eventsEl) eventsEl.textContent = stats.upcomingEventsCount || 0;
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }

  await loadPendingUsers();
  await loadPendingJobs();
  await loadRecentDonations();
});

async function loadPendingUsers() {
  const tbody = document.getElementById('admin-pending-users-tbody');
  if (!tbody) return;
  try {
    const res = await apiClient.get('/admin/users?status=pending&limit=5');
    const pending = Array.isArray(res) ? res : (res.items || []);

    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">No pending registration requests.</td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map(u => `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(u.name)}</td>
        <td><span class="badge badge-${escapeHtml(u.role)}">${escapeHtml(u.role)}</span></td>
        <td>${escapeHtml(u.studentId || u.student_id || 'N/A')}</td>
        <td>${escapeHtml(u.department || 'N/A')}</td>
        <td>${formatDate(u.createdAt || u.created_at)}</td>
        <td style="text-align: right;">
          <a href="${getRelativeRoot()}pages/admin/user-details.html?id=${encodeURIComponent(u.id)}" class="btn btn-secondary btn-sm">Review</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--color-danger); text-align: center;">Failed to load users.</td></tr>`;
  }
}

async function loadPendingJobs() {
  const container = document.getElementById('admin-pending-jobs-list');
  if (!container) return;
  try {
    const res = await apiClient.get('/admin/jobs?status=pending&limit=5');
    const pending = Array.isArray(res) ? res : (res.items || []);

    if (pending.length === 0) {
      container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No jobs awaiting review.</p>`;
      return;
    }

    container.innerHTML = pending.map(j => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light);">
        <div>
          <div style="font-weight: 700; font-size: var(--font-size-sm);">${escapeHtml(j.title)}</div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${escapeHtml(j.company)} · Posted by ${escapeHtml(j.postedByName || j.posted_by_name || 'Alumnus')}</div>
        </div>
        <a href="${getRelativeRoot()}pages/admin/jobs.html" class="btn btn-secondary btn-sm">Review</a>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--color-danger);">Failed to load jobs.</p>`;
  }
}

async function loadRecentDonations() {
  const container = document.getElementById('admin-recent-donations-list');
  if (!container) return;
  try {
    const res = await apiClient.get('/donations?limit=5');
    const items = Array.isArray(res) ? res : (res.items || []);

    if (items.length === 0) {
      container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No donations recorded yet.</p>`;
      return;
    }

    container.innerHTML = items.slice(0, 5).map(d => {
      const donorName = d.isAnonymous || d.is_anonymous ? `${escapeHtml(d.userName || d.user_name || 'Donor')} (Anonymous)` : escapeHtml(d.userName || d.user_name || 'Donor');
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light);">
          <div>
            <div style="font-weight: 700; font-size: var(--font-size-sm);">${donorName}</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${escapeHtml(d.purpose)}</div>
          </div>
          <div style="font-weight: 800; color: var(--color-primary);">${Number(d.amount).toLocaleString()} BDT</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--color-danger);">Failed to load donations.</p>`;
  }
}
