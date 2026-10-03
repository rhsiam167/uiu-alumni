import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { toMentorshipRequestDto } from './dto.js';

export async function getMentorshipRequests(currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot access mentorship requests');
  }

  const sql = `
    SELECT 
      m.*,
      req.name as requester_name,
      req.department as requester_department,
      req.graduation_year as requester_graduation_year,
      req.expected_graduation as requester_expected_graduation,
      men.name as mentor_name
    FROM mentorship_requests m
    JOIN users req ON m.requester_id = req.id
    JOIN users men ON m.mentor_id = men.id
    WHERE (m.requester_id = $1 OR m.mentor_id = $1)
    ORDER BY m.created_at DESC
  `;

  const { rows } = await query(sql, [currentUser.id]);

  // Filter out cancelled requests if the current user is the mentor
  const filtered = rows.filter(r => {
    if (r.mentor_id === currentUser.id && r.status === 'cancelled') {
      return false;
    }
    return true;
  });

  return filtered.map(toMentorshipRequestDto);
}

export async function createMentorshipRequest(data, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot request mentorship');
  }

  const { mentorId, topic, message } = data;

  if (mentorId === currentUser.id) {
    throw new ApiError(400, 'INVALID_MENTOR', 'You cannot request mentorship from yourself');
  }

  // Check mentor user
  const mentorRes = await query('SELECT * FROM users WHERE id = $1', [mentorId]);
  const mentor = mentorRes.rows[0];
  if (!mentor || mentor.role !== 'alumni' || mentor.status !== 'approved' || !mentor.willing_to_mentor) {
    throw new ApiError(400, 'INVALID_MENTOR', 'The specified user is not an approved mentor');
  }

  try {
    const sql = `
      INSERT INTO mentorship_requests (requester_id, mentor_id, topic, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const { rows } = await query(sql, [currentUser.id, mentorId, topic, message]);
    
    // Fetch full detail for DTO
    const created = rows[0];
    created.requester_name = currentUser.name;
    created.requester_department = currentUser.department;
    created.requester_graduation_year = currentUser.graduation_year;
    created.requester_expected_graduation = currentUser.expected_graduation;
    created.mentor_name = mentor.name;
    
    return toMentorshipRequestDto(created);
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'DUPLICATE_REQUEST', 'A pending or active mentorship request already exists with this mentor');
    }
    throw err;
  }
}

export async function updateMentorshipStatus(requestId, status, currentUser) {
  const { rows } = await query('SELECT * FROM mentorship_requests WHERE id = $1', [requestId]);
  const req = rows[0];
  if (!req) throw new ApiError(404, 'NOT_FOUND', 'Mentorship request not found');

  if (req.mentor_id !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the mentor can respond to this request');
  }

  if (req.status !== 'pending') {
    throw new ApiError(400, 'INVALID_STATUS_TRANSITION', `Cannot change status of a request that is currently '${req.status}'`);
  }

  const updateRes = await query(
    'UPDATE mentorship_requests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, requestId]
  );
  
  return toMentorshipRequestDto(updateRes.rows[0]);
}

export async function cancelOrEndMentorshipRequest(requestId, currentUser) {
  const { rows } = await query('SELECT * FROM mentorship_requests WHERE id = $1', [requestId]);
  const req = rows[0];
  if (!req) throw new ApiError(404, 'NOT_FOUND', 'Mentorship request not found');

  const isRequester = currentUser.id === req.requester_id;
  const isMentor = currentUser.id === req.mentor_id;

  if (!isRequester && !isMentor) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a party to this mentorship request');
  }

  let newStatus;
  if (req.status === 'pending') {
    if (!isRequester) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the requester can cancel a pending request');
    }
    newStatus = 'cancelled';
  } else if (req.status === 'accepted') {
    newStatus = 'ended';
  } else {
    throw new ApiError(400, 'INVALID_STATUS_TRANSITION', `Cannot cancel or end a request in status '${req.status}'`);
  }

  const updateRes = await query(
    'UPDATE mentorship_requests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [newStatus, requestId]
  );

  return toMentorshipRequestDto(updateRes.rows[0]);
}
