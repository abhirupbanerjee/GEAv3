// lib/sendgrid.ts
// ============================================
// SendGrid Email Helper
// Optional feature - gracefully degrades if not configured
// ============================================

import sgMail from '@sendgrid/mail';
import { getSendGridSettings } from '@/lib/settings';

// Lazy initialization state
let isInitialized = false;
let initializationLogged = false;

/**
 * Initialize SendGrid with API key (lazy - only when first email is sent)
 * Returns true if SendGrid is configured and ready
 */
async function initializeSendGrid(): Promise<boolean> {
  if (isInitialized) return true;

  // Fetch from database (5-minute cache, auto-decrypts API key)
  const settings = await getSendGridSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    if (!initializationLogged) {
      console.warn('⚠️ SendGrid not configured - email features disabled');
      initializationLogged = true;
    }
    return false;
  }

  sgMail.setApiKey(apiKey);
  isInitialized = true;
  console.log('✅ SendGrid initialized');
  return true;
}

/**
 * Check if email sending is enabled
 * Use this to conditionally show email-related UI or skip email logic
 */
export async function isEmailEnabled(): Promise<boolean> {
  return await initializeSendGrid();
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Send a single email
 * Returns success: false if SendGrid is not configured (no error thrown)
 */
export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  if (!await initializeSendGrid()) {
    console.warn('⚠️ Email not sent - SendGrid not configured');
    return { success: false, error: 'SendGrid not configured' };
  }

  // Fetch email display settings from database (5-minute cache)
  const settings = await getSendGridSettings();
  const fromEmail = settings.fromEmail || 'noreply@example.com';
  const fromName = settings.fromName || 'GEA Portal';

  try {
    const msg = {
      to: emailData.to,
      from: `${fromName} <${fromEmail}>`,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    };

    const response = await sgMail.send(msg);
    console.log(`✅ Email sent to ${emailData.to}:`, response[0].statusCode);
    return { success: true, statusCode: response[0].statusCode };
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send bulk emails to multiple recipients
 * Returns success: false if SendGrid is not configured (no error thrown)
 */
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!await initializeSendGrid()) {
    console.warn('⚠️ Bulk email not sent - SendGrid not configured');
    return { success: false, error: 'SendGrid not configured' };
  }

  if (recipients.length === 0) {
    return { success: true }; // Nothing to send
  }

  // Fetch email display settings from database (5-minute cache)
  const settings = await getSendGridSettings();
  const fromEmail = settings.fromEmail || 'noreply@example.com';
  const fromName = settings.fromName || 'GEA Portal';

  const messages = recipients.map((to) => ({
    to,
    from: `${fromName} <${fromEmail}>`,
    subject,
    html,
  }));

  try {
    const response = await sgMail.send(messages);
    console.log(`✅ Bulk email sent to ${recipients.length} recipients`);
    return { success: true, statusCode: Array.isArray(response) ? response[0]?.statusCode : undefined };
  } catch (error) {
    console.error('❌ SendGrid bulk error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
