import { resendClient, getSenderEmail, isResendConfigured } from './client';

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  mock?: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, htmlBody, textBody } = options;

  // Validate recipient
  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList
    .map(email => email?.trim())
    .filter((email): email is string => Boolean(email && EMAIL_REGEX.test(email)));

  if (validRecipients.length === 0) {
    console.warn(`[Email Service] Skipped sending. Invalid or missing recipient email:`, to);
    return { success: false, skipped: true, error: 'Invalid or missing recipient email address' };
  }

  // Check if Resend API key is configured
  if (!isResendConfigured() || !resendClient) {
    console.log(
      `\n[EMAIL MOCK - RESEND NOT CONFIGURED]` +
      `\nTo: ${validRecipients.join(', ')}` +
      `\nSubject: ${subject}` +
      `\nFrom: ${getSenderEmail()}` +
      `\nNote: Set RESEND_API_KEY environment variable to deliver actual emails.\n`
    );
    return { success: false, mock: true, error: 'RESEND_API_KEY environment variable is not configured' };
  }

  try {
    const from = getSenderEmail();
    const response = await resendClient.emails.send({
      from,
      to: validRecipients,
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (response.error) {
      console.error(`[Resend Error] Failed to send email to ${validRecipients.join(', ')}:`, response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`[Resend Success] Email sent to ${validRecipients.join(', ')} (ID: ${response.data?.id})`);
    return { success: true, messageId: response.data?.id };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown error occurred while sending email';
    console.error(`[Resend Exception] Unexpected error sending email to ${validRecipients.join(', ')}:`, err);
    return { success: false, error: errorMessage };
  }
}
