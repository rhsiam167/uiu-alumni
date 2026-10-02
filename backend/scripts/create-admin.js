import bcrypt from 'bcryptjs';
import readline from 'readline';
import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function createAdmin() {
  await runMigrations();

  console.log('\n--- Create Admin Account ---');
  const name = await question('Enter Admin Name: ');
  const email = await question('Enter Admin Email: ');
  const password = await question('Enter Admin Password: ');
  rl.close();

  if (!name.trim() || !email.trim() || !password) {
    console.error('❌ All fields are required.');
    process.exit(1);
  }

  // Validate password policy
  if (password.length < 8 || password.length > 72 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('❌ Password must be 8-72 characters long and contain at least one letter and one number.');
    process.exit(1);
  }

  const passHash = await bcrypt.hash(password, 12);
  const sql = `
    INSERT INTO users (name, email, password_hash, role, status, verified, created_at)
    VALUES ($1, $2, $3, 'admin', 'approved', true, now())
    RETURNING id, name, email;
  `;

  try {
    const res = await pool.query(sql, [name.trim(), email.trim().toLowerCase(), passHash]);
    console.log(`\n✅ Admin created successfully: ${res.rows[0].name} (${res.rows[0].email})`);
  } catch (err) {
    if (err.code === '23505') {
      console.error('❌ User with this email already exists.');
    } else {
      console.error('❌ Error creating admin:', err);
    }
  } finally {
    await pool.end();
  }
}

createAdmin();
