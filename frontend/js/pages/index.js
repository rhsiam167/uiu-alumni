// Landing Page Logic
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { renderEventCard } from '../components/cards.js';
import { apiClient } from '../api/client.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('home');
  renderFooter();

  // Fetch real statistics
  try {
    const stats = await apiClient.get('/users/stats');
    document.getElementById('stat-alumni').textContent = stats.totalAlumni != null ? stats.totalAlumni.toLocaleString() : '—';
    document.getElementById('stat-students').textContent = stats.totalStudents != null ? stats.totalStudents.toLocaleString() : '—';
    document.getElementById('stat-jobs').textContent = stats.activeJobs != null ? stats.activeJobs.toLocaleString() : '—';
    document.getElementById('stat-events').textContent = stats.upcomingEvents != null ? stats.upcomingEvents.toLocaleString() : '—';
  } catch (err) {
    console.error('Failed to load stats:', err);
  }

  // Fetch upcoming events (max 3)
  const eventsGrid = document.getElementById('landing-events-grid');
  try {
    const events = await apiClient.get('/events');
    const upcoming = (events || []).slice(0, 3);

    if (upcoming.length === 0) {
      eventsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-title">No upcoming events right now</div>
          <p>Check back later for new events organized by UIU.</p>
        </div>
      `;
    } else {
      eventsGrid.innerHTML = upcoming.map(ev => renderEventCard(ev)).join('');
    }
  } catch (err) {
    eventsGrid.innerHTML = `<p style="color: var(--color-danger); text-align: center;">Failed to load events.</p>`;
  }
});
