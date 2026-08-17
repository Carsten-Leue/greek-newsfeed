import nodemailer from 'nodemailer';
import { CONTENT_TYPES } from './convertEbook.mjs';

// Emails the AZW3/MOBI buffer as an attachment to the Kindle's "Send to
// Kindle" address(es). Amazon delivers native Kindle formats straight to the
// device once the sender address is on the account's approved personal
// document list, without any server-side conversion step.
export async function sendDigestMail({ mailConfig, buffer, filename, dateLabel, format }) {
  const missing = ['host', 'user', 'pass', 'from'].filter((k) => !mailConfig[k]);
  if (missing.length > 0) {
    throw new Error(`Fehlende SMTP-Konfiguration: ${missing.join(', ')}`);
  }
  if (mailConfig.to.length === 0) {
    throw new Error('KINDLE_EMAIL ist nicht gesetzt');
  }

  const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: { user: mailConfig.user, pass: mailConfig.pass },
  });

  await transporter.sendMail({
    from: mailConfig.from,
    to: mailConfig.to,
    subject: `Griechischer Pressespiegel – ${dateLabel}`,
    text: `Der heutige griechische Pressespiegel ist als ${format.toUpperCase()} angehängt.`,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: CONTENT_TYPES[format] || 'application/octet-stream',
      },
    ],
  });
}
