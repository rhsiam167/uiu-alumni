// Admin Jobs Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { formatDate } from '../../utils.js';
import { showToast } from '../../components/toast.js';
import { showModal } from '../../components/modal.js';

let allJobs = [];
let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', async () => {
  if (!await auth.requireRole('admin')) return;

  renderNavbar('admin-jobs');
  renderFooter();

  await loadJobs();

  const statusFilter = document.getElementById('admin-jobs-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      const filtered = currentStatusFilter ? allJobs.filter(j => j.status === currentStatusFilter) : allJobs;
      renderTable(filtered);
    });
  }
});

async function loadJobs() {
  const tbody = document.getElementById('admin-jobs-tbody');
  try {
    const res = await apiClient.get('/admin/jobs?limit=100');
    allJobs = res.items || res || [];
    const filtered = currentStatusFilter ? allJobs.filter(j => j.status === currentStatusFilter) : allJobs;
    renderTable(filtered);
  } catch (err) {
    console.error('Failed to load jobs:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-danger);">Failed to load jobs: ${err.message}</td></tr>`;
  }
}

function renderTable(jobs) {
  const tbody = document.getElementById('admin-jobs-tbody');
  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">No job listings found.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(j => `
    <tr>
      <td style="font-weight: 700;">${j.title}</td>
      <td>${j.company}</td>
      <td>${j.postedByName || 'Alumnus'}</td>
      <td><span class="badge" style="background-color: #F1F5F9;">${j.type}</span></td>
      <td><span class="badge badge-${j.status}">${j.status}</span></td>
      <td>${formatDate(j.createdAt)}</td>
      <td style="text-align: right;">
        <div style="display: flex; gap: var(--space-2); justify-content: flex-end;">
          ${j.status !== 'approved' ? `<button class="btn btn-success btn-sm action-approve" data-id="${j.id}">Approve</button>` : ''}
          ${j.status !== 'rejected' ? `<button class="btn btn-danger btn-sm action-reject" data-id="${j.id}">Reject</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.action-approve').forEach(btn => {
    btn.addEventListener('click', () => updateJobStatus(btn.getAttribute('data-id'), 'approved'));
  });

  tbody.querySelectorAll('.action-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const jobId = btn.getAttribute('data-id');
      promptRejectionReason(reason => updateJobStatus(jobId, 'rejected', reason));
    });
  });
}

function promptRejectionReason(onConfirm) {
  const content = `
    <div class="form-group">
      <label class="form-label">Rejection Reason <span class="required">*</span></label>
      <textarea id="job-rejection-reason-text" class="form-control" rows="3" placeholder="Enter reason for rejecting job posting..."></textarea>
    </div>
  `;
  const footerHtml = `
    <button id="cancel-job-rej-modal" class="btn btn-secondary">Cancel</button>
    <button id="submit-job-rej-modal" class="btn btn-danger">Confirm Rejection</button>
  `;
  const modal = showModal({ title: 'Reject Job Posting', content, footerHtml });

  document.getElementById('cancel-job-rej-modal').addEventListener('click', () => modal.close());
  document.getElementById('submit-job-rej-modal').addEventListener('click', () => {
    const reason = document.getElementById('job-rejection-reason-text').value.trim();
    if (!reason) {
      showToast('A rejection reason is required.', 'error');
      return;
    }
    modal.close();
    onConfirm(reason);
  });
}

async function updateJobStatus(jobId, status, reason = null) {
  try {
    await apiClient.put(`/admin/jobs/${jobId}`, { status, reason });
    showToast(`Job status set to ${status}.`, 'success');
    await loadJobs();
  } catch (err) {
    console.error('Update job error:', err);
    showToast(err.message || 'Failed to update job.', 'error');
  }
}
