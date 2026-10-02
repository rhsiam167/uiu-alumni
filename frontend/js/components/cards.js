// Card Components Renderer Helpers
import { getIcon, getInitials, formatDate, getRelativeRoot, escapeHtml } from '../utils.js';

export function renderJobCard(job, options = {}) {
  const root = getRelativeRoot();
  const currentUser = options.currentUser || null;

  const initials = getInitials(job.company);
  const posterInitials = getInitials(job.postedByName || 'Alumnus');
  
  const isPosterOrAdmin = currentUser && (currentUser.id === job.postedBy || currentUser.role === 'admin');
  const hasApplied = !!job.hasApplied;

  return `
    <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between; padding: var(--space-6); background: #FFFFFF; border-radius: var(--radius-xl); border: 1px solid var(--color-border-light);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); margin-bottom: var(--space-4);">
          <div style="display: flex; gap: var(--space-4); align-items: flex-start;">
            <div class="company-logo-box">${initials}</div>
            <div>
              <h3 style="font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-main); margin-bottom: 2px;">${escapeHtml(job.title)}</h3>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); font-weight: 500;">${escapeHtml(job.company)}</div>
            </div>
          </div>

          <a href="${root}pages/profile.html?id=${escapeHtml(job.postedBy)}" class="chip chip-primary" style="text-decoration: none; font-size: 11px; padding: 3px 8px;" title="View poster profile">
            <span class="avatar avatar-sm" style="width: 20px; height: 20px; font-size: 10px;">${posterInitials}</span>
            <span>POSTED BY ALUMNUS</span>
          </a>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4);">
          <span class="chip">${getIcon('mapPin')} ${escapeHtml(job.location)}</span>
          <span class="chip">${getIcon('briefcase')} ${escapeHtml(job.type)}</span>
          ${job.salary ? `<span class="chip">${getIcon('dollarSign')} ${escapeHtml(job.salary)}</span>` : ''}
          <span class="chip">${getIcon('clock')} ${formatDate(job.createdAt)}</span>
        </div>

        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.6; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: var(--space-6);">
          ${escapeHtml(job.description)}
        </p>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border-light); padding-top: var(--space-4); margin-top: auto;">
        <div style="display: flex; gap: var(--space-3); align-items: center;">
          ${hasApplied 
            ? `<button class="btn btn-secondary btn-sm disabled" disabled>${getIcon('check')} Applied</button>`
            : `<a href="${root}pages/job-details.html?id=${escapeHtml(job.id)}" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full);">${getIcon('briefcase')} Apply Now</a>`
          }
          <a href="${root}pages/job-details.html?id=${escapeHtml(job.id)}" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-full);">View Details</a>
        </div>

        ${isPosterOrAdmin ? `<span style="font-size: var(--font-size-xs); font-weight: 600; color: var(--color-primary);">${getIcon('users')} Applicants: ${job.applicantCount || (job.applications || []).length}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderEventCard(event, options = {}) {
  const { isRegistered = false } = options;
  const root = getRelativeRoot();

  const type = event.type || 'Event';
  const badgeClass = `event-badge-${type}` || 'event-badge-Default';
  const isOnline = (event.venue || '').toLowerCase().includes('online') || (event.venue || '').toLowerCase().includes('zoom') || type === 'Webinar';

  return `
    <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between; padding: 0; overflow: hidden; border-radius: var(--radius-xl); border: 1px solid var(--color-border-light); background: #FFFFFF; height: 100%;">
      <!-- Card Image / Gradient Header -->
      <div style="position: relative; height: 140px; background: linear-gradient(135deg, #1E293B 0%, #334155 50%, #C2410C 100%); display: flex; align-items: flex-end; padding: var(--space-4);">
        <span class="badge ${badgeClass}" style="position: absolute; top: 12px; left: 12px; font-weight: 700; text-transform: uppercase; font-size: 11px;">${escapeHtml(type)}</span>
        ${isRegistered ? `<span class="badge badge-approved" style="position: absolute; top: 12px; right: 12px; font-weight: 700; font-size: 11px;">${getIcon('check')} Registered</span>` : ''}
        
        <div style="color: #FFFFFF; display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-xs); font-weight: 600; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: var(--radius-full);">
          ${getIcon('calendar')} ${formatDate(event.date)}
        </div>
      </div>

      <!-- Content -->
      <div style="padding: var(--space-5); display: flex; flex-direction: column; flex-grow: 1; justify-content: space-between;">
        <div>
          <h3 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-text-main); margin-bottom: var(--space-2); line-height: 1.3;">${escapeHtml(event.title)}</h3>
          
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-4);">
            <div style="display: flex; align-items: center; gap: 6px;">
              ${getIcon('clock')} <span>${escapeHtml(event.time)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; ${isOnline ? 'color: #2563EB; font-weight: 600;' : ''}">
              ${isOnline ? getIcon('video') : getIcon('mapPin')} <span>${escapeHtml(event.venue)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${getIcon('users')} <span>${event.registeredCount || 0} ${event.capacity ? `/ ${event.capacity}` : ''} Attending</span>
            </div>
          </div>

          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.5; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: var(--space-4);">
            ${escapeHtml(event.description)}
          </p>
        </div>

        <div style="border-top: 1px solid var(--color-border-light); padding-top: var(--space-3); margin-top: auto;">
          <a href="${root}pages/event-details.html?id=${escapeHtml(event.id)}" class="btn btn-primary btn-sm" style="width: 100%; border-radius: var(--radius-full);">
            View Details
          </a>
        </div>
      </div>
    </div>
  `;
}

export function renderMentorCard(mentor, options = {}) {
  const initials = getInitials(mentor.name);
  const root = getRelativeRoot();
  const currentUser = options.currentUser || null;
  // requestState: 'none' | 'pending' | 'accepted' | 'other'
  const requestState = options.requestState || (options.hasRequested ? 'pending' : 'none');
  const latestReq = options.latestReq || null;

  const isOwnCard = currentUser && currentUser.id === mentor.id;

  const expList = mentor.mentorExpertise || [];
  const displayChips = expList.slice(0, 3);
  const extraCount = expList.length - 3;

  const chipsHtml = displayChips.map(exp => `<span class="chip">${escapeHtml(exp)}</span>`).join('');
  const extraChipHtml = extraCount > 0 ? `<span class="chip">+${extraCount}</span>` : '';

  let actionHtml = '';
  if (!isOwnCard && currentUser) {
    if (requestState === 'pending' && latestReq) {
      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
          <button class="btn btn-secondary btn-sm disabled" disabled style="border-radius: var(--radius-full);">Request sent</button>
          <button class="btn btn-ghost btn-sm cancel-mentor-req-btn" data-req-id="${escapeHtml(latestReq.id)}" style="border-radius: var(--radius-full); color: var(--color-danger); font-size: 11px;">Cancel request</button>
        </div>
      `;
    } else if (requestState === 'accepted' && latestReq) {
      actionHtml = `
        <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
          <a href="${root}pages/chat.html?user=${escapeHtml(mentor.id)}" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); text-align: center;">${getIcon('message')} Message</a>
          <button class="btn btn-ghost btn-sm end-mentorship-btn" data-req-id="${escapeHtml(latestReq.id)}" style="border-radius: var(--radius-full); color: var(--color-danger); font-size: 11px;">End mentorship</button>
        </div>
      `;
    } else {
      // none, other (cancelled/declined/ended) — show Request Mentorship
      actionHtml = `<button class="btn btn-primary btn-sm request-mentor-btn" data-id="${escapeHtml(mentor.id)}" data-name="${escapeHtml(mentor.name)}" style="flex: 1; border-radius: var(--radius-full);">Request Mentorship</button>`;
    }
  }

  return `
    <div class="mentor-card">
      <div style="position: absolute; top: 16px; right: 16px;">
        <span class="badge badge-approved" style="font-size: 10px; font-weight: 700;">Available</span>
      </div>

      <div>
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: var(--space-4);">
          <div class="avatar-ring" style="margin-bottom: var(--space-3);">
            <div class="avatar-ring-inner">${initials}</div>
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 2px;">
            <h3 style="font-size: var(--font-size-base); font-weight: 700; color: var(--color-text-main); margin: 0;">${escapeHtml(mentor.name)}</h3>
            ${mentor.verified ? getIcon('badgeCheck') : ''}
          </div>

          <div style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">
            ${escapeHtml(mentor.jobTitle || 'Alumnus')} ${mentor.company ? `@ ${escapeHtml(mentor.company)}` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--color-text-muted);">
            ${getIcon('graduationCap')} <span>${escapeHtml(mentor.department || 'UIU')} &middot; Batch ${escapeHtml(mentor.graduationYear || 'N/A')}</span>
          </div>
        </div>

        ${mentor.bio ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.5; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: var(--space-4); text-align: center;">${escapeHtml(mentor.bio)}</p>` : ''}

        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin-bottom: var(--space-6);">
          ${chipsHtml || '<span class="chip">General Mentorship</span>'}
          ${extraChipHtml}
        </div>
      </div>

      <div style="display: flex; gap: var(--space-2); margin-top: auto; border-top: 1px solid var(--color-border-light); padding-top: var(--space-4);">
        <a href="${root}pages/profile.html?id=${escapeHtml(mentor.id)}" class="btn btn-secondary btn-sm" style="flex: 1; border-radius: var(--radius-full);">View Profile</a>
        ${actionHtml}
      </div>
    </div>
  `;
}
