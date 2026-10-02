export function toUserSelfDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    rejectionReason: user.rejection_reason || null,
    verified: Boolean(user.verified),
    studentId: user.student_id || null,
    phone: user.phone || null,
    department: user.department || null,
    program: user.program || null,
    graduationYear: user.graduation_year ? Number(user.graduation_year) : null,
    currentSemester: user.current_semester || null,
    expectedGraduation: user.expected_graduation ? Number(user.expected_graduation) : null,
    company: user.company || null,
    jobTitle: user.job_title || null,
    city: user.city || null,
    bio: user.bio || null,
    github: user.github || null,
    linkedin: user.linkedin || null,
    portfolio: user.portfolio || null,
    website: user.website || null,
    willingToMentor: Boolean(user.willing_to_mentor),
    mentorExpertise: user.mentor_expertise || [],
    approvedAt: user.approved_at || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

export function toUserPublicDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    department: user.department || null,
    program: user.program || null,
    graduationYear: user.graduation_year ? Number(user.graduation_year) : null,
    currentSemester: user.current_semester || null,
    expectedGraduation: user.expected_graduation ? Number(user.expected_graduation) : null,
    company: user.company || null,
    jobTitle: user.job_title || null,
    city: user.city || null,
    bio: user.bio || null,
    github: user.github || null,
    linkedin: user.linkedin || null,
    portfolio: user.portfolio || null,
    website: user.website || null,
    willingToMentor: Boolean(user.willing_to_mentor),
    mentorExpertise: user.mentor_expertise || []
  };
}

export function toUserAdminDto(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    rejectionReason: user.rejection_reason || null,
    verified: Boolean(user.verified),
    studentId: user.student_id || null,
    phone: user.phone || null,
    department: user.department || null,
    program: user.program || null,
    graduationYear: user.graduation_year ? Number(user.graduation_year) : null,
    currentSemester: user.current_semester || null,
    expectedGraduation: user.expected_graduation ? Number(user.expected_graduation) : null,
    company: user.company || null,
    jobTitle: user.job_title || null,
    city: user.city || null,
    bio: user.bio || null,
    github: user.github || null,
    linkedin: user.linkedin || null,
    portfolio: user.portfolio || null,
    website: user.website || null,
    willingToMentor: Boolean(user.willing_to_mentor),
    mentorExpertise: user.mentor_expertise || [],
    approvedAt: user.approved_at || null,
    approvedBy: user.approved_by || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}
