export function toDonationDto(d, currentUser) {
  if (!d) return null;
  const isAdmin = currentUser && currentUser.role === 'admin';

  const dto = {
    id: d.id,
    amount: Number(d.amount),
    purpose: d.purpose,
    message: d.message || null,
    isAnonymous: Boolean(d.is_anonymous),
    isDemo: Boolean(d.is_demo),
    createdAt: d.created_at
  };

  if (isAdmin || currentUser.id === d.user_id) {
    dto.userId = d.user_id;
    dto.donorName = d.donor_name || d.name || 'Anonymous Donor';
  }

  return dto;
}
