export function toMentorshipRequestDto(req) {
  if (!req) return null;
  return {
    id: req.id,
    requesterId: req.requester_id,
    requesterName: req.requester_name || '',
    requesterDepartment: req.requester_department || '',
    requesterBatch: req.requester_graduation_year || req.requester_expected_graduation || '',
    mentorId: req.mentor_id,
    mentorName: req.mentor_name || '',
    topic: req.topic,
    message: req.message,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at
  };
}
