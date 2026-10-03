import { deleteAdminUser, getAdminUserById, getAdminUsers, getAdminJobs, getAdminStats, updateAdminJob, updateAdminUser } from './service.js';

export async function handleGetAdminStats(req, res) {
  const stats = await getAdminStats();
  res.status(200).json(stats);
}

export async function handleGetAdminUsers(req, res) {
  const result = await getAdminUsers(req.query);
  res.status(200).json(result);
}

export async function handleGetAdminUserById(req, res) {
  const user = await getAdminUserById(req.params.id);
  res.status(200).json(user);
}

export async function handleUpdateAdminUser(req, res) {
  const updated = await updateAdminUser(req.params.id, req.body, req.user);
  res.status(200).json(updated);
}

export async function handleGetAdminJobs(req, res) {
  const result = await getAdminJobs(req.query);
  res.status(200).json(result);
}

export async function handleUpdateAdminJob(req, res) {
  const updated = await updateAdminJob(req.params.id, req.body, req.user);
  res.status(200).json(updated);
}

export async function handleDeleteAdminUser(req, res) {
  const result = await deleteAdminUser(req.params.id, req.user);
  res.status(200).json(result);
}
