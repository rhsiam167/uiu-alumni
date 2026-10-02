// Admin Events Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { formatDate, getRelativeRoot } from '../../utils.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/modal.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireRole('admin')) return;

  renderNavbar('admin-events');
  renderFooter();

  loadEvents();
});

async function loadEvents() {
  const tbody = document.getElementById('admin-events-tbody');
  try {
    const events = await apiClient.get('/events');

    if (!events || events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">No events found.</td></tr>`;
      return;
    }

    tbody.innerHTML = events.map(e => `
      <tr>
        <td style="font-weight: 700;">${e.title}</td>
        <td>${formatDate(e.date)} · ${e.time || ''}</td>
        <td>${e.venue}</td>
        <td><span class="badge badge-alumni">${e.type || 'Event'}</span></td>
        <td><strong>${e.registeredCount || 0}</strong> ${e.capacity ? `/ ${e.capacity}` : ''}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: var(--space-2); justify-content: flex-end;">
            <a href="${getRelativeRoot()}pages/admin/event-registrations.html?id=${e.id}" class="btn btn-secondary btn-sm">Registrants</a>
            <a href="${getRelativeRoot()}pages/admin/event-form.html?id=${e.id}" class="btn btn-outline btn-sm">Edit</a>
            <button class="btn btn-ghost btn-sm action-delete-event" data-id="${e.id}" style="color: var(--color-danger);">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.action-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showConfirmModal({
          title: 'Delete Event',
          message: 'Are you sure you want to delete this event?',
          confirmText: 'Delete',
          onConfirm: async () => {
            try {
              await apiClient.delete(`/events/${id}`);
              showToast('Event deleted.', 'info');
              loadEvents();
            } catch (err) {
              showToast(err.message || 'Failed to delete event', 'danger');
            }
          }
        });
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger);">${err.message || 'Failed to load events.'}</td></tr>`;
  }
}
