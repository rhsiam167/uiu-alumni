export function toMessageDto(m) {
  if (!m) return null;
  return {
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    text: m.unsent ? '' : m.text,
    createdAt: m.created_at,
    unsent: Boolean(m.unsent)
  };
}

export function toConversationDto(c) {
  if (!c) return null;
  const name = c.name || 'User';
  const nameParts = name.trim().split(/\s+/);
  let avatarInitials = nameParts[0][0] || '';
  if (nameParts.length > 1) {
    avatarInitials += nameParts[nameParts.length - 1][0];
  }
  avatarInitials = avatarInitials.toUpperCase();

  return {
    userId: c.user_id,
    name,
    avatarInitials,
    lastMessageText: c.last_message_unsent ? 'Message unsent' : c.last_message_text,
    lastMessageAt: c.last_message_at,
    unreadCount: Number(c.unread_count || 0)
  };
}
