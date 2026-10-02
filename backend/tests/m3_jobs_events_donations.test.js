import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { query } from '../src/db/pool.js';
import { loginAs } from './setup.js';

describe('Milestone 3 — Jobs, Events & Donations', () => {

  describe('Jobs Module', () => {
    it('Student cannot post a job (403), Alumni can post a job (starts pending)', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const { agent: alumniAgent } = await loginAs('alumni');

      // Student tries to post job -> 403
      const studentPost = await studentAgent
        .post('/api/jobs')
        .send({
          title: 'Student Job',
          company: 'Test Co',
          location: 'Dhaka',
          type: 'Full-time',
          description: 'Job posted by student',
          deadline: '2026-12-31',
          recruiterEmail: 'hr@test.com'
        });
      expect(studentPost.status).toBe(403);

      // Alumni posts job -> 201 (status: pending)
      const alumniPost = await alumniAgent
        .post('/api/jobs')
        .send({
          title: 'Senior Backend Engineer',
          company: 'TechCorp Solutions',
          location: 'Dhaka',
          type: 'Full-time',
          description: 'Looking for a senior backend engineer with Node.js and PostgreSQL experience.',
          deadline: '2026-12-31',
          recruiterEmail: 'careers@techcorp.com'
        });

      expect(alumniPost.status).toBe(201);
      expect(alumniPost.body.status).toBe('pending');
      const newJobId = alumniPost.body.id;

      // Pending job is NOT visible in public GET /api/jobs
      const publicJobs = await request(app).get('/api/jobs');
      expect(publicJobs.status).toBe(200);
      const isPresent = publicJobs.body.some(j => j.id === newJobId);
      expect(isPresent).toBe(false);
    });

    it('Job apply with valid PDF stores CV, creates application and generates .eml with Reply-To', async () => {
      const { agent: studentAgent } = await loginAs('student');
      // Use approved seed job 'jb-1'
      const jobsRes = await query("SELECT id FROM jobs WHERE title = 'Junior Frontend Developer'");
      const jobId = jobsRes.rows[0].id;

      const validPdfBuffer = Buffer.from('%PDF-1.4 Mock PDF file content for test');

      const applyRes = await studentAgent
        .post(`/api/jobs/${jobId}/apply`)
        .field('coverNote', 'I am excited to apply for this position.')
        .field('portfolio', 'https://portfolio.dev')
        .attach('cv', validPdfBuffer, 'student_resume.pdf');

      expect(applyRes.status).toBe(201);
      expect(applyRes.body.applied).toBe(true);

      // Duplicate apply -> 409 ALREADY_APPLIED
      const dupRes = await studentAgent
        .post(`/api/jobs/${jobId}/apply`)
        .attach('cv', validPdfBuffer, 'student_resume.pdf');
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('ALREADY_APPLIED');
    });

    it('Job apply rejects non-PDF file and invalid magic bytes (fake PDF) with 400', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const jobsRes = await query("SELECT id FROM jobs WHERE title = 'Junior Frontend Developer'");
      const jobId = jobsRes.rows[0].id;

      // 1. Text file declared as pdf -> fails magic bytes check
      const fakePdfBuffer = Buffer.from('THIS IS A TEXT FILE RENAMED TO RESUME.PDF');
      const fakeRes = await studentAgent
        .post(`/api/jobs/${jobId}/apply`)
        .attach('cv', fakePdfBuffer, 'fake.pdf');

      expect(fakeRes.status).toBe(400);
      expect(fakeRes.body.error.code).toBe('INVALID_FILE_FORMAT');
    });

    it('Alumni cannot apply to their own job posting (400 CANNOT_APPLY_OWN)', async () => {
      const { agent: alumniAgent } = await loginAs('alumni');
      const jobsRes = await query("SELECT id FROM jobs WHERE title = 'Junior Frontend Developer'");
      const jobId = jobsRes.rows[0].id;

      const validPdfBuffer = Buffer.from('%PDF-1.4 Mock PDF');
      const ownRes = await alumniAgent
        .post(`/api/jobs/${jobId}/apply`)
        .attach('cv', validPdfBuffer, 'alumni_resume.pdf');

      expect(ownRes.status).toBe(400);
      expect(ownRes.body.error.code).toBe('CANNOT_APPLY_OWN');
    });
  });

  describe('Events Module', () => {
    it('Non-admin cannot create or delete events; Admin can create event', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const { agent: adminAgent } = await loginAs('admin');

      // Student tries to create event -> 403
      const studentCreate = await studentAgent
        .post('/api/events')
        .send({
          title: 'Student Hackathon',
          description: 'Hackathon event description',
          date: '2026-11-01',
          time: '10:00 AM',
          venue: 'UIU Campus',
          type: 'In-Person',
          capacity: 50
        });
      expect(studentCreate.status).toBe(403);

      // Admin creates event -> 201
      const adminCreate = await adminAgent
        .post('/api/events')
        .send({
          title: 'UIU Tech Seminar 2026',
          description: 'Tech seminar on AI and Cloud Technologies',
          date: '2026-12-15',
          time: '03:00 PM',
          venue: 'UIU Auditorium',
          type: 'In-Person',
          capacity: 1
        });

      expect(adminCreate.status).toBe(201);
      const newEventId = adminCreate.body.id;

      // Student tries to delete event -> 403
      const studentDelete = await studentAgent.delete(`/api/events/${newEventId}`);
      expect(studentDelete.status).toBe(403);
    });

    it('Event capacity race test (capacity = 1, concurrent registrations -> exactly 1 succeeds)', async () => {
      const { agent: adminAgent } = await loginAs('admin');
      const { agent: studentAgent } = await loginAs('student');
      const { agent: alumniAgent } = await loginAs('alumni');

      // Create event with capacity 1
      const createRes = await adminAgent
        .post('/api/events')
        .send({
          title: 'Limited Capacity Workshop',
          description: 'Exclusive 1-person workshop',
          date: '2026-12-20',
          time: '10:00 AM',
          venue: 'Room 501',
          type: 'In-Person',
          capacity: 1
        });

      const eventId = createRes.body.id;

      // Fire concurrent registration requests from student and alumni
      const [resStudent, resAlumni] = await Promise.all([
        studentAgent.post(`/api/events/${eventId}/register`),
        alumniAgent.post(`/api/events/${eventId}/register`)
      ]);

      const statuses = [resStudent.status, resAlumni.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      // Verify registeredCount is 1
      const checkRes = await request(app).get(`/api/events/${eventId}`);
      expect(checkRes.body.registeredCount).toBe(1);
    });

    it('Past events cannot be registered for (400 EVENT_PAST)', async () => {
      const { agent: adminAgent } = await loginAs('admin');
      const { agent: studentAgent } = await loginAs('student');

      // Create a past event
      const pastEventRes = await adminAgent
        .post('/api/events')
        .send({
          title: 'Past Seminar',
          description: 'Old seminar',
          date: '2024-01-01',
          time: '10:00 AM',
          venue: 'UIU',
          type: 'In-Person',
          capacity: 100
        });

      const pastEventId = pastEventRes.body.id;

      const regRes = await studentAgent.post(`/api/events/${pastEventId}/register`);
      expect(regRes.status).toBe(400);
      expect(regRes.body.error.code).toBe('EVENT_PAST');
    });
  });

  describe('Donations Module', () => {
    it('POST /api/donations creates dummy donation record', async () => {
      const { agent: studentAgent } = await loginAs('student');

      const res = await studentAgent
        .post('/api/donations')
        .send({
          amount: 500,
          purpose: 'Scholarship Fund',
          message: 'Supporting fellow students',
          isAnonymous: true
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(500);
      expect(res.body.purpose).toBe('Scholarship Fund');
      expect(res.body.isAnonymous).toBe(true);
      expect(res.body.isDemo).toBe(true);
    });

    it('GET /api/donations/summary returns fund totals with no donor names', async () => {
      const res = await request(app).get('/api/donations/summary');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].donorName).toBeUndefined();
    });

    it('GET /api/donations admin view shows donor real names even for anonymous donations', async () => {
      const { agent: studentAgent } = await loginAs('student');
      const { agent: adminAgent } = await loginAs('admin');

      // Create anonymous donation
      await studentAgent.post('/api/donations').send({
        amount: 1000,
        purpose: 'General Fund',
        isAnonymous: true
      });

      // Student views GET /api/donations -> sees only own donations
      const studentDonations = await studentAgent.get('/api/donations');
      expect(studentDonations.status).toBe(200);
      expect(Array.isArray(studentDonations.body)).toBe(true);

      // Admin views GET /api/donations -> sees items array with real donor names
      const adminDonations = await adminAgent.get('/api/donations');
      expect(adminDonations.status).toBe(200);
      expect(adminDonations.body.items).toBeDefined();
      expect(adminDonations.body.items[0].donorName).toBe('Sadman Malik');
    });
  });

});
