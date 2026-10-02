import { pool, query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { getDhakaToday } from '../../utils/dates.js';
import { toUserAdminDto, toUserPublicDto, toUserSelfDto } from '../auth/dto.js';

export function toCareerEntryDto(entry) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    organization: entry.organization,
    startDate: typeof entry.start_date === 'string' ? entry.start_date.slice(0, 10) : new Date(entry.start_date).toISOString().slice(0, 10),
    endDate: entry.end_date ? (typeof entry.end_date === 'string' ? entry.end_date.slice(0, 10) : new Date(entry.end_date).toISOString().slice(0, 10)) : 'Present',
    description: entry.description || ''
  };
}

export async function getUsersStats() {
  const alumniRes = await query("SELECT COUNT(*)::int as count FROM users WHERE role = 'alumni' AND status = 'approved'");
  const studentRes = await query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student' AND status = 'approved'");
  const jobRes = await query("SELECT COUNT(*)::int as count FROM jobs WHERE status = 'approved'");
  const eventRes = await query("SELECT COUNT(*)::int as count FROM events WHERE event_date >= $1", [getDhakaToday()]);

  return {
    totalAlumni: alumniRes.rows[0].count,
    totalStudents: studentRes.rows[0].count,
    activeJobs: jobRes.rows[0].count,
    upcomingEvents: eventRes.rows[0].count
  };
}

export async function getMentors(filters) {
  let sql = "SELECT * FROM users WHERE role = 'alumni' AND status = 'approved' AND willing_to_mentor = true";
  const params = [];

  if (filters.department) {
    params.push(filters.department);
    sql += ` AND department = $${params.length}`;
  }

  if (filters.graduationYear) {
    params.push(Number(filters.graduationYear));
    sql += ` AND graduation_year = $${params.length}`;
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const idx = params.length;
    sql += ` AND (name ILIKE $${idx} OR company ILIKE $${idx} OR job_title ILIKE $${idx} OR array_to_string(mentor_expertise, ' ') ILIKE $${idx})`;
  }

  sql += ' ORDER BY name ASC LIMIT 500';
  const { rows } = await query(sql, params);
  return rows.map(toUserPublicDto);
}

export async function getUserById(id, currentUser) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  const isSelf = currentUser && currentUser.id === id;
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isSelf && !isAdmin) {
    if (user.status !== 'approved') {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }
    if (user.role === 'student') {
      // Guests and other users cannot view student profiles
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }
  }

  // Fetch career timeline
  const timelineRes = await query('SELECT * FROM career_entries WHERE user_id = $1 ORDER BY position ASC, start_date DESC', [id]);
  const careerTimeline = timelineRes.rows.map(toCareerEntryDto);

  let dto;
  if (isAdmin) {
    dto = toUserAdminDto(user);
  } else if (isSelf) {
    dto = toUserSelfDto(user);
  } else {
    dto = toUserPublicDto(user);
  }

  dto.careerTimeline = careerTimeline;
  return dto;
}

export async function updateUserProfile(targetId, body, currentUser) {
  if (!currentUser || currentUser.id !== targetId) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own profile');
  }

  // Check forbidden fields
  const forbiddenFields = ['email', 'role', 'status', 'verified', 'studentId'];
  for (const field of forbiddenFields) {
    if (body[field] !== undefined) {
      let currentVal = currentUser[field];
      if (field === 'studentId') currentVal = currentUser.student_id;
      if (String(body[field]) !== String(currentVal)) {
        throw new ApiError(400, 'INVALID_UPDATE', `Field '${field}' cannot be modified`);
      }
    }
  }

  if (body.willingToMentor && currentUser.role !== 'alumni') {
    throw new ApiError(400, 'INVALID_UPDATE', 'Only alumni can set willingToMentor');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update user profile fields
    const updates = [];
    const params = [];

    const fieldMap = {
      name: 'name',
      phone: 'phone',
      city: 'city',
      bio: 'bio',
      department: 'department',
      program: 'program',
      graduationYear: 'graduation_year',
      currentSemester: 'current_semester',
      expectedGraduation: 'expected_graduation',
      company: 'company',
      jobTitle: 'job_title',
      github: 'github',
      linkedin: 'linkedin',
      portfolio: 'portfolio',
      website: 'website',
      willingToMentor: 'willing_to_mentor',
      mentorExpertise: 'mentor_expertise'
    };

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
      if (body[jsKey] !== undefined) {
        params.push(body[jsKey]);
        updates.push(`${dbCol} = $${params.length}`);
      }
    }

    if (updates.length > 0) {
      params.push(targetId);
      updates.push(`updated_at = now()`);
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
      await client.query(sql, params);
    }

    // Replace-all careerTimeline if provided
    if (body.careerTimeline !== undefined) {
      const entries = body.careerTimeline;
      // Validate dates
      for (const e of entries) {
        if (e.endDate && e.endDate !== 'Present' && e.endDate < e.startDate) {
          throw new ApiError(400, 'INVALID_DATE_RANGE', `End date (${e.endDate}) cannot be earlier than start date (${e.startDate})`);
        }
      }

      // Delete existing entries not in the new array
      const keepIds = entries.map(e => e.id).filter(Boolean);
      if (keepIds.length > 0) {
        await client.query('DELETE FROM career_entries WHERE user_id = $1 AND id NOT IN (SELECT unnest($2::uuid[]))', [targetId, keepIds]);
      } else {
        await client.query('DELETE FROM career_entries WHERE user_id = $1', [targetId]);
      }

      // Upsert entries
      for (let pos = 0; pos < entries.length; pos++) {
        const e = entries[pos];
        const endDateVal = (e.endDate === 'Present' || !e.endDate) ? null : e.endDate;
        if (e.id) {
          await client.query(`
            UPDATE career_entries 
            SET type = $1, title = $2, organization = $3, start_date = $4, end_date = $5, description = $6, position = $7
            WHERE id = $8 AND user_id = $9
          `, [e.type, e.title, e.organization, e.startDate, endDateVal, e.description || null, pos + 1, e.id, targetId]);
        } else {
          await client.query(`
            INSERT INTO career_entries (user_id, type, title, organization, start_date, end_date, description, position)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [targetId, e.type, e.title, e.organization, e.startDate, endDateVal, e.description || null, pos + 1]);
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await getUserById(targetId, currentUser);
}
