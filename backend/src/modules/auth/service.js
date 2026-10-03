import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { toUserSelfDto } from './dto.js';

// Use 4 rounds in test environment for fast execution, 12 in development/production
const BCRYPT_SALT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;

// Dummy hash for timing attack equalization
const DUMMY_HASH = '$2a$04$e8765432101234567890123456789012345678901234567890123';

export async function registerUser(data) {
  const { name, email, password, role, studentId, phone, department, program, graduationYear, currentSemester, expectedGraduation, company, jobTitle, city, linkedin } = data;

  // Check email
  const existingEmail = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existingEmail.rows.length > 0) {
    throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email address already exists');
  }

  // Check studentId
  if (studentId) {
    const existingStudentId = await query('SELECT id FROM users WHERE student_id = $1', [studentId]);
    if (existingStudentId.rows.length > 0) {
      throw new ApiError(409, 'STUDENT_ID_EXISTS', 'An account with this Student ID already exists');
    }
  }

  const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const sql = `
    INSERT INTO users (
      name, email, password_hash, role, status, student_id, phone, department, program,
      graduation_year, current_semester, expected_graduation, company, job_title, city, linkedin
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  const params = [
    name, email.toLowerCase(), hash, role, studentId || null, phone || null, department || null, program || null,
    graduationYear || null, currentSemester || null, expectedGraduation || null, company || null, jobTitle || null, city || null, linkedin || null
  ];

  await query(sql, params);

  return { message: 'Registration submitted successfully. Pending admin approval.', status: 'pending' };
}

export async function loginUser(email, password) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = rows[0];

  if (!user) {
    // Perform dummy compare to prevent timing side-channel attacks
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Check user status
  if (user.status !== 'approved') {
    if (user.status === 'pending') {
      throw new ApiError(403, 'ACCOUNT_PENDING', 'Your account is pending admin approval');
    } else if (user.status === 'rejected') {
      throw new ApiError(403, 'ACCOUNT_REJECTED', 'Your account application was rejected', [
        { field: 'status', message: user.rejection_reason || 'No reason provided' }
      ]);
    } else if (user.status === 'suspended') {
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { token, user: toUserSelfDto(user) };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, userId]);
  return { message: 'Password updated successfully' };
}
