import { runMigrations } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
