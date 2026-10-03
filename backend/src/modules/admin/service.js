import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';
import { pool, query } from '../../db/pool.js';
import { sendEmail } from '../../services/mailer.js';
import { ApiError } from '../../utils/ApiError.js';
import { getDhakaToday } from '../../utils/dates.js';
import { toUserAdminDto } from '../auth/dto.js';
import { toJobDto } from '../jobs/dto.js';

export async function getAdminStats() {
  const pendingApprovalsRes = await query("SELECT COUNT(*)::int as count FROM users WHERE status = 'pending'");
  const totalAlumniRes = await query("SELECT COUNT(*)::int as count FROM users WHERE role = 'alumni' AND status = 'approved'");
  const totalStudentsRes = await query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student' AND status = 'approved'");
  const pendingJobsRes = await query("SELECT COUNT(*)::int as count FROM jobs WHERE status = 'pending'");
  const upcomingEventsRes = await query("SELECT COUNT(*)::int as count FROM events WHERE event_date >= $1", [getDhakaToday()]);
  const donationsRes = await query("SELECT COALESCE(SUM(amount), 0)::numeric as total FROM donations");

  return {
    pendingApprovalsCount: pendingApprovalsRes.rows[0].count,
    totalAlumniCount: totalAlumniRes.rows[0].count,
    totalStudentsCount: totalStudentsRes.rows[0].count,
    pendingJobsCount: pendingJobsRes.rows[0].count,
    upcomingEventsCount: upcomingEventsRes.rows[0].count,
    totalDonationsAmount: Number(donationsRes.rows[0].total)
  };
}

export async function getAdminUsers(queryParams) {
  const page = Math.max(1, Number(queryParams.page || 1));
  const limit = Math.min(100, Math.max(1, Number(queryParams.limit || 20)));
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (queryParams.role) {
    params.push(queryParams.role);
    whereClause += ` AND role = $${params.length}`;
  }

  if (queryParams.status) {
    params.push(queryParams.status);
    whereClause += ` AND status = $${params.length}`;
  }

  if (queryParams.q) {
    params.push(`%${queryParams.q}%`);
    const idx = params.length;
    whereClause += ` AND (name ILIKE $${idx} OR email ILIKE $${idx} OR student_id ILIKE $${idx} OR company ILIKE $${idx})`;
  }

  const countRes = await query(`SELECT COUNT(*)::int as total FROM users ${whereClause}`, params);
  const total = countRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT * FROM users ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const { rows } = await query(dataSql, dataParams);
  const items = rows.map(toUserAdminDto);

  return { items, total, page, limit };
}

export async function getAdminUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  const timelineRes = await query('SELECT * FROM career_entries WHERE user_id = $1 ORDER BY position ASC, start_date DESC', [id]);
  const dto = toUserAdminDto(user);
  dto.careerTimeline = timelineRes.rows;
  return dto;
}

export async function updateAdminUser(targetId, data, currentUser) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [targetId]);
  const targetUser = rows[0];
  if (!targetUser) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  if (targetUser.id === currentUser.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'An admin cannot change their own status or role');
  }

  if (targetUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'An admin cannot modify another admin account');
  }

  const { status, rejectionReason, verified } = data;

  if (status === 'rejected' && !rejectionReason && !targetUser.rejection_reason) {
    throw new ApiError(400, 'REJECTION_REASON_REQUIRED', 'A rejection reason is required when rejecting a user');
  }

  const newStatus = status || targetUser.status;

  if (verified && newStatus !== 'approved') {
    throw new ApiError(400, 'INVALID_VERIFICATION', 'Only approved users can be marked as verified');
  }

  const updates = [];
  const params = [];

  if (status) {
    params.push(status);
    updates.push(`status = $${params.length}`);

    if (status === 'approved') {
      params.push(new Date().toISOString());
      updates.push(`approved_at = $${params.length}`);
      params.push(currentUser.id);
      updates.push(`approved_by = $${params.length}`);
    } else if (status === 'rejected') {
      params.push(rejectionReason);
      updates.push(`rejection_reason = $${params.length}`);
    }
  }

  if (verified !== undefined) {
    params.push(Boolean(verified));
    updates.push(`verified = $${params.length}`);
  }

  if (updates.length > 0) {
    params.push(targetId);
    updates.push(`updated_at = now()`);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const updateRes = await query(sql, params);
    const updatedUser = updateRes.rows[0];

    // Non-blocking notification email on status change
    if (status && status !== targetUser.status) {
      sendEmail({
        to: updatedUser.email,
        subject: `UIU Alumni Portal Account ${status.toUpperCase()}`,
        html: `<p>Hello ${updatedUser.name},</p><p>Your account status on the UIU Alumni Portal has been updated to: <strong>${status}</strong>.</p>${status === 'rejected' ? `<p>Reason: ${rejectionReason}</p>` : ''}`
      }).catch(err => console.error('Failed to send status update email:', err.message));
    }

    return toUserAdminDto(updatedUser);
  }

  return toUserAdminDto(targetUser);
}

export async function getAdminJobs(queryParams) {
  const page = Math.max(1, Number(queryParams.page || 1));
  const limit = Math.min(100, Math.max(1, Number(queryParams.limit || 20)));
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (queryParams.status) {
    params.push(queryParams.status);
    whereClause += ` AND j.status = $${params.length}`;
  }

  const countRes = await query(`SELECT COUNT(*)::int as total FROM jobs j ${whereClause}`, params);
  const total = countRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      j.*,
      u.name as posted_by_name,
      (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = j.id) as applicants_count
    FROM jobs j
    JOIN users u ON j.posted_by = u.id
    ${whereClause}
    ORDER BY j.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const { rows } = await query(dataSql, dataParams);
  const items = rows.map(r => toJobDto(r, { role: 'admin' }));

  return { items, total, page, limit };
}

export async function updateAdminJob(id, data, currentUser) {
  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [id]);
  const job = rows[0];
  if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');

  const { status, reason } = data;

  if (status === 'rejected' && !reason) {
    throw new ApiError(400, 'REASON_REQUIRED', 'A rejection reason is required when rejecting a job');
  }

  const sql = `
    UPDATE jobs SET
      status = $1,
      rejection_reason = $2,
      reviewed_by = $3,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = $4
    RETURNING *, (SELECT name FROM users WHERE id = posted_by) as posted_by_name,
    (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = $4) as applicants_count
  `;

  const params = [status, status === 'rejected' ? reason : null, currentUser.id, id];
  const updateRes = await query(sql, params);

  return toJobDto(updateRes.rows[0], currentUser);
}

export async function deleteAdminUser(targetId, currentUser) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [targetId]);
  const targetUser = rows[0];
  if (!targetUser) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  if (targetUser.id === currentUser.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'An admin cannot delete their own account');
  }

  if (targetUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'An admin cannot delete another admin account');
  }

  // Collect CV filenames to clean up after deletion
  // 1. CVs from applications submitted BY the target user
  const cvByApplicantRes = await query(
    'SELECT cv_stored_name FROM job_applications WHERE applicant_id = $1 AND cv_stored_name IS NOT NULL',
    [targetId]
  );
  // 2. CVs from applications to jobs POSTED BY the target user
  const cvOnPostedJobsRes = await query(
    `SELECT ja.cv_stored_name
     FROM job_applications ja
     JOIN jobs j ON ja.job_id = j.id
     WHERE j.posted_by = $1 AND ja.cv_stored_name IS NOT NULL`,
    [targetId]
  );

  const cvFilenames = [
    ...cvByApplicantRes.rows.map(r => r.cv_stored_name),
    ...cvOnPostedJobsRes.rows.map(r => r.cv_stored_name)
  ].filter(Boolean);

  // Delete user inside a transaction; FK cascades handle child rows
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM users WHERE id = $1', [targetId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Best-effort file cleanup — never let this fail the request
  for (const filename of cvFilenames) {
    try {
      const filePath = path.resolve(env.UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to delete CV file during user removal:', filename, e.message);
    }
  }

  return { message: 'User removed successfully' };
}
