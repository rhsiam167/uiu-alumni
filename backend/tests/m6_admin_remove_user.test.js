import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { query } from '../src/db/pool.js';
import { loginAs } from './setup.js';

describe('Milestone 6 — Admin Remove User', () => {
  it('allows admin to remove an approved user and cascades related data', async () => {
    const { agent: adminAgent } = await loginAs('admin');
    const { user: student } = await loginAs('student');

    // Create related data for student (messages, job_applications, etc.)
    await query(
      `INSERT INTO messages (sender_id, recipient_id, text) VALUES ($1, (SELECT id FROM users WHERE email='alumni@uiu.test'), 'Hello')`,
      [student.id]
    );

    // Create a job posted by admin and application by student
    const jobRes = await query(
      `INSERT INTO jobs (posted_by, title, company, location, type, deadline, recruiter_email, description, status) VALUES ((SELECT id FROM users WHERE email='admin@uiu.test'), 'Test Job', 'Test Co', 'Dhaka', 'Full-time', '2026-12-31', 'recruiter@test.com', 'Description', 'approved') RETURNING id`
    );
    const jobId = jobRes.rows[0].id;

    await query(
      `INSERT INTO job_applications (job_id, applicant_id, cv_original_name, cv_stored_name) VALUES ($1, $2, 'cv.pdf', 'test_cv.pdf')`,
      [jobId, student.id]
    );

    // Create fake CV file
    const cvPath = path.resolve(env.UPLOAD_DIR, 'test_cv.pdf');
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(cvPath, 'fake cv content');

    const res = await adminAgent
      .delete(`/api/admin/users/${student.id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User removed successfully');

    // Verify user is gone
    const checkUser = await query(`SELECT id FROM users WHERE id = $1`, [student.id]);
    expect(checkUser.rows.length).toBe(0);

    // Verify message is gone
    const checkMsg = await query(`SELECT id FROM messages WHERE sender_id = $1`, [student.id]);
    expect(checkMsg.rows.length).toBe(0);

    // Verify application is gone
    const checkApp = await query(`SELECT id FROM job_applications WHERE applicant_id = $1`, [student.id]);
    expect(checkApp.rows.length).toBe(0);

    // Verify CV file deleted
    expect(fs.existsSync(cvPath)).toBe(false);
  });

  it('allows admin to remove a rejected user', async () => {
    const { agent: adminAgent } = await loginAs('admin');
    const { user: student } = await loginAs('student');

    // Reject user first
    await query(`UPDATE users SET status = 'rejected', rejection_reason = 'Invalid ID' WHERE id = $1`, [student.id]);

    const res = await adminAgent
      .delete(`/api/admin/users/${student.id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User removed successfully');

    const checkUser = await query(`SELECT id FROM users WHERE id = $1`, [student.id]);
    expect(checkUser.rows.length).toBe(0);
  });

  it('prevents admin from removing themselves', async () => {
    const { agent: adminAgent, user: admin } = await loginAs('admin');

    const res = await adminAgent
      .delete(`/api/admin/users/${admin.id}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('prevents admin from removing another admin', async () => {
    const { agent: adminAgent } = await loginAs('admin');

    // Create another admin user
    const otherAdminRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ('Other Admin', 'otheradmin@uiu.test', 'hash', 'admin', 'approved') RETURNING id`
    );
    const otherAdminId = otherAdminRes.rows[0].id;

    const res = await adminAgent
      .delete(`/api/admin/users/${otherAdminId}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents non-admin from deleting users', async () => {
    const { agent: studentAgent } = await loginAs('student');
    const { user: alumni } = await loginAs('alumni');

    const res = await studentAgent
      .delete(`/api/admin/users/${alumni.id}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent user ID', async () => {
    const { agent: adminAgent } = await loginAs('admin');
    const fakeUuid = '00000000-0000-0000-0000-000000000000';

    const res = await adminAgent
      .delete(`/api/admin/users/${fakeUuid}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
