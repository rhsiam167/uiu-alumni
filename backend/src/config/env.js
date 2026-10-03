import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
  DATABASE_URL_TEST: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.string().transform(v => v === 'true').default('false'),
  APP_BASE_URL: z.string().url().default('http://localhost:5000'),
  CORS_ORIGIN: z.string().optional().default('http://localhost:5000'),
  MAIL_MODE: z.enum(['log', 'smtp']).default('log'),
  MAIL_FROM: z.string().default('UIU Alumni Portal <no-reply@uiu.ac.bd>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform(v => (v ? Number(v) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_CV_MB: z.string().default('5').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:', parsed.error.format());
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  const weakSecrets = ['super_secret_jwt_key_uiu_alumni_portal_2026_min32chars', 'secret', 'default_jwt_secret_value_must_change_in_prod'];
  if (weakSecrets.includes(parsed.data.JWT_SECRET)) {
    console.error('❌ In production, JWT_SECRET must not be set to a default/weak secret!');
    process.exit(1);
  }
}

export const env = parsed.data;
