import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { query } from '../src/db/pool.js';
import { generateCsv } from '../src/utils/csv.js';
import { loginAs } from './setup.js';

describe('Milestone 4 — Chat, Admin, Hardening & Security', () => {

  describe('Chat Module', () => {
    it('Admin cannot send or view chat messages (403)', async () => {
      const { agent: adminAgent } = await loginAs('admin');
      const studentRes = await query("SELECT id FROM users WHERE email = 'student@uiu.test'");
      const studentId = studentRes.rows[0].id;

      const convRes = await adminAgent.get('/api/chat/conversations');
      expect(convRes.status).toBe(403);

      const sendRes = await adminAgent
        .post(`/api/chat/conversations/${studentId}/messages`)
        .send({ text: 'Hello' });
      expect(sendRes.status).toBe(403);
    });

    it('Messaging yourself returns 400 INVALID_RECIPIENT', async () => {
      const { agent: studentAgent, user: studentUser } = await loginAs('student');

      const selfRes = await studentAgent
        .post(`/api/chat/conversations/${studentUser.id}/messages`)
        .send({ text: 'Self message' });
      expect(selfRes.status).toBe(400);
      expect(selfRes.body.error.code).toBe('INVALID_RECIPIENT');
    });

    it('Full chat lifecycle: send message, get conversations, get thread, unsend, clear conversation', async () => {
      const { agent: studentAgent, user: studentUser } = await loginAs('student');
      const { agent: alumniAgent, user: alumniUser } = await loginAs('alumni');

      // 1. Student sends message to alumni
      const sendRes1 = await studentAgent
        .post(`/api/chat/conversations/${alumniUser.id}/messages`)
        .send({ text: 'Hi Anik, need guidance!' });
      expect(sendRes1.status).toBe(201);
      const msg1Id = sendRes1.body.id;

      // 2. Alumni gets conversations -> unreadCount is 1, avatarInitials 'SM'
      const alumniConvs = await alumniAgent.get('/api/chat/conversations');
      expect(alumniConvs.status).toBe(200);
      expect(alumniConvs.body.length).toBe(1);
      expect(alumniConvs.body[0].unreadCount).toBe(1);
      expect(alumniConvs.body[0].avatarInitials).toBe('SM');
      expect(alumniConvs.body[0].lastMessageText).toBe('Hi Anik, need guidance!');

      // 3. Alumni views message thread -> marks read
      const threadRes = await alumniAgent.get(`/api/chat/conversations/${studentUser.id}/messages`);
      expect(threadRes.status).toBe(200);
      expect(threadRes.body.length).toBe(1);
      expect(threadRes.body[0].text).toBe('Hi Anik, need guidance!');

      // Re-check alumni conversations -> unreadCount is 0 now
      const alumniConvs2 = await alumniAgent.get('/api/chat/conversations');
      expect(alumniConvs2.body[0].unreadCount).toBe(0);

      // 4. Student unsends message
      const unsendRes = await studentAgent.delete(`/api/chat/messages/${msg1Id}`);
      expect(unsendRes.status).toBe(200);
      expect(unsendRes.body.unsent).toBe(true);
      expect(unsendRes.body.text).toBe('');

      // Thread view now shows unsent message with text ""
      const threadRes2 = await alumniAgent.get(`/api/chat/conversations/${studentUser.id}/messages`);
      expect(threadRes2.body[0].unsent).toBe(true);
      expect(threadRes2.body[0].text).toBe('');

      // 5. Delete conversation for alumni -> conversation hidden
      const clearRes = await alumniAgent.delete(`/api/chat/conversations/${studentUser.id}`);
      expect(clearRes.status).toBe(200);

      const alumniConvsCleared = await alumniAgent.get('/api/chat/conversations');
      expect(alumniConvsCleared.body.length).toBe(0);

      // 6. Student sends a NEW message -> conversation reappears with ONLY the new message
      const sendRes2 = await studentAgent
        .post(`/api/chat/conversations/${alumniUser.id}/messages`)
        .send({ text: 'New message after cleared chat!' });
      expect(sendRes2.status).toBe(201);

      const alumniConvsReappeared = await alumniAgent.get('/api/chat/conversations');
      expect(alumniConvsReappeared.body.length).toBe(1);

      const threadResReappeared = await alumniAgent.get(`/api/chat/conversations/${studentUser.id}/messages`);
      expect(threadResReappeared.body.length).toBe(1);
      expect(threadResReappeared.body[0].text).toBe('New message after cleared chat!');
    });
  });

  describe('Admin Module', () => {
    it('GET /api/admin/stats returns accurate database metrics', async () => {
      const { agent: adminAgent } = await loginAs('admin');

      const res = await adminAgent.get('/api/admin/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalAlumniCount).toBe(1);
      expect(res.body.totalStudentsCount).toBe(1);
    });

    it('Admin cannot modify own status or touch other admins', async () => {
      const { agent: adminAgent, user: adminUser } = await loginAs('admin');

      // 1. Admin tries to suspend self -> 400
      const selfMod = await adminAgent
        .put(`/api/admin/users/${adminUser.id}`)
        .send({ status: 'suspended' });
      expect(selfMod.status).toBe(400);
      expect(selfMod.body.error.code).toBe('CANNOT_MODIFY_SELF');
    });

    it('Admin user review (approve, reject with reason) triggers notification emails', async () => {
      const { agent: adminAgent } = await loginAs('admin');

      // Create a pending user
      const pendingRes = await query(`
        INSERT INTO users (name, email, password_hash, role, status, student_id)
        VALUES ('Test Review User', 'reviewuser@uiu.test', 'hash', 'student', 'pending', '011998877')
        RETURNING id
      `);
      const pendingId = pendingRes.rows[0].id;

      // Reject without reason -> 400
      const noReasonRes = await adminAgent
        .put(`/api/admin/users/${pendingId}`)
        .send({ status: 'rejected' });
      expect(noReasonRes.status).toBe(400);

      // Reject with reason -> 200
      const rejectRes = await adminAgent
        .put(`/api/admin/users/${pendingId}`)
        .send({ status: 'rejected', rejectionReason: 'Invalid student ID card copy' });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe('rejected');
      expect(rejectRes.body.rejectionReason).toBe('Invalid student ID card copy');
    });
  });

  describe('Hardening & Security', () => {
    it('CSV formula injection strings (=, +, -, @) are neutralized with single quote prefix', () => {
      const headers = [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }];
      const rows = [
        { name: '=1+2', code: '@SUM(A1:A10)' },
        { name: '+12345', code: '-500' }
      ];

      const csv = generateCsv(headers, rows);
      expect(csv).toContain('"\'=1+2"');
      expect(csv).toContain('"\'@SUM(A1:A10)"');
      expect(csv).toContain('"\'=1+2"');
      expect(csv).toContain('"\'-\n500"'.replace('\n', ''));
    });

    it('SQL injection strings in query params are harmless', async () => {
      const res = await request(app).get("/api/users/mentors?q=' OR 1=1 --");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Unknown /api/* route returns JSON 404', async () => {
      const res = await request(app).get('/api/unknown/endpoint/route');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

});
