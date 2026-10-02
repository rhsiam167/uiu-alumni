// Post Job Page Handler
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { showSuccessModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getRelativeRoot } from '../utils.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireRole('alumni')) return;
  const user = auth.getCurrentUser();

  renderNavbar('jobs');
  renderFooter();

  // Prefill recruiter email if available
  document.getElementById('pj-email').value = user.email;

  const form = document.getElementById('post-job-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      title: document.getElementById('pj-title').value.trim(),
      company: document.getElementById('pj-company').value.trim(),
      location: document.getElementById('pj-location').value.trim(),
      type: document.getElementById('pj-type').value,
      recruiterEmail: document.getElementById('pj-email').value.trim(),
      deadline: document.getElementById('pj-deadline').value,
      salary: document.getElementById('pj-salary').value.trim(),
      description: document.getElementById('pj-description').value.trim(),
      requirements: document.getElementById('pj-requirements').value.trim(),
      postedBy: user.id,
      postedByName: user.name,
      postedByCompany: user.company || user.name
    };

    const submitBtn = document.getElementById('pj-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await apiClient.post('/jobs', payload);

      showSuccessModal({
        title: 'Job Submitted for Review',
        message: 'Thank you! Your job posting has been submitted and is currently awaiting administrator review. Once approved, it will be published to the public jobs portal.',
        buttonText: 'Return to Jobs Portal',
        onConfirm: () => {
          window.location.href = `${getRelativeRoot()}pages/jobs.html`;
        }
      });
    } catch (err) {
      showToast('Failed to post job. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit for Review';
    }
  });
});
