import { cancelOrEndMentorshipRequest, createMentorshipRequest, getMentorshipRequests, updateMentorshipStatus } from './service.js';

export async function handleGetMentorshipRequests(req, res) {
  const requests = await getMentorshipRequests(req.user);
  res.status(200).json(requests);
}

export async function handleCreateMentorshipRequest(req, res) {
  const request = await createMentorshipRequest(req.body, req.user);
  res.status(201).json(request);
}

export async function handleUpdateMentorshipStatus(req, res) {
  const updated = await updateMentorshipStatus(req.params.id, req.body.status, req.user);
  res.status(200).json(updated);
}

export async function handleDeleteMentorship(req, res) {
  const updated = await cancelOrEndMentorshipRequest(req.params.id, req.user);
  res.status(200).json(updated);
}
