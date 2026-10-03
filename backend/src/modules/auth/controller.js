import { env } from '../../config/env.js';
import { toUserSelfDto } from './dto.js';
import { changePassword, loginUser, registerUser } from './service.js';
import { query } from '../../db/pool.js';
import { toCareerEntryDto } from '../users/service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export async function handleRegister(req, res) {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function handleLogin(req, res) {
  const { email, password } = req.body;
  const { token, user } = await loginUser(email, password);
  res.cookie('token', token, COOKIE_OPTIONS);
  res.status(200).json({ user });
}

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE
};

export async function handleLogout(req, res) {
  res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
  res.status(200).json({ message: 'Logged out successfully' });
}

export async function handleGetMe(req, res) {
  const dto = toUserSelfDto(req.user);
  const timelineRes = await query(
    'SELECT * FROM career_entries WHERE user_id = $1 ORDER BY position ASC, start_date DESC',
    [req.user.id]
  );
  dto.careerTimeline = timelineRes.rows.map(toCareerEntryDto);
  res.status(200).json({ user: dto });
}

export async function handleChangePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const result = await changePassword(req.user.id, currentPassword, newPassword);
  res.status(200).json(result);
}
