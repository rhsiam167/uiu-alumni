import bcrypt from 'bcryptjs';
import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const saltRounds = process.env.NODE_ENV === 'test' ? 4 : 12;
    const passHash = await bcrypt.hash('Test@1234', saltRounds);

    // 1. Admin user
    const adminRes = await client.query(`
      INSERT INTO users (
        name, email, password_hash, role, status, verified, student_id, department, program, created_at
      ) VALUES (
        'UIU Portal Administrator', 'admin@uiu.test', $1, 'admin', 'approved', true, 'ADM-001', 'CSE', 'BSc in CSE', '2025-01-01'
      ) ON CONFLICT (lower(email)) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status
      RETURNING id;
    `, [passHash]);
    const adminId = adminRes.rows[0].id;

    // 2. Alumni user
    const alumniRes = await client.query(`
      INSERT INTO users (
        name, email, password_hash, role, status, verified, student_id, department, program,
        graduation_year, company, job_title, city, willing_to_mentor, mentor_expertise, bio,
        github, linkedin, portfolio, created_at
      ) VALUES (
        'Anik Rahman', 'alumni@uiu.test', $1, 'alumni', 'approved', true, '011171001', 'CSE', 'BSc in CSE',
        2021, 'TechCorp Solutions', 'Software Engineer', 'Dhaka, Bangladesh', true,
        ARRAY['Software Development', 'System Architecture', 'Interview Prep'],
        'Passionate software engineer building high-scale distributed systems. Happy to mentor UIU students!',
        'https://github.com', 'https://linkedin.com', 'https://portfolio.dev', '2025-01-10'
      ) ON CONFLICT (lower(email)) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status,
        willing_to_mentor = EXCLUDED.willing_to_mentor
      RETURNING id;
    `, [passHash]);
    const alumniId = alumniRes.rows[0].id;

    // Career entries for alumni
    await client.query('DELETE FROM career_entries WHERE user_id = $1', [alumniId]);
    await client.query(`
      INSERT INTO career_entries (user_id, type, title, organization, start_date, end_date, description, position)
      VALUES 
        ($1, 'Work', 'Software Engineer', 'TechCorp Solutions Inc.', '2021-06-01', NULL, 'Working on large-scale distributed systems and cloud infrastructure.', 1),
        ($1, 'Work', 'Intern Developer', 'DevHouse BD', '2020-01-01', '2021-05-31', 'Assisted in frontend development using React and client projects.', 2),
        ($1, 'Education', 'BSc in Computer Science & Engineering', 'United International University', '2017-01-01', '2021-05-01', 'Graduated with Magna Cum Laude honors.', 3);
    `, [alumniId]);

    // 3. Student user
    await client.query(`
      INSERT INTO users (
        name, email, password_hash, role, status, verified, student_id, department, program,
        current_semester, expected_graduation, city, bio, github, linkedin, created_at
      ) VALUES (
        'Sadman Malik', 'student@uiu.test', $1, 'student', 'approved', false, '011211050', 'CSE', 'BSc in CSE',
        '9th Trimester', 2026, 'Dhaka, Bangladesh',
        'Senior CSE student interested in Full-Stack development and Cloud Computing.',
        'https://github.com', 'https://linkedin.com', '2025-02-01'
      ) ON CONFLICT (lower(email)) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status;
    `, [passHash]);

    // 4. Event
    const existingEvent = await client.query("SELECT id FROM events WHERE title = 'UIU Annual Alumni Gala & Networking 2026'");
    if (existingEvent.rows.length === 0) {
      await client.query(`
        INSERT INTO events (title, description, event_date, event_time, venue, type, capacity, created_by, created_at)
        VALUES (
          'UIU Annual Alumni Gala & Networking 2026',
          'Join us for the premier annual networking event connecting UIU alumni, top industry experts, and current students. Food, drinks, and career sessions included!',
          '2026-11-28', '06:00 PM', 'Radisson Blu, Dhaka', 'In-Person', 200, $1, '2026-01-15'
        );
      `, [adminId]);
    }

    // 5. Job
    const existingJob = await client.query("SELECT id FROM jobs WHERE title = 'Junior Frontend Developer'");
    if (existingJob.rows.length === 0) {
      await client.query(`
        INSERT INTO jobs (posted_by, title, company, location, type, salary, description, requirements, deadline, recruiter_email, status, created_at)
        VALUES (
          $1, 'Junior Frontend Developer', 'TechCorp Solutions', 'Dhaka (Hybrid)', 'Full-time',
          '45,000 - 60,000 BDT',
          'We are seeking a talented Junior Frontend Developer to join our UI/UX team. You will build high-quality web interfaces.',
          'HTML, CSS, JavaScript, ES6+, REST APIs, Git. Strong problem-solving skills.',
          '2026-12-31', 'recruiter@techcorp.com', 'approved', '2026-02-01'
        );
      `, [alumniId]);
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with 5 test records');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1].endsWith('seed.js')) {
  runMigrations()
    .then(() => seedDatabase())
    .then(() => pool.end())
    .catch(err => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}
