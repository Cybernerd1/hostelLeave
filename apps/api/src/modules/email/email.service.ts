/**
 * Email Service
 *
 * Sends professional HTML emails using Nodemailer.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { config } from '../../config';
import { logger } from '../../utils/logger';
import { formatDate } from '@hostel/shared-utils';

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  /**
   * Send an email.
   */
  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      if (!config.email.user || !config.email.pass) {
        logger.warn(`Email not configured. Would send to ${to}: ${subject}`);
        return;
      }

      await this.transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to,
        subject,
        html,
      });

      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      // Don't throw — email failures should not block the main flow
    }
  }

  /**
   * Email parent when student applies for leave.
   */
  async sendLeaveAppliedEmail(
    parentEmail: string,
    data: {
      parentName: string;
      studentName: string;
      rollNumber: string;
      leaveType: string;
      fromDate: string;
      toDate: string;
      reason: string;
      destination: string;
    },
  ): Promise<void> {
    const html = this.wrapTemplate(`
      <h2 style="color: #1e293b; margin-bottom: 16px;">Leave Application Received</h2>
      <p>Dear <strong>${data.parentName}</strong>,</p>
      <p>Your child <strong>${data.studentName}</strong> (Roll No: ${data.rollNumber}) has applied for leave. Please review and approve/reject the request.</p>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leaveType}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">From Date</td><td style="padding: 8px 0; font-weight: 600;">${formatDate(data.fromDate)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">To Date</td><td style="padding: 8px 0; font-weight: 600;">${formatDate(data.toDate)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Destination</td><td style="padding: 8px 0; font-weight: 600;">${data.destination}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.reason}</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${config.webBaseUrl}/parent/leaves" style="display: inline-block; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Leave Request</a>
      </div>

      <p style="color: #64748b; font-size: 14px;">Please log in to your parent portal to approve or reject this leave request.</p>
    `);

    await this.sendMail(
      parentEmail,
      `Leave Application - ${data.studentName} (${data.rollNumber})`,
      html,
    );
  }

  /**
   * Email student when leave is fully approved.
   */
  async sendLeaveApprovedEmail(
    studentEmail: string,
    data: {
      studentName: string;
      leaveId: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<void> {
    const html = this.wrapTemplate(`
      <h2 style="color: #059669; margin-bottom: 16px;">✅ Leave Approved</h2>
      <p>Dear <strong>${data.studentName}</strong>,</p>
      <p>Your leave application <strong>${data.leaveId}</strong> has been <span style="color: #059669; font-weight: 600;">fully approved</span>.</p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Leave ID</td><td style="padding: 8px 0; font-weight: 600;">${data.leaveId}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">From Date</td><td style="padding: 8px 0; font-weight: 600;">${formatDate(data.fromDate)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">To Date</td><td style="padding: 8px 0; font-weight: 600;">${formatDate(data.toDate)}</td></tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${config.webBaseUrl}/student/leaves" style="display: inline-block; padding: 12px 32px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Download Leave Pass</a>
      </div>

      <p style="color: #64748b; font-size: 14px;">Please download your leave pass with QR code from the portal. Show the QR code to the security guard at the gate.</p>
    `);

    await this.sendMail(
      studentEmail,
      `Leave Approved - ${data.leaveId}`,
      html,
    );
  }

  /**
   * Email student when leave is rejected.
   */
  async sendLeaveRejectedEmail(
    studentEmail: string,
    data: {
      studentName: string;
      leaveId: string;
      rejectedBy: string;
      remarks: string;
    },
  ): Promise<void> {
    const html = this.wrapTemplate(`
      <h2 style="color: #dc2626; margin-bottom: 16px;">❌ Leave Rejected</h2>
      <p>Dear <strong>${data.studentName}</strong>,</p>
      <p>Your leave application <strong>${data.leaveId}</strong> has been <span style="color: #dc2626; font-weight: 600;">rejected</span> by <strong>${data.rejectedBy}</strong>.</p>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Remarks:</p>
        <p style="margin: 8px 0 0 0; font-weight: 500;">${data.remarks}</p>
      </div>

      <p style="color: #64748b; font-size: 14px;">You may apply for a new leave with updated details if needed.</p>
    `);

    await this.sendMail(
      studentEmail,
      `Leave Rejected - ${data.leaveId}`,
      html,
    );
  }

  /**
   * Wrap content in professional HTML email template.
   */
  private wrapTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e293b; margin: 0; font-size: 24px;">🏫 Hostel Leave Management</h1>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Leave Management System</p>
        </div>

        <!-- Content Card -->
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${content}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px;">
          <p>This is an automated message from the Hostel Leave Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

export const emailService = new EmailService();
