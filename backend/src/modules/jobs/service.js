import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';
import { pool, query } from '../../db/pool.js';
import { sendEmail } from '../../services/mailer.js';
import { ApiError } from '../../utils/ApiError.js';
import { getDhakaToday } from '../../utils/dates.js';
import { toJobApplicationDto, toJobDto } from './dto.js';

export async function getPublicJobs(filters, currentUser) {
  const todayStr = getDhakaToday();
  let sql = `
    SELECT 
      j.*,
      u.name as posted_by_name,
      (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = j.id) as applicants_count
  `;

  if (currentUser) {
    sql += `, EXISTS(SELECT 1 FROM job_applications ja WHERE ja.job_id = j.id AND ja.applicant_id = $1) as has_applied`;
  }

  sql += ` FROM jobs j JOIN users u ON j.posted_by = u.id WHERE j.status = 'approved' AND j.deadline >= $${currentUser ? 2 : 1}`;

  const params = currentUser ? [currentUser.id, todayStr] : [todayStr];

  if (filters.type) {
    params.push(filters.type);
    sql += ` AND j.type = $${params.length}`;
  }

  if (filters.location) {
    params.push(`%${filters.location}%`);
    sql += ` AND j.location ILIKE $${params.length}`;
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const idx = params.length;
    sql += ` AND (j.title ILIKE $${idx} OR j.company ILIKE $${idx} OR j.description ILIKE $${idx})`;
  }

  sql += ' ORDER BY j.created_at DESC LIMIT 500';

  const { rows } = await query(sql, params);
  return rows.map(r => toJobDto(r, currentUser));
}

export async function getJobById(id, currentUser) {
  let sql = `
    SELECT 
      j.*,
      u.name as posted_by_name,
      (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = j.id) as applicants_count
  `;

  if (currentUser) {
    sql += `, EXISTS(SELECT 1 FROM job_applications ja WHERE ja.job_id = j.id AND ja.applicant_id = $1) as has_applied`;
  }

  sql += ` FROM jobs j JOIN users u ON j.posted_by = u.id WHERE j.id = $${currentUser ? 2 : 1}`;
  const params = currentUser ? [currentUser.id, id] : [id];

  const { rows } = await query(sql, params);
  const job = rows[0];
  if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');

  const isPoster = currentUser && currentUser.id === job.posted_by;
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (job.status !== 'approved' && !isPoster && !isAdmin) {
    throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');
  }

  return toJobDto(job, currentUser);
}

export async function getMyJobs(currentUser) {
  if (currentUser.role !== 'alumni') {
    throw new ApiError(403, 'FORBIDDEN', 'Only alumni can post and manage jobs');
  }

  const sql = `
    SELECT 
      j.*,
      u.name as posted_by_name,
      (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = j.id) as applicants_count
    FROM jobs j
    JOIN users u ON j.posted_by = u.id
    WHERE j.posted_by = $1
    ORDER BY j.created_at DESC
  `;

  const { rows } = await query(sql, [currentUser.id]);
  return rows.map(r => toJobDto(r, currentUser));
}

export async function getMyApplications(currentUser) {
  const sql = `
    SELECT 
      ja.id, ja.job_id, ja.created_at,
      j.title as job_title, j.company
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.applicant_id = $1
    ORDER BY ja.created_at DESC
  `;

  const { rows } = await query(sql, [currentUser.id]);
  return rows.map(toJobApplicationDto);
}

export async function createJob(data, currentUser) {
  if (currentUser.role !== 'alumni') {
    throw new ApiError(403, 'FORBIDDEN', 'Only alumni can post jobs');
  }

  const todayStr = getDhakaToday();
  if (data.deadline < todayStr) {
    throw new ApiError(400, 'INVALID_DEADLINE', 'Deadline cannot be in the past');
  }

  const sql = `
    INSERT INTO jobs (posted_by, title, company, location, type, salary, description, requirements, deadline, recruiter_email, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
    RETURNING *, (SELECT name FROM users WHERE id = $1) as posted_by_name
  `;

  const params = [
    currentUser.id, data.title, data.company, data.location, data.type,
    data.salary || null, data.description, data.requirements || null,
    data.deadline, data.recruiterEmail
  ];

  const { rows } = await query(sql, params);
  return toJobDto(rows[0], currentUser);
}

export async function updateJob(id, data, currentUser) {
  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [id]);
  const job = rows[0];
  if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');

  if (job.posted_by !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the job poster can edit this job');
  }

  // Poster can edit while pending or rejected (edits set status back to pending), or set status to 'closed'
  let newStatus = job.status;
  if (data.status === 'closed' && job.status === 'approved') {
    newStatus = 'closed';
  } else if (job.status === 'pending' || job.status === 'rejected') {
    newStatus = 'pending'; // Reset rejected to pending on edit
  } else if (data.status && data.status !== job.status) {
    throw new ApiError(400, 'INVALID_STATUS_CHANGE', 'Job status cannot be changed directly');
  }

  if (data.deadline && data.deadline < getDhakaToday()) {
    throw new ApiError(400, 'INVALID_DEADLINE', 'Deadline cannot be in the past');
  }

  const sql = `
    UPDATE jobs SET
      title = COALESCE($1, title),
      company = COALESCE($2, company),
      location = COALESCE($3, location),
      type = COALESCE($4, type),
      salary = COALESCE($5, salary),
      description = COALESCE($6, description),
      requirements = COALESCE($7, requirements),
      deadline = COALESCE($8, deadline),
      recruiter_email = COALESCE($9, recruiter_email),
      status = $10,
      updated_at = now()
    WHERE id = $11
    RETURNING *, (SELECT name FROM users WHERE id = $11) as posted_by_name,
    (SELECT COUNT(*)::int FROM job_applications ja WHERE ja.job_id = $11) as applicants_count
  `;

  const params = [
    data.title, data.company, data.location, data.type,
    data.salary, data.description, data.requirements, data.deadline,
    data.recruiterEmail, newStatus, id
  ];

  const updateRes = await query(sql, params);
  return toJobDto(updateRes.rows[0], currentUser);
}

export async function deleteJob(id, currentUser) {
  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [id]);
  const job = rows[0];
  if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');

  const isPoster = currentUser.id === job.posted_by;
  const isAdmin = currentUser.role === 'admin';

  if (!isPoster && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Only poster or admin can delete this job');
  }

  // Fetch applications to delete stored CV files best-effort
  const appsRes = await query('SELECT cv_stored_name FROM job_applications WHERE job_id = $1', [id]);
  for (const app of appsRes.rows) {
    if (app.cv_stored_name) {
      const filePath = path.resolve(env.UPLOAD_DIR, app.cv_stored_name);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }
  }

  await query('DELETE FROM jobs WHERE id = $1', [id]);
  return { message: 'Job posting deleted successfully' };
}

export async function applyToJob(jobId, req, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot apply to jobs');
  }

  const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  const job = rows[0];
  if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job posting not found');

  if (job.status !== 'approved') {
    throw new ApiError(400, 'JOB_NOT_ACTIVE', 'Cannot apply to a job that is not approved');
  }

  const todayStr = getDhakaToday();
  const deadlineStr = typeof job.deadline === 'string' ? job.deadline.slice(0, 10) : new Date(job.deadline).toISOString().slice(0, 10);
  if (deadlineStr < todayStr) {
    throw new ApiError(400, 'DEADLINE_PASSED', 'The application deadline for this job has passed');
  }

  if (job.posted_by === currentUser.id) {
    throw new ApiError(400, 'CANNOT_APPLY_OWN', 'You cannot apply to your own job posting');
  }

  // Check duplicate application
  const existingApp = await query('SELECT id FROM job_applications WHERE job_id = $1 AND applicant_id = $2', [jobId, currentUser.id]);
  if (existingApp.rows.length > 0) {
    throw new ApiError(409, 'ALREADY_APPLIED', 'You have already applied to this job');
  }

  const { portfolio, github, coverNote } = req.body;
  const storedCvName = req.storedCvName;
  const originalCvName = req.originalCvName;

  // Send email to recruiter
  let emailStatus = 'sent';
  let emailError = null;
  let emailSentSuccess = false;

  const subject = `New application: ${job.title} — ${currentUser.name}`;
  const htmlBody = `
    <h2>New Job Application Received</h2>
    <p><strong>Job Title:</strong> ${job.title}</p>
    <p><strong>Company:</strong> ${job.company}</p>
    <hr />
    <h3>Applicant Details</h3>
    <p><strong>Name:</strong> ${currentUser.name}</p>
    <p><strong>Email:</strong> ${currentUser.email}</p>
    <p><strong>Department:</strong> ${currentUser.department || 'N/A'}</p>
    <p><strong>Batch/Semester:</strong> ${currentUser.graduation_year || currentUser.current_semester || 'N/A'}</p>
    ${portfolio ? `<p><strong>Portfolio:</strong> <a href="${portfolio}">${portfolio}</a></p>` : ''}
    ${github ? `<p><strong>GitHub:</strong> <a href="${github}">${github}</a></p>` : ''}
    ${coverNote ? `<p><strong>Cover Note:</strong></p><blockquote style="background:#f4f4f4;padding:10px;">${coverNote}</blockquote>` : ''}
    <p>Attached CV: <code>${originalCvName}</code></p>
  `;

  const cvBuffer = req.file.buffer;
  try {
    const mailRes = await sendEmail({
      to: job.recruiter_email,
      replyTo: currentUser.email,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: originalCvName,
          content: cvBuffer
        }
      ]
    });
    if (mailRes.status === 'logged') {
      emailStatus = 'logged';
    }
    emailSentSuccess = true;
  } catch (err) {
    emailStatus = 'failed';
    emailError = err.message || 'Failed to send recruiter email';
    emailSentSuccess = false;
  }

  // Insert application into DB
  const insertSql = `
    INSERT INTO job_applications (
      job_id, applicant_id, cv_original_name, cv_stored_name,
      portfolio_url, github_url, cover_note, email_status, email_error
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, created_at
  `;

  const params = [
    jobId, currentUser.id, originalCvName, storedCvName,
    portfolio || null, github || null, coverNote || null,
    emailStatus, emailError
  ];

  await query(insertSql, params);

  return { applied: true, emailSent: emailSentSuccess };
}
