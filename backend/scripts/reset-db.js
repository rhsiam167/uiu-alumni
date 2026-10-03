import { env } from '../src/config/env.js';
import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { seedDatabase } from './seed.js';

async function resetDb() {
  if (env.NODE_ENV === 'production') {
    console.error('❌ REFUSING TO RUN reset-db IN PRODUCTION!');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('🔄 Dropping schema public...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('✅ Schema reset complete. Running migrations and seed...');
  } finally {
    client.release();
  }

  await runMigrations();
  await seedDatabase();
  console.log('✅ Reset-db finished successfully.');
}

resetDb()
  .then(() => pool.end())
  .catch(err => {
    console.error('❌ reset-db failed:', err);
    pool.end();
    process.exit(1);
  });
