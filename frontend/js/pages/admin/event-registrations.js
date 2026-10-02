// Admin Event Registrations Script
import { renderNavbar } from '../../components/navbar.js';
import { renderFooter } from '../../components/footer.js';
import { auth } from '../../auth.js';
import { apiClient } from '../../api/client.js';
import { formatDate, getRelativeRoot } from '../../utils.js';
import { showToast } from '../../components/toast.js';

let currentEventId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.requireRole('admin')) return;

  renderNavbar('admin-events');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  currentEventId = urlParams.get('id');

  if (!currentEventId) {
    window.location.href = `${getRelativeRoot()}pages/admin/events.html`;
    return;
  }

  loadRegistrants(currentEventId);

  document.getElementById('er-export-csv-btn').addEventListener('click', () => {
    exportToCSV();
  });
});

async function loadRegistrants(eventId) {
  const tbody = document.getElementById('er-registrants-tbody');

  try {
    const event = await apiClient.get(`/events/${eventId}`);
    document.getElementById('er-event-title').textContent = event.title;

    const data = await apiClient.get(`/events/${eventId}/registrations`);
    const registrants = data.items || [];

    document.getElementById('er-event-meta').textContent = `${formatDate(event.date)} · ${event.time || ''} | ${event.venue} (${registrants.length} Registered)`;

    if (registrants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">No attendees registered for this event yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = registrants.map(u => `
      <tr>
        <td style="font-weight: 700;">${u.name}</td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td>${u.studentId || 'N/A'}</td>
        <td>${u.department || 'N/A'}</td>
        <td>${u.email}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast(err.message || 'Failed to load registrants', 'danger');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-danger);">${err.message || 'Error loading registrants.'}</td></tr>`;
  }
}

function exportToCSV() {
  if (!currentEventId) return;
  // Trigger file download using window.open or dynamic link to backend CSV export route
  window.open(`${apiClient.defaults ? apiClient.defaults.baseURL : '/api'}/events/${currentEventId}/registrations.csv`, '_blank');
}
