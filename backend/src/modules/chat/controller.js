import { clearConversation, getConversations, getMessages, sendMessage, unsendMessage } from './service.js';

export async function handleGetConversations(req, res) {
  const conversations = await getConversations(req.user);
  res.status(200).json(conversations);
}

export async function handleGetMessages(req, res) {
  const messages = await getMessages(req.params.userId, req.query.after, req.user);
  res.status(200).json(messages);
}

export async function handleSendMessage(req, res) {
  const message = await sendMessage(req.params.userId, req.body.text, req.user);
  res.status(201).json(message);
}

export async function handleUnsendMessage(req, res) {
  const message = await unsendMessage(req.params.id, req.user);
  res.status(200).json(message);
}

export async function handleClearConversation(req, res) {
  const result = await clearConversation(req.params.userId, req.user);
  res.status(200).json(result);
}
