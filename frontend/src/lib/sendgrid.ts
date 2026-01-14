// lib/sendgrid.ts
// ============================================
// SendGrid Email Helper
// ============================================

import sgMail from '@sendgrid/mail';

import { config } from '@/config/env';
const SENDGRID_API_KEY = config.SENDGRID_API_KEY;
const FROM_EMAIL = config.SENDGRID_FROM_EMAIL!;
const FROM_NAME = config.SENDGRID_FROM_NAME || 'GEA Portal';

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(SENDGRID_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(emailData: EmailData) {
  try {
    const msg = {
      to: emailData.to,
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    };

    const response = await sgMail.send(msg);
    console.log(`✅ Email sent to ${emailData.to}:`, response[0].statusCode);
    return response;
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    throw error;
  }
}

export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string
) {
  const messages = recipients.map((to) => ({
    to,
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    subject,
    html,
  }));

  try {
    const response = await sgMail.send(messages);
    console.log(`✅ Bulk email sent to ${recipients.length} recipients`);
    return response;
  } catch (error) {
    console.error('❌ SendGrid bulk error:', error);
    throw error;
  }
}