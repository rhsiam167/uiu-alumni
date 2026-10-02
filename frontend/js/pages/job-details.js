// Job Details & Application Handler
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { formatDate, getRelativeRoot, getIcon } from '../utils.js';
import { showModal, showSuccessModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('jobs');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  if (!jobId) {
    window.location.href = `${getRelativeRoot()}pages/jobs.html`;
    return;
  }

  const container = document.getElementById('job-details-card');
  try {
    const job = await apiClient.get(`/jobs/${jobId}`);

    if (!job) {
      container.innerHTML = `<p>Job not found.</p>`;
      return;
    }

    const currentUser = auth.getCurrentUser();
    // Backend returns hasApplied when user is authenticated
    const hasApplied = currentUser && (job.hasApplied === true);

    container.innerHTML = `
      <div style="border-bottom: 1px solid var(--color-border-light); padding-bottom: var(--space-6); margin-bottom: var(--space-6);">
        <span class="badge badge-alumni" style="margin-bottom: var(--space-2);">Posted by Alumnus</span>
        <h1 style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-text-main);">${job.title}</h1>
        <div style="font-size: var(--font-size-base); font-weight: 600; color: var(--color-primary); margin-top: 4px;">${job.company}</div>
        
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4);">
          <span class="chip">${getIcon('mapPin')} ${job.location}</span>
          <span class="chip">${getIcon('briefcase')} ${job.type}</span>
          <span class="chip">${getIcon('calendar')} Deadline: ${formatDate(job.deadline)}</span>
        </div>
      </div>

      <div style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-2);">Job Description</h3>
        <p style="white-space: pre-line; line-height: 1.6;">${job.description}</p>
      </div>

      <div style="margin-bottom: var(--space-6);">
        <h3 style="font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-2);">Requirements</h3>
        <p style="white-space: pre-line; line-height: 1.6;">${job.requirements}</p>
      </div>

      <div style="background-color: var(--color-bg-subtle); padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-6);">
        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Posted by: 
          <a href="${getRelativeRoot()}pages/profile.html?id=${job.postedBy}" style="font-weight: 600; color: var(--color-primary);">${job.postedByName || 'Alumnus'}</a>
        </div>
        <div style="font-size: var(--font-size-xs); color: var(--color-text-light); margin-top: 2px;">Recruiter Contact: ${job.recruiterEmail}</div>
      </div>

      <div style="text-align: right;">
        ${hasApplied
          ? `<button class="btn btn-secondary btn-lg disabled" disabled style="min-width: 200px; opacity: 0.7; cursor: not-allowed;">
               ${getIcon('check')} Applied
             </button>`
          : `<button id="apply-job-btn" class="btn btn-primary btn-lg" style="min-width: 200px;">
               Apply Now
             </button>`
        }
      </div>
    `;

    if (!hasApplied) {
      document.getElementById('apply-job-btn').addEventListener('click', () => {
        if (!currentUser) {
          const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `${getRelativeRoot()}pages/login.html?redirect=${currentPath}`;
          return;
        }
        openApplyModal(job, currentUser);
      });
    }

  } catch (err) {
    container.innerHTML = `<p style="color: var(--color-danger);">Failed to load job details.</p>`;
  }
});

function openApplyModal(job, user) {
  const content = `
    <form id="job-apply-form">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-control" value="${user.name}" readonly>
      </div>

      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" class="form-control" value="${user.email}" readonly>
      </div>

      <div class="form-group">
        <label class="form-label">Upload CV (PDF only, max 5 MB) <span class="required">*</span></label>
        <input type="file" id="apply-cv" class="form-control" accept=".pdf" required>
        <div class="form-hint">Accepted file type: PDF (.pdf)</div>
      </div>

      <div class="form-group">
        <label class="form-label">Portfolio URL</label>
        <input type="url" id="apply-portfolio" class="form-control" value="${user.portfolio || ''}" placeholder="https://portfolio.dev">
      </div>

      <div class="form-group">
        <label class="form-label">GitHub URL</label>
        <input type="url" id="apply-github" class="form-control" value="${user.github || ''}" placeholder="https://github.com/username">
      </div>

      <div class="form-group">
        <label class="form-label">Cover Note / Message to Recruiter</label>
        <textarea id="apply-note" class="form-control" rows="3" placeholder="Brief statement about why you are a great fit..."></textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button id="close-apply-modal" class="btn btn-secondary">Cancel</button>
    <button id="submit-apply-modal" class="btn btn-primary">Submit Application</button>
  `;

  const modal = showModal({ title: `Apply for ${job.title}`, content, footerHtml });

  document.getElementById('close-apply-modal').addEventListener('click', () => modal.close());

  document.getElementById('submit-apply-modal').addEventListener('click', async () => {
    const fileInput = document.getElementById('apply-cv');
    const file = fileInput.files[0];

    if (!file) {
      showToast('Please attach your CV in PDF format.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5 MB limit.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('cv', file);
      if (document.getElementById('apply-portfolio').value.trim()) {
        formData.append('portfolio', document.getElementById('apply-portfolio').value.trim());
      }
      if (document.getElementById('apply-github').value.trim()) {
        formData.append('github', document.getElementById('apply-github').value.trim());
      }
      if (document.getElementById('apply-note').value.trim()) {
        formData.append('coverNote', document.getElementById('apply-note').value.trim());
      }

      await apiClient.postForm(`/jobs/${job.id}/apply`, formData);

      modal.close();

      showSuccessModal({
        title: 'Application Submitted!',
        message: `Your application details and CV have been recorded and sent to the recruiter at ${job.recruiterEmail}.`,
        buttonText: 'Back to Jobs',
        onConfirm: () => {
          window.location.href = `${getRelativeRoot()}pages/jobs.html`;
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to submit application.', 'error');
    }
  });
}
