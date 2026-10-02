// Event Details Page Script
import { renderNavbar } from '../components/navbar.js';
import { renderFooter } from '../components/footer.js';
import { auth } from '../auth.js';
import { apiClient } from '../api/client.js';
import { formatDate, getRelativeRoot, getIcon, escapeHtml } from '../utils.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('events');
  renderFooter();

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  if (!eventId) {
    window.location.href = `${getRelativeRoot()}pages/events.html`;
    return;
  }

  await renderDetails(eventId);
});

// Mutable event state for in-place DOM updates
let _ev = null;

async function renderDetails(eventId) {
  const container = document.getElementById('event-details-card');
  try {
    _ev = await apiClient.get('/events/' + eventId);

    if (!_ev) {
      container.innerHTML = '<p>Event not found.</p>';
      return;
    }

    container.innerHTML = buildHtml(_ev);
    bindBtn(container);

  } catch (err) {
    console.error('Failed to load event details:', err);
    container.innerHTML = '<p style="color: var(--color-danger);">Failed to load event details.</p>';
  }
}

function buildHtml(event) {
  const currentUser = auth.getCurrentUser();
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isRegistered = !!(currentUser && event.isRegistered);
  const count = Number(event.registeredCount || 0);

  let regBadge = '';
  let regBtn = '';

  if (!currentUser) {
    regBtn = '<a href="' + getRelativeRoot() + 'pages/login.html" class="btn btn-primary btn-lg">Login to Register</a>';
  } else if (!isAdmin) {
    if (event.isPast) {
      regBtn = '<button class="btn btn-secondary btn-lg disabled" disabled>This event has ended</button>';
    } else {
      if (isRegistered) {
        regBadge = '<span class="badge badge-approved">' + getIcon('check') + ' You are registered for this event</span>';
      }
      regBtn = '<button id="toggle-event-reg-btn" class="btn ' + (isRegistered ? 'btn-danger' : 'btn-primary') + ' btn-lg">'
        + (isRegistered ? 'Cancel Registration' : 'Register Now') + '</button>';
    }
  }

  return `
    <div style="border-bottom: 1px solid var(--color-border-light); padding-bottom: var(--space-6); margin-bottom: var(--space-6);">
      <span class="badge badge-alumni" style="margin-bottom: var(--space-2);">${escapeHtml(event.type || 'Event')}</span>
      <h1 style="font-size: var(--font-size-2xl); font-weight: 800; color: var(--color-text-main);">${escapeHtml(event.title)}</h1>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-6); background: var(--color-bg-subtle); padding: var(--space-4); border-radius: var(--radius-md);">
        <div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Date &amp; Time</div>
          <div style="font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 4px;">
            ${getIcon('calendar')} <span>${formatDate(event.date)} &middot; ${escapeHtml(event.time || '')}</span>
          </div>
        </div>
        <div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Venue</div>
          <div style="font-weight: 600; display: flex; align-items: center; gap: 4px;">
            ${getIcon('mapPin')} <span>${escapeHtml(event.venue || '')}</span>
          </div>
        </div>
        <div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Registrations</div>
          <div id="event-attendee-count" style="font-weight: 600; display: flex; align-items: center; gap: 4px;">
            ${getIcon('users')} <span>${count}${event.capacity ? ' / ' + event.capacity : ''} Attending</span>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-bottom: var(--space-8);">
      <h3 style="font-size: var(--font-size-lg); font-weight: 700; margin-bottom: var(--space-2);">About Event</h3>
      <p style="white-space: pre-line; line-height: 1.6;">${escapeHtml(event.description || '')}</p>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border-light); padding-top: var(--space-4);">
      <div id="event-reg-badge">${regBadge}</div>
      <div id="event-reg-btn-wrapper">${regBtn}</div>
    </div>
  `;
}

function updateCounterAndBtn(event) {
  const currentUser = auth.getCurrentUser();
  const isRegistered = !!(currentUser && event.isRegistered);
  const count = Number(event.registeredCount || 0);

  const countEl = document.getElementById('event-attendee-count');
  if (countEl) {
    countEl.innerHTML = getIcon('users') + ' <span>' + count + (event.capacity ? ' / ' + event.capacity : '') + ' Attending</span>';
  }
  const badgeEl = document.getElementById('event-reg-badge');
  if (badgeEl) {
    badgeEl.innerHTML = isRegistered ? '<span class="badge badge-approved">' + getIcon('check') + ' You are registered for this event</span>' : '';
  }
  const wrapEl = document.getElementById('event-reg-btn-wrapper');
  if (wrapEl) {
    if (event.isPast) {
      wrapEl.innerHTML = '<button class="btn btn-secondary btn-lg disabled" disabled>This event has ended</button>';
    } else {
      wrapEl.innerHTML = '<button id="toggle-event-reg-btn" class="btn ' + (isRegistered ? 'btn-danger' : 'btn-primary') + ' btn-lg">'
        + (isRegistered ? 'Cancel Registration' : 'Register Now') + '</button>';
      bindBtn(wrapEl);
    }
  }
}

function bindBtn(container) {
  const btn = container.querySelector('#toggle-event-reg-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return;

    const ev = _ev;
    const wasRegistered = !!ev.isRegistered;

    try {
      if (wasRegistered) {
        await apiClient.delete('/events/' + ev.id + '/register');
        _ev = await apiClient.get('/events/' + ev.id);
        showToast('Registration cancelled.', 'info');
      } else {
        const res = await apiClient.post('/events/' + ev.id + '/register', {});
        _ev = res && res.id ? res : await apiClient.get('/events/' + ev.id);
        showToast('Registration successful!', 'success');
      }
      updateCounterAndBtn(_ev);
    } catch (err) {
      console.error('Event registration error:', err);
      if (err.code === 'ALREADY_REGISTERED') {
        try {
          _ev = await apiClient.get('/events/' + ev.id);
          updateCounterAndBtn(_ev);
        } catch (_) {}
      } else if (err.code === 'EVENT_FULL') {
        showToast('This event is full', 'error');
      } else {
        showToast(err.message || 'Failed to update registration.', 'error');
      }
      btn.disabled = false;
    }
  });
}
