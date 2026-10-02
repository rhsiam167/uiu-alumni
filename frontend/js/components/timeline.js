// Career & Academic Timeline Component
import { escapeHtml } from '../utils.js';

export function renderTimeline(items = []) {
  if (!items || items.length === 0) {
    return `<p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">No timeline entries available.</p>`;
  }

  const sortedItems = [...items].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

  const itemsHtml = sortedItems.map(item => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-date">${escapeHtml(item.startDate || '')} — ${escapeHtml(item.endDate || 'Present')}</div>
        <div class="timeline-title">${escapeHtml(item.title)}</div>
        <div class="timeline-subtitle">${escapeHtml(item.organization)}</div>
        ${item.description ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 6px;">${escapeHtml(item.description)}</p>` : ''}
      </div>
    </div>
  `).join('');

  return `<div class="timeline">${itemsHtml}</div>`;
}
