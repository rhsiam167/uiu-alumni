import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { query } from '../src/db/pool.js';
import { loginAs } from './setup.js';

describe('Milestone 1 — Foundation & Authentication', () => {
  it('GET /health returns 200 { status: "ok", db: "up" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('POST /api/auth/register validates required fields and creates pending user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Student',
        email: 'newstudent@uiu.test',
        password: 'Password123',
        role: 'student',
        studentId: '011223344',
        department: 'CSE'
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');

    // Check DB status is pending and does not log in
    const { rows } = await query('SELECT * FROM users WHERE email = $1', ['newstudent@uiu.test']);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('pending');
  });

  it('POST /api/auth/register rejects duplicate email or studentId with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Email',
        email: 'student@uiu.test', // already exists in seed
        password: 'Password123',
        role: 'student',
        studentId: '099999999'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('POST /api/auth/login blocks pending, rejected, suspended users with clear codes', async () => {
    const passHash = await bcrypt.hash('Test@1234', 4);

    // 1. Create a pending user
    await query(`
      INSERT INTO users (name, email, password_hash, role, status, student_id)
      VALUES ('Pending User', 'pending@uiu.test', $1, 'student', 'pending', '011999888')
    `, [passHash]);

    const resPending = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pending@uiu.test', password: 'Test@1234' });

    expect(resPending.status).toBe(403);
    expect(resPending.body.error.code).toBe('ACCOUNT_PENDING');

    // 2. Rejected user
    await query(`
      INSERT INTO users (name, email, password_hash, role, status, rejection_reason, student_id)
      VALUES ('Rejected User', 'rejected@uiu.test', $1, 'student', 'rejected', 'Invalid student ID document', '011999887')
    `, [passHash]);

    const resRejected = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rejected@uiu.test', password: 'Test@1234' });

    expect(resRejected.status).toBe(403);
    expect(resRejected.body.error.code).toBe('ACCOUNT_REJECTED');
    expect(resRejected.body.error.details[0].message).toBe('Invalid student ID document');

    // 3. Suspended user
    await query(`
      INSERT INTO users (name, email, password_hash, role, status, student_id)
      VALUES ('Suspended User', 'suspended@uiu.test', $1, 'student', 'suspended', '011999886')
    `, [passHash]);

    const resSuspended = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suspended@uiu.test', password: 'Test@1234' });

    expect(resSuspended.status).toBe(403);
    expect(resSuspended.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('POST /api/auth/login sets httpOnly cookie and returns user self DTO without password_hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@uiu.test', password: 'Test@1234' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('student@uiu.test');
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
    expect(cookies[0]).toMatch(/SameSite=Lax/i);
  });

  it('POST /api/auth/login returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@uiu.test', password: 'WrongPassword123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me returns current authenticated user', async () => {
    const { agent, user } = await loginAs('student');

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.email).toBe('student@uiu.test');
  });

  it('POST /api/auth/logout clears token cookie', async () => {
    const { agent } = await loginAs('student');

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('PUT /api/auth/password changes password and new password allows login', async () => {
    const { agent } = await loginAs('student');

    const changeRes = await agent
      .put('/api/auth/password')
      .send({ currentPassword: 'Test@1234', newPassword: 'NewPassword123' });

    expect(changeRes.status).toBe(200);

    // Old password fails
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@uiu.test', password: 'Test@1234' });
    expect(oldLogin.status).toBe(401);

    // New password succeeds
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@uiu.test', password: 'NewPassword123' });
    expect(newLogin.status).toBe(200);
  });

  it('Suspended user old cookie stops working immediately on next request', async () => {
    const { agent, user } = await loginAs('student');

    // Verify working
    const res1 = await agent.get('/api/auth/me');
    expect(res1.status).toBe(200);

    // Admin suspends user in DB
    await query("UPDATE users SET status = 'suspended' WHERE id = $1", [user.id]);

    // Next request with same cookie must be blocked with 403 ACCOUNT_SUSPENDED
    const res2 = await agent.get('/api/auth/me');
    expect(res2.status).toBe(403);
    expect(res2.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
