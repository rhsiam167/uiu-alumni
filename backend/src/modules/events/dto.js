import { getDhakaToday } from '../../utils/dates.js';

export function toEventDto(event, currentUser) {
  if (!event) return null;

  const dateStr = typeof event.event_date === 'string'
    ? event.event_date.slice(0, 10)
    : new Date(event.event_date).toISOString().slice(0, 10);

  const todayStr = getDhakaToday();
  const isPast = dateStr < todayStr;

  const dto = {
    id: event.id,
    title: event.title,
    description: event.description,
    date: dateStr,
    time: event.event_time,
    venue: event.venue,
    type: event.type,
    capacity: event.capacity !== null ? Number(event.capacity) : null,
    createdBy: event.created_by,
    createdAt: event.created_at,
    registeredCount: Number(event.registered_count || 0),
    isPast
  };

  if (currentUser) {
    dto.isRegistered = Boolean(event.is_registered);
  }

  return dto;
}
