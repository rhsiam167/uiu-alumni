import pg from 'pg';
import { env } from '../config/env.js';

const connectionString = env.NODE_ENV === 'test' && env.DATABASE_URL_TEST
  ? env.DATABASE_URL_TEST
  : env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
});

export const query = (text, params) => pool.query(text, params);
