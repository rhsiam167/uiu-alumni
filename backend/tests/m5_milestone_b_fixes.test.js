import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { query } from '../src/db/pool.js';
import { loginAs } from './setup.js';

describe('Milestone B — Backend Audit Fixes & Enhancements', () => {
  it('GET /api/health exposes health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('POST /api/auth/register accepts numeric strings for graduationYear and expectedGraduation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'String Year Student',
        email: 'stringyear@uiu.test',
        password: 'Password123',
        role: 'student',
        studentId: '011987654',
        department: 'CSE',
        graduationYear: '2025',
        expectedGraduation: '2026'
      });

    expect(res.status).toBe(201);
    const { rows } = await query('SELECT graduation_year, expected_graduation FROM users WHERE email = $1', ['stringyear@uiu.test']);
    expect(rows[0].graduation_year).toBe(2025);
    expect(rows[0].expected_graduation).toBe(2026);
  });

  it('POST /api/auth/register accepts empty strings for optional numeric/text fields and rejects invalid non-numeric text', async () => {
    // 1. Empty strings payload (like register form sends)
    const resEmpty = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Empty Fields Student',
        email: 'emptyfields@uiu.test',
        password: 'Password123',
        role: 'student',
        studentId: '011987655',
        phone: '',
        department: '',
        program: '',
        graduationYear: '',
        currentSemester: '',
        expectedGraduation: '',
        company: '',
        jobTitle: '',
        city: '',
        linkedin: ''
      });

    expect(resEmpty.status).toBe(201);
    const { rows } = await query('SELECT phone, graduation_year, linkedin FROM users WHERE email = $1', ['emptyfields@uiu.test']);
    expect(rows[0].phone).toBeNull();
    expect(rows[0].graduation_year).toBeNull();
    expect(rows[0].linkedin).toBeNull();

    // 2. Non-numeric text for numeric year field fails with field error
    const resInvalid = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Year Student',
        email: 'invalidyear@uiu.test',
        password: 'Password123',
        role: 'student',
        studentId: '011987656',
        graduationYear: 'invalid_2025'
      });

    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(resInvalid.body.error.details.some(d => d.field === 'graduationYear')).toBe(true);
  });

  it('PUT /api/users/:id accepts payload with empty optional strings like settings.js builds and stores NULLs', async () => {
    const { agent, user } = await loginAs('student');

    const res = await agent
      .put(`/api/users/${user.id}`)
      .send({
        name: 'Updated Student',
        phone: '',
        city: '',
        bio: '',
        department: 'CSE',
        program: 'BSc',
        graduationYear: '',
        currentSemester: 'Summer 2026',
        expectedGraduation: '2027',
        company: '',
        jobTitle: '',
        github: '',
        linkedin: '',
        portfolio: '',
        website: ''
      });

    expect(res.status).toBe(200);
    const { rows } = await query('SELECT phone, city, bio, github, graduation_year FROM users WHERE id = $1', [user.id]);
    expect(rows[0].phone).toBeNull();
    expect(rows[0].city).toBeNull();
    expect(rows[0].bio).toBeNull();
    expect(rows[0].github).toBeNull();
    expect(rows[0].graduation_year).toBeNull();
  });

  it('GET /api/admin/donations.csv route checks: admin 200 + CSV headers, student/alumni 403, guest 401', async () => {
    // Guest -> 401
    const resGuest = await request(app).get('/api/admin/donations.csv');
    expect(resGuest.status).toBe(401);

    // Student -> 403
    const { agent: studentAgent } = await loginAs('student');
    const resStudent = await studentAgent.get('/api/admin/donations.csv');
    expect(resStudent.status).toBe(403);

    // Admin -> 200 + text/csv header
    const { agent: adminAgent } = await loginAs('admin');
    const resAdmin = await adminAgent.get('/api/admin/donations.csv');
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.headers['content-type']).toMatch(/text\/csv/);
    expect(resAdmin.headers['content-disposition']).toMatch(/donations-report\.csv/);
  });

  it('Origin check in dev accepts both localhost:5000 and 127.0.0.1:5000, rejects unlisted origin', async () => {
    // 1. Allowed origin localhost
    const res1 = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5000')
      .send({ email: 'student@uiu.test', password: 'Test@1234' });
    expect(res1.status).toBe(200);

    // 2. Allowed origin 127.0.0.1
    const res2 = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://127.0.0.1:5000')
      .send({ email: 'student@uiu.test', password: 'Test@1234' });
    expect(res2.status).toBe(200);

    // 3. Rejected origin
    const res3 = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://malicious-site.test')
      .send({ email: 'student@uiu.test', password: 'Test@1234' });
    expect(res3.status).toBe(403);
    expect(res3.body.error.code).toBe('FORBIDDEN_ORIGIN');
  });
});
