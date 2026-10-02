import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { query } from '../src/db/pool.js';
import { loginAs } from './setup.js';

describe('Milestone 2 — Users & Mentorship', () => {

  describe('Users Module', () => {
    it('GET /api/users/stats returns real counts of approved records', async () => {
      const res = await request(app).get('/api/users/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalAlumni: 1,
        totalStudents: 1,
        activeJobs: 1,
        upcomingEvents: 1
      });
    });

    it('GET /api/users/mentors returns approved alumni mentors with public DTO only', async () => {
      const res = await request(app).get('/api/users/mentors?q=TechCorp');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const mentor = res.body[0];
      expect(mentor.name).toBe('Anik Rahman');
      expect(mentor.email).toBeUndefined();
      expect(mentor.phone).toBeUndefined();
      expect(mentor.studentId).toBeUndefined();
      expect(mentor.status).toBeUndefined();
      expect(mentor.willingToMentor).toBe(true);
    });

    it('GET /api/users/:id privacy checks: guest cannot view student profile, public view omits private fields', async () => {
      // 1. Get alumni user ID & student user ID
      const alumniRes = await query("SELECT id FROM users WHERE email = 'alumni@uiu.test'");
      const alumniId = alumniRes.rows[0].id;
      const studentRes = await query("SELECT id FROM users WHERE email = 'student@uiu.test'");
      const studentId = studentRes.rows[0].id;

      // Guest views student profile -> 404
      const guestStudentRes = await request(app).get(`/api/users/${studentId}`);
      expect(guestStudentRes.status).toBe(404);

      // Guest views approved alumni profile -> 200 with public fields
      const guestAlumniRes = await request(app).get(`/api/users/${alumniId}`);
      expect(guestAlumniRes.status).toBe(200);
      expect(guestAlumniRes.body.name).toBe('Anik Rahman');
      expect(guestAlumniRes.body.email).toBeUndefined();
      expect(guestAlumniRes.body.phone).toBeUndefined();
      expect(guestAlumniRes.body.studentId).toBeUndefined();
      expect(guestAlumniRes.body.careerTimeline).toBeDefined();
      expect(guestAlumniRes.body.careerTimeline.length).toBe(3);

      // Self views own student profile -> 200 with self fields
      const { agent: studentAgent } = await loginAs('student');
      const selfRes = await studentAgent.get(`/api/users/${studentId}`);
      expect(selfRes.status).toBe(200);
      expect(selfRes.body.email).toBe('student@uiu.test');
      expect(selfRes.body.studentId).toBe('011211050');
    });

    it('PUT /api/users/:id enforces self-only edit, forbidden field rejection, and career timeline replace-all', async () => {
      const { agent: studentAgent, user: studentUser } = await loginAs('student');
      const { user: alumniUser } = await loginAs('alumni');

      // 1. Edit another user's profile -> 403
      const forbiddenEdit = await studentAgent
        .put(`/api/users/${alumniUser.id}`)
        .send({ city: 'Chittagong' });
      expect(forbiddenEdit.status).toBe(403);

      // 2. Forbidden field change (e.g., studentId) -> 400
      const invalidField = await studentAgent
        .put(`/api/users/${studentUser.id}`)
        .send({ studentId: 'NEW-STUDENT-ID' });
      expect(invalidField.status).toBe(400);
      expect(invalidField.body.error.code).toBe('INVALID_UPDATE');

      // 3. Student trying willingToMentor = true -> 400
      const invalidMentorRole = await studentAgent
        .put(`/api/users/${studentUser.id}`)
        .send({ willingToMentor: true });
      expect(invalidMentorRole.status).toBe(400);

      // 4. Valid update with careerTimeline replace-all
      const validEdit = await studentAgent
        .put(`/api/users/${studentUser.id}`)
        .send({
          bio: 'Updated bio by student',
          city: 'Sylhet, Bangladesh',
          careerTimeline: [
            {
              type: 'Work',
              title: 'Junior Web Dev',
              organization: 'StartUp BD',
              startDate: '2024-01-01',
              endDate: 'Present',
              description: 'Frontend work'
            }
          ]
        });

      expect(validEdit.status).toBe(200);
      expect(validEdit.body.bio).toBe('Updated bio by student');
      expect(validEdit.body.city).toBe('Sylhet, Bangladesh');
      expect(validEdit.body.careerTimeline.length).toBe(1);
      expect(validEdit.body.careerTimeline[0].title).toBe('Junior Web Dev');
      expect(validEdit.body.careerTimeline[0].endDate).toBe('Present');
    });

    it('PUT /api/users/:id rejects invalid date range (endDate < startDate)', async () => {
      const { agent: studentAgent, user: studentUser } = await loginAs('student');

      const invalidDateRes = await studentAgent
        .put(`/api/users/${studentUser.id}`)
        .send({
          careerTimeline: [
            {
              type: 'Work',
              title: 'Invalid Work',
              organization: 'Org',
              startDate: '2024-05-01',
              endDate: '2023-01-01'
            }
          ]
        });

      expect(invalidDateRes.status).toBe(400);
      expect(invalidDateRes.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('Mentorship Module', () => {
    it('POST /api/mentorship/requests creates request and handles duplicate race condition (409 DUPLICATE_REQUEST)', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const alumniRes = await query("SELECT id FROM users WHERE email = 'alumni@uiu.test'");
      const mentorId = alumniRes.rows[0].id;

      // 1. First POST -> 201 Created
      const createRes = await studentAgent
        .post('/api/mentorship/requests')
        .send({
          mentorId,
          topic: 'Career Guidance',
          message: 'Hi, I would love career advice on software engineering.'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.topic).toBe('Career Guidance');
      expect(createRes.body.status).toBe('pending');
      const reqId = createRes.body.id;

      // 2. Duplicate POST while pending -> 409 DUPLICATE_REQUEST
      const dupRes = await studentAgent
        .post('/api/mentorship/requests')
        .send({
          mentorId,
          topic: 'Another Topic',
          message: 'Second message'
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('DUPLICATE_REQUEST');
    });

    it('PUT /api/mentorship/requests/:id allows mentor to accept/decline, non-mentor gets 403', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const { agent: alumniAgent } = await loginAs('alumni');
      const alumniRes = await query("SELECT id FROM users WHERE email = 'alumni@uiu.test'");
      const mentorId = alumniRes.rows[0].id;

      // Create request
      const createRes = await studentAgent
        .post('/api/mentorship/requests')
        .send({ mentorId, topic: 'System Design', message: 'Hello' });

      const reqId = createRes.body.id;

      // Student tries to accept own request -> 403
      const studentAccept = await studentAgent
        .put(`/api/mentorship/requests/${reqId}`)
        .send({ status: 'accepted' });
      expect(studentAccept.status).toBe(403);

      // Alumni (mentor) accepts request -> 200
      const mentorAccept = await alumniAgent
        .put(`/api/mentorship/requests/${reqId}`)
        .send({ status: 'accepted' });
      expect(mentorAccept.status).toBe(200);
      expect(mentorAccept.body.status).toBe('accepted');
    });

    it('DELETE /api/mentorship/requests/:id cancels pending request and allows new request afterwards', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const { agent: alumniAgent } = await loginAs('alumni');
      const alumniRes = await query("SELECT id FROM users WHERE email = 'alumni@uiu.test'");
      const mentorId = alumniRes.rows[0].id;

      // Create request
      const createRes = await studentAgent
        .post('/api/mentorship/requests')
        .send({ mentorId, topic: 'Resume Review', message: 'Please check my CV' });

      const reqId = createRes.body.id;

      // Student cancels pending request -> 200 (status: cancelled)
      const cancelRes = await studentAgent.delete(`/api/mentorship/requests/${reqId}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      // Mentor GET /mentorship/requests does NOT show cancelled request
      const mentorRequests = await alumniAgent.get('/api/mentorship/requests');
      expect(mentorRequests.status).toBe(200);
      const containsCancelled = mentorRequests.body.some(r => r.id === reqId);
      expect(containsCancelled).toBe(false);

      // Student can now submit a NEW request to the same mentor
      const newReqRes = await studentAgent
        .post('/api/mentorship/requests')
        .send({ mentorId, topic: 'New Topic After Cancel', message: 'Trying again' });

      expect(newReqRes.status).toBe(201);
      expect(newReqRes.body.topic).toBe('New Topic After Cancel');
    });
  });

});
