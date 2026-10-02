// Admin Event Form Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { showToast } from '../../components/toast.js';
import { getRelativeRoot } from '../../utils.js';

let editingEventId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.requireRole('admin')) return;

  renderNavbar('admin-events');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  editingEventId = urlParams.get('id');

  if (editingEventId) {
    document.getElementById('event-form-page-title').textContent = 'Edit Event';
    await loadEventData(editingEventId);
  }

  const form = document.getElementById('event-admin-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('ef-title').value.trim();
    const type = document.getElementById('ef-type').value;
    const rawCapacity = document.getElementById('ef-capacity').value;
    const capacity = rawCapacity !== '' ? Number(rawCapacity) : null;
    const date = document.getElementById('ef-date').value;
    const time = document.getElementById('ef-time').value.trim();
    const venue = document.getElementById('ef-venue').value.trim();
    const description = document.getElementById('ef-description').value.trim();

    const payload = { title, type, capacity, date, time, venue, description };

    try {
      if (editingEventId) {
        await apiClient.put(`/events/${editingEventId}`, payload);
      } else {
        await apiClient.post('/events', payload);
      }

      showToast('Event saved successfully!', 'success');
      window.location.href = `${getRelativeRoot()}pages/admin/events.html`;
    } catch (err) {
      showToast(err.message || 'Failed to save event', 'danger');
    }
  });
});

async function loadEventData(id) {
  try {
    const ev = await apiClient.get(`/events/${id}`);
    if (!ev) return;

    document.getElementById('ef-title').value = ev.title || '';
    document.getElementById('ef-type').value = ev.type || 'In-Person';
    document.getElementById('ef-capacity').value = ev.capacity ?? '';
    document.getElementById('ef-date').value = ev.date || '';
    document.getElementById('ef-time').value = ev.time || '';
    document.getElementById('ef-venue').value = ev.venue || '';
    document.getElementById('ef-description').value = ev.description || '';
  } catch (err) {
    showToast(err.message || 'Failed to load event details', 'danger');
  }
}
