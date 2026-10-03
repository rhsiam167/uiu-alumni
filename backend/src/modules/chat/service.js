import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { toConversationDto, toMessageDto } from './dto.js';

export async function getConversations(currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot participate in chat');
  }

  const sql = `
    WITH partners AS (
      SELECT DISTINCT 
        CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END as partner_id
      FROM messages
      WHERE sender_id = $1 OR recipient_id = $1
    ),
    cleared AS (
      SELECT partner_id, cleared_at
      FROM conversation_state
      WHERE user_id = $1
    )
    SELECT 
      u.id as user_id,
      u.name,
      latest.text as last_message_text,
      latest.unsent as last_message_unsent,
      latest.created_at as last_message_at,
      (
        SELECT COUNT(*)::int 
        FROM messages unread 
        WHERE unread.sender_id = u.id 
          AND unread.recipient_id = $1 
          AND unread.read_at IS NULL
          AND unread.created_at > COALESCE(c.cleared_at, '1970-01-01'::timestamptz)
      ) as unread_count
    FROM partners p
    JOIN users u ON p.partner_id = u.id AND u.status = 'approved'
    LEFT JOIN cleared c ON p.partner_id = c.partner_id
    CROSS JOIN LATERAL (
      SELECT m.text, m.unsent, m.created_at
      FROM messages m
      WHERE (
        (m.sender_id = $1 AND m.recipient_id = u.id) OR 
        (m.sender_id = u.id AND m.recipient_id = $1)
      ) AND m.created_at > COALESCE(c.cleared_at, '1970-01-01'::timestamptz)
      ORDER BY m.created_at DESC
      LIMIT 1
    ) latest
    ORDER BY latest.created_at DESC
  `;

  const { rows } = await query(sql, [currentUser.id]);
  return rows.map(toConversationDto);
}

export async function getMessages(partnerId, afterId, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot participate in chat');
  }

  // Check partner user
  const partnerRes = await query('SELECT * FROM users WHERE id = $1', [partnerId]);
  const partner = partnerRes.rows[0];
  if (!partner || partner.status !== 'approved' || partner.role === 'admin') {
    throw new ApiError(404, 'NOT_FOUND', 'Chat user not found or unavailable');
  }

  // Get cleared_at date for currentUser and partnerId
  const csRes = await query('SELECT cleared_at FROM conversation_state WHERE user_id = $1 AND partner_id = $2', [currentUser.id, partnerId]);
  const clearedAt = csRes.rows[0]?.cleared_at || new Date(0).toISOString();

  let sql = `
    SELECT * FROM messages
    WHERE (
      (sender_id = $1 AND recipient_id = $2) OR
      (sender_id = $2 AND recipient_id = $1)
    )
    AND created_at > $3
  `;
  const params = [currentUser.id, partnerId, clearedAt];

  if (afterId) {
    const afterRes = await query('SELECT created_at FROM messages WHERE id = $1', [afterId]);
    if (afterRes.rows.length > 0) {
      params.push(afterRes.rows[0].created_at);
      sql += ` AND created_at > $${params.length}`;
    }
  }

  sql += ' ORDER BY created_at ASC LIMIT 500';

  const { rows } = await query(sql, params);

  // Mark partner's unread messages as read
  await query(
    'UPDATE messages SET read_at = now() WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL',
    [partnerId, currentUser.id]
  );

  return rows.map(toMessageDto);
}

export async function sendMessage(partnerId, text, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot send chat messages');
  }

  if (partnerId === currentUser.id) {
    throw new ApiError(400, 'INVALID_RECIPIENT', 'You cannot send messages to yourself');
  }

  const partnerRes = await query('SELECT * FROM users WHERE id = $1', [partnerId]);
  const partner = partnerRes.rows[0];
  if (!partner || partner.status !== 'approved' || partner.role === 'admin') {
    throw new ApiError(404, 'NOT_FOUND', 'Recipient user not found or unavailable');
  }

  const sql = `
    INSERT INTO messages (sender_id, recipient_id, text, unsent)
    VALUES ($1, $2, $3, false)
    RETURNING *
  `;

  const { rows } = await query(sql, [currentUser.id, partnerId, text]);
  return toMessageDto(rows[0]);
}

export async function unsendMessage(messageId, currentUser) {
  const { rows } = await query('SELECT * FROM messages WHERE id = $1', [messageId]);
  const msg = rows[0];
  if (!msg) throw new ApiError(404, 'NOT_FOUND', 'Message not found');

  if (msg.sender_id !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only unsend your own messages');
  }

  const updateRes = await query(
    "UPDATE messages SET unsent = true, text = '' WHERE id = $1 RETURNING *",
    [messageId]
  );

  return toMessageDto(updateRes.rows[0]);
}

export async function clearConversation(partnerId, currentUser) {
  const sql = `
    INSERT INTO conversation_state (user_id, partner_id, cleared_at)
    VALUES ($1, $2, now())
    ON CONFLICT (user_id, partner_id) DO UPDATE SET cleared_at = EXCLUDED.cleared_at
  `;

  await query(sql, [currentUser.id, partnerId]);
  return { message: 'Conversation cleared' };
}
