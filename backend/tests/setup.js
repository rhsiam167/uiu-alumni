import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import app from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { seedDatabase } from '../scripts/seed.js';

beforeAll(async () => {
  // Ensure we are testing on the test DB
  process.env.NODE_ENV = 'test';
  await runMigrations();
});

beforeEach(async () => {
  // Reset DB tables between test runs
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE users, career_entries, mentorship_requests, jobs, job_applications, events, event_registrations, donations, messages, conversation_state CASCADE');
    await client.query('COMMIT');
  } finally {
    client.release();
  }
  await seedDatabase();
});

afterAll(async () => {
  await pool.end();
});

export async function loginAs(role) {
  const agent = request.agent(app);
  let email = 'student@uiu.test';
  if (role === 'admin') email = 'admin@uiu.test';
  if (role === 'alumni') email = 'alumni@uiu.test';

  const res = await agent
    .post('/api/auth/login')
    .send({ email, password: 'Test@1234' });

  if (res.status !== 200) {
    throw new Error(`loginAs(${role}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { agent, user: res.body.user, cookie: res.headers['set-cookie'] };
}
