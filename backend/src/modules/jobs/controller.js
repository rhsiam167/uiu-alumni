import { applyToJob, createJob, deleteJob, getJobById, getMyApplications, getMyJobs, getPublicJobs, updateJob } from './service.js';

export async function handleGetPublicJobs(req, res) {
  const jobs = await getPublicJobs(req.query, req.user);
  res.status(200).json(jobs);
}

export async function handleGetJobById(req, res) {
  const job = await getJobById(req.params.id, req.user);
  res.status(200).json(job);
}

export async function handleGetMyJobs(req, res) {
  const jobs = await getMyJobs(req.user);
  res.status(200).json(jobs);
}

export async function handleGetMyApplications(req, res) {
  const apps = await getMyApplications(req.user);
  res.status(200).json(apps);
}

export async function handleCreateJob(req, res) {
  const job = await createJob(req.body, req.user);
  res.status(201).json(job);
}

export async function handleUpdateJob(req, res) {
  const job = await updateJob(req.params.id, req.body, req.user);
  res.status(200).json(job);
}

export async function handleDeleteJob(req, res) {
  const result = await deleteJob(req.params.id, req.user);
  res.status(200).json(result);
}

export async function handleApplyJob(req, res) {
  const result = await applyToJob(req.params.id, req, req.user);
  res.status(201).json(result);
}
