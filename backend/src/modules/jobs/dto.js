export function toJobDto(job, currentUser) {
  if (!job) return null;

  const isPoster = currentUser && currentUser.id === job.posted_by;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isLoggedIn = Boolean(currentUser);

  const dto = {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    salary: job.salary || null,
    description: job.description,
    requirements: job.requirements || '',
    deadline: typeof job.deadline === 'string' ? job.deadline.slice(0, 10) : new Date(job.deadline).toISOString().slice(0, 10),
    postedBy: job.posted_by,
    postedByName: job.posted_by_name || job.company,
    status: job.status,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };

  if (isLoggedIn) {
    dto.recruiterEmail = job.recruiter_email;
  }

  if (isPoster || isAdmin) {
    dto.applicantsCount = Number(job.applicants_count || 0);
    if (job.rejection_reason) {
      dto.rejectionReason = job.rejection_reason;
    }
  }

  if (job.has_applied !== undefined) {
    dto.hasApplied = Boolean(job.has_applied);
  }

  return dto;
}

export function toJobApplicationDto(app) {
  return {
    id: app.id,
    jobId: app.job_id,
    jobTitle: app.job_title,
    company: app.company,
    createdAt: app.created_at
  };
}
