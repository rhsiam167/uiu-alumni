// Jobs Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { renderJobCard } from '../components/cards.js';
import { formatDate, getRelativeRoot, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmModal } from '../components/modal.js';

let allJobs = [];
let myJobs = [];
let currentUser = null;
let activeTab = 'all'; // 'all' | 'mine'

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('jobs');
  renderFooter();

  currentUser = auth.getCurrentUser();
  const postBtn = document.getElementById('post-job-btn-wrapper');
  const toggleMyPostsBtn = document.getElementById('toggle-my-posts-btn');

  if (currentUser && currentUser.role === 'alumni') {
    if (postBtn) postBtn.style.display = 'block';
    if (toggleMyPostsBtn) {
      toggleMyPostsBtn.addEventListener('click', async () => {
        if (activeTab === 'all') {
          activeTab = 'mine';
          toggleMyPostsBtn.textContent = 'All Jobs';
          toggleMyPostsBtn.classList.remove('btn-outline');
          toggleMyPostsBtn.classList.add('btn-secondary');
          await loadMyJobs();
        } else {
          activeTab = 'all';
          toggleMyPostsBtn.textContent = 'My Posts';
          toggleMyPostsBtn.classList.remove('btn-secondary');
          toggleMyPostsBtn.classList.add('btn-outline');
          renderJobs(allJobs);
        }
      });
    }
  }

  await loadJobs();

  const searchInput = document.getElementById('jobs-search-input');
  const locationInput = document.getElementById('jobs-location-input');
  const applyBtn = document.getElementById('jobs-apply-filters-btn');
  const clearBtn = document.getElementById('jobs-clear-all');
  const sortSelect = document.getElementById('jobs-sort-select');

  const getSelectedJobType = () => {
    const checked = document.querySelector('input[name="jobType"]:checked');
    return checked ? checked.value : '';
  };

  const applyFilters = () => {
    if (activeTab === 'mine') return;

    const q = searchInput.value.toLowerCase().trim();
    const type = getSelectedJobType();
    const loc = locationInput.value.toLowerCase().trim();
    const sort = sortSelect.value;

    let filtered = allJobs.filter(j => {
      const matchQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
      const matchType = !type || j.type === type;
      const matchLoc = !loc || j.location.toLowerCase().includes(loc);
      return matchQ && matchType && matchLoc;
    });

    if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderJobs(filtered);
  };

  if (applyBtn) applyBtn.addEventListener('click', applyFilters);
  if (searchInput) searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });
  if (locationInput) locationInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') applyFilters(); });
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  document.querySelectorAll('input[name="jobType"]').forEach(radio => {
    radio.addEventListener('change', applyFilters);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      locationInput.value = '';
      const defaultRadio = document.querySelector('input[name="jobType"][value=""]');
      if (defaultRadio) defaultRadio.checked = true;
      sortSelect.value = 'recent';
      if (activeTab === 'mine') {
        renderMyJobs(myJobs);
      } else {
        renderJobs(allJobs);
      }
    });
  }
});

async function loadJobs() {
  const container = document.getElementById('jobs-grid');
  try {
    const jobs = await apiClient.get('/jobs');
    allJobs = (jobs || []).filter(j => j.status === 'approved');
    if (activeTab === 'all') {
      renderJobs(allJobs);
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Failed to load jobs</div></div>`;
  }
}

async function loadMyJobs() {
  const container = document.getElementById('jobs-grid');
  try {
    const res = await apiClient.get('/jobs/mine');
    myJobs = Array.isArray(res) ? res : (res.items || []);
    renderMyJobs(myJobs);
  } catch (err) {
    console.error('Failed to load my jobs:', err);
    container.innerHTML = `<div class="empty-state" style="background:#FFFFFF; padding:var(--space-8); border-radius:var(--radius-xl);"><div class="empty-state-title">Failed to load your job postings</div></div>`;
  }
}

function renderJobs(jobs) {
  const container = document.getElementById('jobs-grid');
  const countEl = document.getElementById('jobs-count-num');
  const loadMoreWrapper = document.getElementById('jobs-load-more-wrapper');

  if (countEl) countEl.textContent = jobs ? jobs.length : 0;

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background: #FFFFFF; border-radius: var(--radius-xl); padding: var(--space-12) var(--space-6); border: 1px solid var(--color-border-light);">
        <div class="empty-state-title">No opportunities found</div>
        <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">Try adjusting your search criteria or clearing filters.</p>
        <button id="jobs-empty-clear-btn" class="btn btn-secondary">Clear Filters</button>
      </div>
    `;
    const emptyClearBtn = document.getElementById('jobs-empty-clear-btn');
    if (emptyClearBtn) {
      emptyClearBtn.addEventListener('click', () => {
        const clearBtn = document.getElementById('jobs-clear-all');
        if (clearBtn) clearBtn.click();
      });
    }
    if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';
    return;
  }

  container.innerHTML = jobs.map(j => renderJobCard(j, { currentUser })).join('');

  if (loadMoreWrapper) {
    loadMoreWrapper.style.display = jobs.length > 5 ? 'block' : 'none';
  }
}

function renderMyJobs(jobs) {
  const container = document.getElementById('jobs-grid');
  const countEl = document.getElementById('jobs-count-num');
  const loadMoreWrapper = document.getElementById('jobs-load-more-wrapper');
  const root = getRelativeRoot();

  if (countEl) countEl.textContent = jobs ? jobs.length : 0;
  if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background: #FFFFFF; border-radius: var(--radius-xl); padding: var(--space-12) var(--space-6); border: 1px solid var(--color-border-light);">
        <div class="empty-state-title">You haven't posted any jobs yet</div>
        <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">Share career opportunities with UIU students and fellow alumni.</p>
        <a href="${root}pages/post-job.html" class="btn btn-primary">+ Post an Opportunity</a>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs.map(j => {
    const isApproved = j.status === 'approved';
    const isRejected = j.status === 'rejected';
    const appCount = j.applicantsCount !== undefined ? j.applicantsCount : (j.applications || []).length;

    return `
      <div class="card" style="padding: var(--space-6); background: #FFFFFF; border-radius: var(--radius-xl); border: 1px solid var(--color-border-light);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); margin-bottom: var(--space-3);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px;">
              <h3 style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-main); margin: 0;">${escapeHtml(j.title)}</h3>
              <span class="badge badge-${escapeHtml(j.status)}">${escapeHtml(j.status)}</span>
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); font-weight: 500;">
              ${escapeHtml(j.company)} &middot; ${escapeHtml(j.location)} &middot; ${escapeHtml(j.type)}
            </div>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Deadline: ${formatDate(j.deadline)}
          </div>
        </div>

        ${isRejected && j.rejectionReason ? `
          <div style="background: #FEE2E2; color: #991B1B; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-xs); margin-bottom: var(--space-3);">
            <strong>Rejection Reason:</strong> ${escapeHtml(j.rejectionReason)}
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border-light); padding-top: var(--space-4); margin-top: var(--space-3);">
          <div style="font-size: var(--font-size-xs); font-weight: 600; color: var(--color-primary);">
            Applicants: ${appCount}
          </div>

          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <a href="${root}pages/job-details.html?id=${escapeHtml(j.id)}" class="btn btn-secondary btn-sm">View Details</a>
            ${isApproved ? `<button class="btn btn-outline btn-sm action-close-job" data-id="${escapeHtml(j.id)}">Close Posting</button>` : ''}
            <button class="btn btn-ghost btn-sm action-delete-job" data-id="${escapeHtml(j.id)}" style="color: var(--color-danger);">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.action-close-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      const jobId = btn.getAttribute('data-id');
      try {
        await apiClient.put(`/jobs/${jobId}`, { status: 'closed' });
        showToast('Job posting closed.', 'info');
        await loadMyJobs();
        await loadJobs();
      } catch (err) {
        showToast(err.message || 'Failed to close job', 'error');
      }
    });
  });

  container.querySelectorAll('.action-delete-job').forEach(btn => {
    btn.addEventListener('click', () => {
      const jobId = btn.getAttribute('data-id');
      showConfirmModal({
        title: 'Delete Job Posting',
        message: 'Delete this job posting? Applications for it will be deleted too. This cannot be undone.',
        confirmText: 'Delete',
        onConfirm: async () => {
          try {
            await apiClient.delete(`/jobs/${jobId}`);
            showToast('Job posting deleted.', 'info');
            await loadMyJobs();
            await loadJobs();
          } catch (err) {
            showToast(err.message || 'Failed to delete job', 'error');
          }
        }
      });
    });
  });
}
