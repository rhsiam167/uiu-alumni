import { pool, query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCsv } from '../../utils/csv.js';
import { getDhakaToday } from '../../utils/dates.js';
import { toEventDto } from './dto.js';

export async function getAllEvents(currentUser) {
  let sql = `
    SELECT 
      e.*,
      (SELECT COUNT(*)::int FROM event_registrations er WHERE er.event_id = e.id) as registered_count
  `;

  if (currentUser) {
    sql += `, EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = $1) as is_registered`;
  }

  sql += ` FROM events e ORDER BY e.event_date ASC`;

  const params = currentUser ? [currentUser.id] : [];
  const { rows } = await query(sql, params);
  return rows.map(r => toEventDto(r, currentUser));
}

export async function getEventById(id, currentUser) {
  let sql = `
    SELECT 
      e.*,
      (SELECT COUNT(*)::int FROM event_registrations er WHERE er.event_id = e.id) as registered_count
  `;

  if (currentUser) {
    sql += `, EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = $1) as is_registered`;
  }

  sql += ` FROM events e WHERE e.id = $${currentUser ? 2 : 1}`;
  const params = currentUser ? [currentUser.id, id] : [id];

  const { rows } = await query(sql, params);
  const event = rows[0];
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  return toEventDto(event, currentUser);
}

export async function createEvent(data, currentUser) {
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can create events');
  }

  const sql = `
    INSERT INTO events (title, description, event_date, event_time, venue, type, capacity, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *, 0 as registered_count
  `;

  const params = [
    data.title, data.description, data.date, data.time,
    data.venue, data.type, data.capacity || null, currentUser.id
  ];

  const { rows } = await query(sql, params);
  return toEventDto(rows[0], currentUser);
}

export async function updateEvent(id, data, currentUser) {
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can edit events');
  }

  const { rows: checkRows } = await query('SELECT id FROM events WHERE id = $1', [id]);
  if (checkRows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  const sql = `
    UPDATE events SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      event_date = COALESCE($3, event_date),
      event_time = COALESCE($4, event_time),
      venue = COALESCE($5, venue),
      type = COALESCE($6, type),
      capacity = COALESCE($7, capacity),
      updated_at = now()
    WHERE id = $8
    RETURNING *, (SELECT COUNT(*)::int FROM event_registrations WHERE event_id = $8) as registered_count
  `;

  const params = [
    data.title, data.description, data.date, data.time,
    data.venue, data.type, data.capacity !== undefined ? data.capacity : null, id
  ];

  const { rows } = await query(sql, params);
  return toEventDto(rows[0], currentUser);
}

export async function deleteEvent(id, currentUser) {
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can delete events');
  }

  const { rows } = await query('SELECT id FROM events WHERE id = $1', [id]);
  if (rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  await query('DELETE FROM events WHERE id = $1', [id]);
  return { message: 'Event deleted successfully' };
}

export async function registerForEvent(eventId, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot register for events');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row-level lock on event
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const event = eventRes.rows[0];
    if (!event) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

    const dateStr = typeof event.event_date === 'string'
      ? event.event_date.slice(0, 10)
      : new Date(event.event_date).toISOString().slice(0, 10);
    if (dateStr < getDhakaToday()) {
      throw new ApiError(400, 'EVENT_PAST', 'Cannot register for past events');
    }

    // Check existing registration
    const regCheck = await client.query('SELECT user_id FROM event_registrations WHERE event_id = $1 AND user_id = $2', [eventId, currentUser.id]);
    if (regCheck.rows.length > 0) {
      throw new ApiError(409, 'ALREADY_REGISTERED', 'You are already registered for this event');
    }

    // Check capacity
    const countRes = await client.query('SELECT COUNT(*)::int as count FROM event_registrations WHERE event_id = $1', [eventId]);
    const regCount = countRes.rows[0].count;

    if (event.capacity !== null && regCount >= Number(event.capacity)) {
      throw new ApiError(409, 'EVENT_FULL', 'Event capacity has been reached');
    }

    // Insert registration
    await client.query('INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)', [eventId, currentUser.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await getEventById(eventId, currentUser);
}

export async function unregisterFromEvent(eventId, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot register or unregister for events');
  }

  const { rows } = await query('SELECT user_id FROM event_registrations WHERE event_id = $1 AND user_id = $2', [eventId, currentUser.id]);
  if (rows.length === 0) {
    throw new ApiError(404, 'NOT_REGISTERED', 'You are not registered for this event');
  }

  await query('DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2', [eventId, currentUser.id]);
  return { message: 'Successfully unregistered from event' };
}

export async function getEventRegistrationsAdmin(eventId, currentUser) {
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can view event registrants');
  }

  const eventRes = await query('SELECT title FROM events WHERE id = $1', [eventId]);
  if (eventRes.rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Event not found');

  const sql = `
    SELECT 
      u.id as "userId",
      u.name,
      u.email,
      u.student_id as "studentId",
      u.role,
      u.department,
      er.created_at as "registeredAt"
    FROM event_registrations er
    JOIN users u ON er.user_id = u.id
    WHERE er.event_id = $1
    ORDER BY er.created_at ASC
  `;

  const { rows } = await query(sql, [eventId]);
  return {
    count: rows.length,
    items: rows
  };
}

export async function exportEventRegistrationsCsv(eventId, currentUser) {
  const data = await getEventRegistrationsAdmin(eventId, currentUser);
  const headers = [
    { key: 'userId', label: 'User ID' },
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'registeredAt', label: 'Registered At' }
  ];

  return generateCsv(headers, data.items);
}
