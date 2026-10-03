import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeHeader(val) {
  if (!val) return '';
  return String(val).replace(/[\r\n]+/g, ' ').trim();
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendEmail({ to, subject, replyTo, text, html, attachments = [] }) {
  const cleanTo = sanitizeHeader(to);
  const cleanSubject = sanitizeHeader(subject);
  const cleanReplyTo = sanitizeHeader(replyTo);
  const from = sanitizeHeader(env.MAIL_FROM);

  if (env.MAIL_MODE === 'smtp' && env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });

    await transporter.sendMail({
      from,
      to: cleanTo,
      subject: cleanSubject,
      replyTo: cleanReplyTo,
      text,
      html,
      attachments
    });
    return { status: 'sent' };
  }

  // MAIL_MODE === 'log' (write .eml to dev-mails/)
  const devMailsDir = path.join(__dirname, '../../dev-mails');
  if (!fs.existsSync(devMailsDir)) {
    fs.mkdirSync(devMailsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `mail-${timestamp}-${Math.floor(Math.random() * 1000)}.eml`;
  const filePath = path.join(devMailsDir, filename);

  let emlContent = `From: ${from}\r\nTo: ${cleanTo}\r\nSubject: ${cleanSubject}\r\n`;
  if (cleanReplyTo) emlContent += `Reply-To: ${cleanReplyTo}\r\n`;
  emlContent += `Date: ${new Date().toUTCString()}\r\n`;
  emlContent += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
  emlContent += html || text || '';

  if (attachments && attachments.length > 0) {
    emlContent += `\r\n\r\n--- ATTACHMENTS ---\r\n`;
    for (const att of attachments) {
      emlContent += `Filename: ${sanitizeHeader(att.filename)}\r\nSize: ${att.content ? att.content.length : 0} bytes\r\n`;
    }
  }

  fs.writeFileSync(filePath, emlContent, 'utf8');
  return { status: 'logged', filePath };
}
