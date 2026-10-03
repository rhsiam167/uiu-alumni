import { getMentors, getUserById, getUsersStats, updateUserProfile } from './service.js';

export async function handleGetStats(req, res) {
  const stats = await getUsersStats();
  res.status(200).json(stats);
}

export async function handleGetMentors(req, res) {
  const mentors = await getMentors(req.query);
  res.status(200).json(mentors);
}

export async function handleGetUserById(req, res) {
  const user = await getUserById(req.params.id, req.user);
  res.status(200).json(user);
}

export async function handleUpdateUser(req, res) {
  const updated = await updateUserProfile(req.params.id, req.body, req.user);
  res.status(200).json(updated);
}
