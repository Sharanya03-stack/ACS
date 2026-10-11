import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resendClient = apiKey ? new Resend(apiKey) : null;

export function getSenderEmail(): string {
  // If EMAIL_FROM is configured, use it. Otherwise, default to Resend's onboarding testing sender
  // (which can only deliver to the Resend account owner's own email address).
  return process.env.EMAIL_FROM || 'ACS Energy <onboarding@resend.dev>';
}

export function isResendConfigured(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Base URL used for links inside emails.
 * Priority: explicit NEXT_PUBLIC_APP_URL → Vercel's auto-provided production hostname → localhost.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd.replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}
