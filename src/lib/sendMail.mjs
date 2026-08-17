import nodemailer from 'nodemailer';

// Emails the EPUB buffer as an attachment to the Kindle's "Send to Kindle"
// address(es). Amazon converts/delivers it to the device automatically once
// the sender address is on the account's approved personal document list.
export async function sendDigestMail({ mailConfig, buffer, filename, dateLabel }) {
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
    text: 'Der heutige griechische Pressespiegel ist als EPUB angehängt.',
    attachments: [
      {
        filename,
        content: buffer,
        contentType: 'application/epub+zip',
      },
    ],
  });
}
