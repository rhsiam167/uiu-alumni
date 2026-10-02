// Events Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { renderEventCard } from '../components/cards.js';
import { getIcon, formatDate, getRelativeRoot } from '../utils.js';

let allEvents = [];
let currentUser = null;
let currentPage = 1;
const EVENTS_PER_PAGE = 6;

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('events');
  renderFooter();

  currentUser = auth.getCurrentUser();
  if (currentUser && currentUser.role === 'admin') {
    const adminBtn = document.getElementById('admin-create-event-wrapper');
    if (adminBtn) adminBtn.style.display = 'block';
  }

  await loadEvents();

  const searchInput = document.getElementById('events-search-input');
  const typeFilter = document.getElementById('events-type-filter');
  const dateFilter = document.getElementById('events-date-filter');
  const sortSelect = document.getElementById('events-sort-select');
  const clearBtn = document.getElementById('events-clear-all');

  const applyFilters = () => {
    currentPage = 1;
    const q = searchInput.value.toLowerCase().trim();
    const type = typeFilter.value;
    const dateOpt = dateFilter.value;
    const sort = sortSelect.value;

    const now = new Date();

    let filtered = allEvents.filter(ev => {
      const matchQ = !q || ev.title.toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q) || (ev.venue || '').toLowerCase().includes(q);
      const matchType = !type || ev.type === type;
      
      let matchDate = true;
      if (dateOpt === 'this-month') {
        const evD = new Date(ev.date);
        matchDate = evD.getMonth() === now.getMonth() && evD.getFullYear() === now.getFullYear();
      } else if (dateOpt === 'upcoming') {
        matchDate = new Date(ev.date) >= now;
      }

      return matchQ && matchType && matchDate;
    });

    if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderEventsList(filtered);
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyFilters);
  if (dateFilter) dateFilter.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      typeFilter.value = '';
      dateFilter.value = '';
      sortSelect.value = 'newest';
      applyFilters();
    });
  }
});

async function loadEvents() {
  try {
    const events = await apiClient.get('/events');
    allEvents = events || [];
    renderFeaturedBanner(allEvents);
    renderEventsList(allEvents);
  } catch (err) {
    const container = document.getElementById('events-grid');
    if (container) container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Failed to load events</div></div>`;
  }
}

function renderFeaturedBanner(events) {
  const container = document.getElementById('featured-event-container');
  if (!container) return;

  const now = new Date();
  // Find nearest upcoming event
  const upcoming = [...events].filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const featured = upcoming[0] || events[0];

  if (!featured) {
    container.innerHTML = '';
    return;
  }

  const root = getRelativeRoot();

  container.innerHTML = `
    <div class="featured-event-banner">
      <div style="position: relative; z-index: 2; max-width: 720px;">
        <span class="chip chip-primary" style="background: rgba(255,87,34,0.25); color: #FF7043; border-color: rgba(255,87,34,0.4); font-weight: 700; margin-bottom: var(--space-4); display: inline-flex; align-items: center; gap: 4px;">
          ${getIcon('star')} FEATURED EVENT
        </span>
        <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.5rem); font-weight: 800; color: #FFFFFF; margin-bottom: var(--space-4); line-height: 1.2;">
          ${featured.title}
        </h2>
        
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: var(--font-size-sm); color: #CBD5E1; margin-bottom: var(--space-6);">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${getIcon('calendar')} <span>${formatDate(featured.date)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${getIcon('clock')} <span>${featured.time}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${getIcon('mapPin')} <span>${featured.venue}</span>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <a href="${root}pages/event-details.html?id=${featured.id}" class="btn btn-primary btn-lg" style="border-radius: var(--radius-full);">
            View Details
          </a>
          <button id="download-ics-btn" class="btn btn-secondary btn-lg" style="background: rgba(255,255,255,0.12); color: #FFFFFF; border-color: rgba(255,255,255,0.2); backdrop-filter: blur(4px); border-radius: var(--radius-full);">
            ${getIcon('calendarPlus')} Add to Calendar
          </button>
        </div>
      </div>

      <div class="featured-event-banner-bg-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
      </div>
    </div>
  `;

  const icsBtn = document.getElementById('download-ics-btn');
  if (icsBtn) {
    icsBtn.addEventListener('click', () => downloadIcsFile(featured));
  }
}

function renderEventsList(events) {
  const container = document.getElementById('events-grid');
  const countEl = document.getElementById('events-count-num');
  const paginationEl = document.getElementById('events-pagination');

  if (countEl) countEl.textContent = events ? events.length : 0;

  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; background: #FFFFFF; padding: var(--space-12); border-radius: var(--radius-xl); border: 1px solid var(--color-border-light);">
        <div class="empty-state-title">No upcoming events found</div>
        <p style="color: var(--color-text-muted);">Try selecting a different filter or date range.</p>
      </div>
    `;
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const pageEvents = events.slice(startIndex, startIndex + EVENTS_PER_PAGE);

  container.innerHTML = pageEvents.map(ev => {
    const isRegistered = !!(currentUser && ev.isRegistered);
    return renderEventCard(ev, { isRegistered });
  }).join('');

  if (paginationEl) {
    if (totalPages > 1) {
      let pageHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        pageHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      paginationEl.innerHTML = pageHtml;
      paginationEl.style.display = 'flex';

      paginationEl.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          currentPage = parseInt(e.target.dataset.page);
          renderEventsList(events);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        });
      });
    } else {
      paginationEl.style.display = 'none';
    }
  }
}

function downloadIcsFile(ev) {
  const title = ev.title || 'UIU Alumni Event';
  const desc = ev.description || '';
  const venue = ev.venue || 'UIU Campus';
  const dateFormatted = (ev.date || '2026-10-15').replace(/-/g, '');
  
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UIU Alumni Portal//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc.replace(/\n/g, ' ')}`,
    `LOCATION:${venue}`,
    `DTSTART:${dateFormatted}T090000Z`,
    `DTEND:${dateFormatted}T170000Z`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
