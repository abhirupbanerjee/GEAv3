/**
 * GEA Portal - Test Email API
 *
 * Endpoint for testing SendGrid email configuration.
 * Only accessible by admin users.
 *
 * POST /api/admin/settings/test-email - Send a test email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSendGridSettings } from '@/lib/settings';
import sgMail from '@sendgrid/mail';

/**
 * POST /api/admin/settings/test-email
 * Send a test email using current SendGrid configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get recipient email (default to current admin's email)
    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.email || session.user.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Get SendGrid settings
    const sendgridSettings = await getSendGridSettings();

    if (!sendgridSettings.apiKey) {
      return NextResponse.json(
        { error: 'SendGrid API key is not configured' },
        { status: 400 }
      );
    }

    if (!sendgridSettings.fromEmail) {
      return NextResponse.json(
        { error: 'SendGrid sender email is not configured' },
        { status: 400 }
      );
    }

    // Configure SendGrid
    sgMail.setApiKey(sendgridSettings.apiKey);

    // Send test email
    const msg = {
      to: recipientEmail,
      from: {
        email: sendgridSettings.fromEmail,
        name: sendgridSettings.fromName || 'GEA Portal',
      },
      subject: 'GEA Portal - Email Configuration Test',
      text: `This is a test email from the GEA Portal.

If you received this email, your SendGrid configuration is working correctly.

Configuration Details:
- Sender Email: ${sendgridSettings.fromEmail}
- Sender Name: ${sendgridSettings.fromName}
- Sent At: ${new Date().toISOString()}

This is an automated test email. No action is required.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .details { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GEA Portal</h1>
      <p>Email Configuration Test</p>
    </div>
    <div class="content">
      <div class="success">
        <strong>Success!</strong> Your email configuration is working correctly.
      </div>
      <div class="details">
        <h3>Configuration Details:</h3>
        <ul>
          <li><strong>Sender Email:</strong> ${sendgridSettings.fromEmail}</li>
          <li><strong>Sender Name:</strong> ${sendgridSettings.fromName}</li>
          <li><strong>Sent At:</strong> ${new Date().toISOString()}</li>
        </ul>
      </div>
      <p style="margin-top: 20px; color: #64748b;">
        This is an automated test email. No action is required.
      </p>
    </div>
    <div class="footer">
      <p>Government of Grenada - Enterprise Architecture Portal</p>
    </div>
  </div>
</body>
</html>
      `,
    };

    await sgMail.send(msg);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`,
      details: {
        recipient: recipientEmail,
        sender: sendgridSettings.fromEmail,
        senderName: sendgridSettings.fromName,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error sending test email:', error);

    // Handle SendGrid specific errors
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } };
      const errorMessage = sgError.response?.body?.errors?.[0]?.message || 'SendGrid API error';
      return NextResponse.json(
        { error: `Failed to send test email: ${errorMessage}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send test email. Please check your SendGrid configuration.' },
      { status: 500 }
    );
  }
}
