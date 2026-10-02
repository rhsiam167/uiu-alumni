// Settings Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { validatePassword, validateMatch } from '../validators.js';
import { formatDate, escapeHtml } from '../utils.js';

let currentUser = null;

function getUpdatePayload(overrides = {}) {
  const payload = {
    name: overrides.name !== undefined ? overrides.name : (currentUser.name || ''),
    phone: overrides.phone !== undefined ? overrides.phone : (currentUser.phone || ''),
    city: overrides.city !== undefined ? overrides.city : (currentUser.city || ''),
    bio: overrides.bio !== undefined ? overrides.bio : (currentUser.bio || ''),
    department: overrides.department !== undefined ? overrides.department : (currentUser.department || ''),
    program: overrides.program !== undefined ? overrides.program : (currentUser.program || ''),
    graduationYear: overrides.graduationYear !== undefined ? overrides.graduationYear : (currentUser.graduationYear ?? null),
    currentSemester: overrides.currentSemester !== undefined ? overrides.currentSemester : (currentUser.currentSemester || ''),
    expectedGraduation: overrides.expectedGraduation !== undefined ? overrides.expectedGraduation : (currentUser.expectedGraduation ?? null),
    company: overrides.company !== undefined ? overrides.company : (currentUser.company || ''),
    jobTitle: overrides.jobTitle !== undefined ? overrides.jobTitle : (currentUser.jobTitle || ''),
    github: overrides.github !== undefined ? overrides.github : (currentUser.github || ''),
    linkedin: overrides.linkedin !== undefined ? overrides.linkedin : (currentUser.linkedin || ''),
    portfolio: overrides.portfolio !== undefined ? overrides.portfolio : (currentUser.portfolio || ''),
    website: overrides.website !== undefined ? overrides.website : (currentUser.website || ''),
    mentorExpertise: overrides.mentorExpertise !== undefined ? overrides.mentorExpertise : (currentUser.mentorExpertise || []),
    careerTimeline: overrides.careerTimeline !== undefined ? overrides.careerTimeline : (currentUser.careerTimeline || [])
  };

  if (currentUser.role === 'alumni') {
    payload.willingToMentor = overrides.willingToMentor !== undefined ? overrides.willingToMentor : !!currentUser.willingToMentor;
  }

  return payload;
}

function handleSaveError(err, fallbackMsg) {
  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    const msgs = err.details.map(d => `${d.field}: ${d.message}`).join(', ');
    showToast(msgs, 'error');
  } else {
    showToast(err.message || fallbackMsg, 'error');
  }
}

function normalizeDateInput(val) {
  if (!val || val === 'Present') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{4}-\d{2}$/.test(val)) return `${val}-01`;
  if (/^\d{4}$/.test(val)) return `${val}-01-01`;
  return '';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireAuth()) return;
  currentUser = auth.getCurrentUser();

  renderNavbar('settings');
  renderFooter();

  if (currentUser.role !== 'alumni') {
    document.getElementById('mentorship-settings-tab-btn').style.display = 'none';
  }

  populateFormData();

  // Tab switching
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  const panels = document.querySelectorAll('.settings-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-tab');
      panels.forEach(p => p.style.display = 'none');
      document.getElementById(`set-tab-${target}`).style.display = 'block';

      if (target === 'career') loadCareerTimeline();
    });
  });

  // 1. Personal Form
  document.getElementById('form-personal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getUpdatePayload({
      name: document.getElementById('set-name').value.trim(),
      phone: document.getElementById('set-phone').value.trim(),
      city: document.getElementById('set-city').value.trim(),
      bio: document.getElementById('set-bio').value.trim()
    });

    try {
      const res = await apiClient.put(`/users/${currentUser.id}`, payload);
      currentUser = res.user || res;
      auth.setCurrentUser(currentUser);
      populateFormData();
      showToast('Personal information updated!', 'success');
    } catch (err) {
      handleSaveError(err, 'Failed to update personal settings.');
    }
  });

  // 4. Links Form
  document.getElementById('form-links').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = getUpdatePayload({
      linkedin: document.getElementById('set-linkedin').value.trim(),
      github: document.getElementById('set-github').value.trim(),
      portfolio: document.getElementById('set-portfolio').value.trim()
    });

    try {
      const res = await apiClient.put(`/users/${currentUser.id}`, payload);
      currentUser = res.user || res;
      auth.setCurrentUser(currentUser);
      populateFormData();
      showToast('Links updated!', 'success');
    } catch (err) {
      handleSaveError(err, 'Failed to update links.');
    }
  });

  // 5. Mentorship Form (Alumni)
  document.getElementById('form-mentorship').addEventListener('submit', async (e) => {
    e.preventDefault();
    const expText = document.getElementById('set-expertise').value;
    const payload = getUpdatePayload({
      willingToMentor: document.getElementById('set-willing-mentor').checked,
      mentorExpertise: expText.split(',').map(s => s.trim()).filter(Boolean)
    });

    try {
      const res = await apiClient.put(`/users/${currentUser.id}`, payload);
      currentUser = res.user || res;
      auth.setCurrentUser(currentUser);
      populateFormData();
      showToast('Mentorship settings saved!', 'success');
    } catch (err) {
      handleSaveError(err, 'Failed to update mentorship settings.');
    }
  });

  // 6. Password Form
  document.getElementById('form-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currPass = document.getElementById('set-curr-pass').value;
    const newPass = document.getElementById('set-new-pass').value;
    const confirmPass = document.getElementById('set-confirm-new-pass').value;

    const passErr = validatePassword(newPass);
    const matchErr = validateMatch(newPass, confirmPass, 'New Passwords');

    if (passErr || matchErr) {
      showToast(passErr || matchErr, 'error');
      return;
    }

    try {
      await apiClient.put('/auth/password', { currentPassword: currPass, newPassword: newPass });
      showToast('Password updated successfully!', 'success');
      document.getElementById('form-password').reset();
    } catch (err) {
      handleSaveError(err, 'Failed to change password.');
    }
  });

  // Add timeline entry button listener
  document.getElementById('add-timeline-entry-btn').addEventListener('click', () => {
    openTimelineModal();
  });
});

function populateFormData() {
  document.getElementById('set-name').value = currentUser.name || '';
  document.getElementById('set-phone').value = currentUser.phone || '';
  document.getElementById('set-city').value = currentUser.city || '';
  document.getElementById('set-bio').value = currentUser.bio || '';

  document.getElementById('set-studentid').value = currentUser.studentId || '';
  document.getElementById('set-dept').value = currentUser.department || '';
  document.getElementById('set-program').value = currentUser.program || '';

  document.getElementById('set-linkedin').value = currentUser.linkedin || '';
  document.getElementById('set-github').value = currentUser.github || '';
  document.getElementById('set-portfolio').value = currentUser.portfolio || '';

  if (currentUser.role === 'alumni') {
    document.getElementById('set-willing-mentor').checked = !!currentUser.willingToMentor;
    document.getElementById('set-expertise').value = (currentUser.mentorExpertise || []).join(', ');
  }
}

function loadCareerTimeline() {
  const container = document.getElementById('settings-timeline-list');
  const items = currentUser.careerTimeline || [];

  if (items.length === 0) {
    container.innerHTML = `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No career entries added yet.</p>`;
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border-light);">
      <div>
        <div style="font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-main);">${escapeHtml(item.title)}</div>
        <div style="font-size: var(--font-size-sm); color: var(--color-primary); font-weight: 600;">${escapeHtml(item.organization)} (${formatDate(item.startDate)} - ${item.endDate === 'Present' || !item.endDate ? 'Present' : formatDate(item.endDate)})</div>
        ${item.description ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(item.description)}</div>` : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-outline btn-sm edit-timeline-btn" data-idx="${idx}">Edit</button>
        <button class="btn btn-ghost btn-sm remove-timeline-btn" data-idx="${idx}" style="color: var(--color-danger);">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.edit-timeline-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      openTimelineModal(items[idx], idx);
    });
  });

  container.querySelectorAll('.remove-timeline-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const updatedTimeline = [...items];
      updatedTimeline.splice(idx, 1);

      const payload = getUpdatePayload({ careerTimeline: updatedTimeline });

      try {
        const res = await apiClient.put(`/users/${currentUser.id}`, payload);
        currentUser = res.user || res;
        auth.setCurrentUser(currentUser);
        showToast('Entry deleted.', 'info');
        loadCareerTimeline();
      } catch (err) {
        handleSaveError(err, 'Failed to delete timeline entry.');
      }
    });
  });
}

function openTimelineModal(existingItem = null, editIdx = null) {
  const isEdit = editIdx !== null && existingItem !== null;
  const startVal = normalizeDateInput(existingItem ? existingItem.startDate : '');
  const endVal = normalizeDateInput(existingItem ? existingItem.endDate : '');

  const content = `
    <form id="timeline-entry-form" onsubmit="return false;">
      <div id="te-error-box" style="display: none; padding: var(--space-2) var(--space-3); background: #FEE2E2; color: #DC2626; border-radius: var(--radius-md); font-size: var(--font-size-xs); margin-bottom: var(--space-3);"></div>

      <div class="form-group">
        <label class="form-label">Type <span class="required">*</span></label>
        <select id="te-type" class="form-control" required>
          <option value="Work" ${existingItem && existingItem.type === 'Work' ? 'selected' : ''}>Work Experience</option>
          <option value="Internship" ${existingItem && existingItem.type === 'Internship' ? 'selected' : ''}>Internship</option>
          <option value="Education" ${existingItem && existingItem.type === 'Education' ? 'selected' : ''}>Education</option>
          <option value="Other" ${existingItem && existingItem.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        <div id="err-te-type" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Title / Degree <span class="required">*</span></label>
        <input type="text" id="te-title" class="form-control" placeholder="e.g. Senior Software Engineer" value="${escapeHtml(existingItem ? existingItem.title : '')}" required>
        <div id="err-te-title" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Organization / University <span class="required">*</span></label>
        <input type="text" id="te-org" class="form-control" placeholder="e.g. TechCorp Solutions" value="${escapeHtml(existingItem ? existingItem.organization : '')}" required>
        <div id="err-te-org" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
        <div class="form-group">
          <label class="form-label">Start Date <span class="required">*</span></label>
          <input type="date" id="te-start" class="form-control" value="${startVal}" required>
          <div id="err-te-start" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
        </div>

        <div class="form-group">
          <label class="form-label">End Date (or blank for Present)</label>
          <input type="date" id="te-end" class="form-control" value="${endVal}">
          <div id="err-te-end" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="te-desc" class="form-control" rows="3" placeholder="Key achievements and responsibilities...">${escapeHtml(existingItem ? existingItem.description : '')}</textarea>
        <div id="err-te-desc" class="invalid-feedback" style="font-size: 11px; color: var(--color-danger);"></div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button id="close-te-modal" class="btn btn-secondary">Cancel</button>
    <button id="save-te-modal" class="btn btn-primary">${isEdit ? 'Update Entry' : 'Save Entry'}</button>
  `;

  const modal = showModal({ title: isEdit ? 'Edit Career Timeline Entry' : 'Add Career Timeline Entry', content, footerHtml });

  document.getElementById('close-te-modal').addEventListener('click', () => modal.close());

  document.getElementById('save-te-modal').addEventListener('click', async () => {
    // Clear previous inline errors
    document.querySelectorAll('#timeline-entry-form .invalid-feedback').forEach(el => el.textContent = '');
    const errorBox = document.getElementById('te-error-box');
    if (errorBox) errorBox.style.display = 'none';

    const title = document.getElementById('te-title').value.trim();
    const organization = document.getElementById('te-org').value.trim();
    const startDate = document.getElementById('te-start').value;
    const endDateRaw = document.getElementById('te-end').value;

    let hasErr = false;
    if (!title) {
      document.getElementById('err-te-title').textContent = 'Title is required.';
      hasErr = true;
    }
    if (!organization) {
      document.getElementById('err-te-org').textContent = 'Organization is required.';
      hasErr = true;
    }
    if (!startDate) {
      document.getElementById('err-te-start').textContent = 'Start date is required.';
      hasErr = true;
    }

    if (startDate && endDateRaw && endDateRaw < startDate) {
      document.getElementById('err-te-end').textContent = 'End date cannot be earlier than start date.';
      hasErr = true;
    }

    if (hasErr) return;

    const endDate = endDateRaw || 'Present';
    const entryData = {
      type: document.getElementById('te-type').value,
      title,
      organization,
      startDate,
      endDate,
      description: document.getElementById('te-desc').value.trim()
    };
    if (isEdit && existingItem.id) {
      entryData.id = existingItem.id;
    }

    const currentTimeline = [...(currentUser.careerTimeline || [])];
    if (isEdit) {
      currentTimeline[editIdx] = entryData;
    } else {
      currentTimeline.push(entryData);
    }

    const payload = getUpdatePayload({ careerTimeline: currentTimeline });

    try {
      const res = await apiClient.put(`/users/${currentUser.id}`, payload);
      currentUser = res.user || res;
      auth.setCurrentUser(currentUser);
      modal.close();
      showToast(isEdit ? 'Timeline entry updated!' : 'Timeline entry added!', 'success');
      loadCareerTimeline();
    } catch (err) {
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        err.details.forEach(d => {
          if (d.field) {
            // e.g. careerTimeline.0.startDate -> err-te-start
            if (d.field.includes('startDate')) document.getElementById('err-te-start').textContent = d.message;
            else if (d.field.includes('endDate')) document.getElementById('err-te-end').textContent = d.message;
            else if (d.field.includes('title')) document.getElementById('err-te-title').textContent = d.message;
            else if (d.field.includes('organization')) document.getElementById('err-te-org').textContent = d.message;
          }
        });
        if (errorBox) {
          errorBox.textContent = err.message || 'Please fix validation errors.';
          errorBox.style.display = 'block';
        }
      } else {
        if (errorBox) {
          errorBox.textContent = err.message || 'Failed to save timeline entry.';
          errorBox.style.display = 'block';
        } else {
          showToast(err.message || 'Failed to save timeline entry.', 'error');
        }
      }
    }
  });
}
