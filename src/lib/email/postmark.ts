import * as postmark from 'postmark';

const serverToken = process.env.POSTMARK_SERVER_TOKEN;
const fromEmail = process.env.POSTMARK_FROM_EMAIL || "notifications@acs-energy.com";

let client: postmark.ServerClient | null = null;
if (serverToken) {
  client = new postmark.ServerClient(serverToken);
} else {
  console.warn("POSTMARK_SERVER_TOKEN is not set. Emails will be logged to console but not sent.");
}

export type EmailTemplateParams = {
  to: string;
  subject: string;
  htmlBody: string;
};

export async function sendEmail({ to, subject, htmlBody }: EmailTemplateParams) {
  if (!client) {
    console.log(`\n[EMAIL MOCK] To: ${to}\n[EMAIL MOCK] Subject: ${subject}\n`);
    return;
  }

  try {
    await client.sendEmail({
      From: fromEmail,
      To: to,
      Subject: subject,
      HtmlBody: htmlBody,
    });
  } catch (err) {
    console.error(`[POSTMARK ERROR] Failed to send email to ${to}:`, err);
    // Deliberately swallow error so it doesn't break the calling transaction
  }
}
