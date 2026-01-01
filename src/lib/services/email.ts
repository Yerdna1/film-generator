// Email Service using Resend
// Handles sending collaboration invitations and notifications

import { Resend } from 'resend';
import type { ProjectRole } from '@/types/collaboration';

// Initialize Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
};

// Get app URL for invitation links
const getAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

// Role display names
const roleDisplayNames: Record<ProjectRole, string> = {
  admin: 'Admin',
  collaborator: 'Collaborator',
  reader: 'Viewer',
};

// Role descriptions for email
const roleDescriptions: Record<ProjectRole, string> = {
  admin: 'Full control over the project including managing members and approving deletions',
  collaborator: 'Can edit prompts, regenerate images and videos. Deletions require admin approval',
  reader: 'View-only access to the project',
};

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  inviterEmail: string;
  projectName: string;
  role: ProjectRole;
  inviteToken: string;
  expiresAt: Date;
  personalMessage?: string;
}

/**
 * Send project invitation email
 */
export async function sendInvitationEmail({
  to,
  inviterName,
  inviterEmail,
  projectName,
  role,
  inviteToken,
  expiresAt,
  personalMessage,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const appUrl = getAppUrl();
    const inviteLink = `${appUrl}/invite/${inviteToken}`;
    const expiresInDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #a855f7, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Film Generator
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; color: #ffffff;">
                You've been invited to collaborate!
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                <strong style="color: #ffffff;">${inviterName}</strong> (${inviterEmail}) has invited you to collaborate on a project.
              </p>

              <!-- Project Card -->
              <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Project</p>
                <p style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #ffffff;">${projectName}</p>

                <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Your Role</p>
                <p style="margin: 0; font-size: 16px; color: #a855f7; font-weight: 500;">${roleDisplayNames[role]}</p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">${roleDescriptions[role]}</p>
              </div>

              ${personalMessage ? `
              <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #a855f7; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #a1a1aa; font-style: italic;">"${personalMessage}"</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #71717a;">- ${inviterName}</p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; color: #71717a; text-align: center;">
                This invitation expires in ${expiresInDays} days.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #52525b; text-align: center;">
                Or copy this link: <a href="${inviteLink}" style="color: #a855f7;">${inviteLink}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await resend.emails.send({
      from: 'Film Generator <noreply@send.artflowly.com>',
      to,
      subject: `${inviterName} invited you to collaborate on "${projectName}"`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

interface SendNotificationEmailParams {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Send a generic notification email
 */
export async function sendNotificationEmail({
  to,
  subject,
  title,
  message,
  actionUrl,
  actionText = 'View Details',
}: SendNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; color: #ffffff;">${title}</h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #a1a1aa; line-height: 1.6;">${message}</p>
              ${actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                  ${actionText}
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await resend.emails.send({
      from: 'Film Generator <noreply@send.artflowly.com>',
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
