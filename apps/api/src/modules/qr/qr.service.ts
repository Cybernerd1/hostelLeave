/**
 * QR Service
 *
 * Generates encrypted QR codes for approved leaves
 * and verifies them when guards scan.
 */

import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

import { config } from '../../config';
import { addHours } from '@hostel/shared-utils';
import { AppError } from '../../utils/AppError';
import { LeaveRequest, type ILeaveRequestDocument } from '../../models/leaveRequest.model';
import { LeaveStatus } from '@hostel/shared-types';
import { generateRandomString } from '@hostel/shared-utils';

export class QRService {
  /**
   * Generate an encrypted QR code for an approved leave.
   * Returns the QR token and expiry date.
   */
  async generateQR(
    leaveRequest: ILeaveRequestDocument,
  ): Promise<{ token: string; expiry: Date }> {
    const token = generateRandomString(32);
    const expiry = addHours(new Date(), config.qr.expiryHours);

    // Create QR payload
    const payload = {
      leaveId: leaveRequest.leaveId,
      leaveRequestId: leaveRequest._id.toString(),
      studentId: leaveRequest.studentId.toString(),
      token,
      expiry: expiry.toISOString(),
    };

    // Encrypt the payload
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      config.qr.secret,
    ).toString();

    // Store token on the leave request
    leaveRequest.qrToken = token;
    leaveRequest.qrExpiry = expiry;

    return { token: encrypted, expiry };
  }

  /**
   * Generate QR code as a data URL (base64 PNG).
   */
  async generateQRDataURL(leaveRequestId: string): Promise<string> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      throw AppError.badRequest('QR code can only be generated for approved leaves');
    }

    if (!leaveRequest.qrToken) {
      // Generate new QR if not exists
      const qrData = await this.generateQR(leaveRequest);
      leaveRequest.qrToken = qrData.token;
      leaveRequest.qrExpiry = qrData.expiry;
      await leaveRequest.save();
    }

    // Create payload and encrypt
    const payload = {
      leaveId: leaveRequest.leaveId,
      leaveRequestId: leaveRequest._id.toString(),
      studentId: leaveRequest.studentId.toString(),
      token: leaveRequest.qrToken,
      expiry: leaveRequest.qrExpiry!.toISOString(),
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      config.qr.secret,
    ).toString();

    // Generate QR image as data URL
    const qrDataUrl = await QRCode.toDataURL(encrypted, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  }

  /**
   * Verify a QR code scanned by a guard.
   * Decrypts the payload, validates the token and expiry.
   */
  async verifyQR(qrData: string): Promise<{
    isValid: boolean;
    message: string;
    leaveRequest?: ILeaveRequestDocument;
    canExit: boolean;
    canEntry: boolean;
  }> {
    try {
      // Decrypt the QR data
      const bytes = CryptoJS.AES.decrypt(qrData, config.qr.secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        return { isValid: false, message: 'Invalid QR code', canExit: false, canEntry: false };
      }

      const payload = JSON.parse(decrypted);

      // Validate payload structure
      if (!payload.leaveRequestId || !payload.token || !payload.expiry) {
        return { isValid: false, message: 'Malformed QR code data', canExit: false, canEntry: false };
      }

      // Check expiry
      if (new Date(payload.expiry) < new Date()) {
        return { isValid: false, message: 'QR code has expired', canExit: false, canEntry: false };
      }

      // Find the leave request
      const leaveRequest = await LeaveRequest.findById(payload.leaveRequestId)
        .populate({
          path: 'studentId',
          populate: [
            { path: 'hostelId', select: 'name' },
            { path: 'departmentId', select: 'name code' },
            { path: 'roomId', select: 'roomNumber' },
          ],
        });

      if (!leaveRequest) {
        return { isValid: false, message: 'Leave request not found', canExit: false, canEntry: false };
      }

      // Verify token matches
      if (leaveRequest.qrToken !== payload.token) {
        return { isValid: false, message: 'QR code token mismatch', canExit: false, canEntry: false };
      }

      // Check leave status
      if (leaveRequest.status !== LeaveStatus.APPROVED && leaveRequest.status !== LeaveStatus.COMPLETED) {
        return {
          isValid: false,
          message: `Leave status is ${leaveRequest.status}. Expected: approved`,
          canExit: false,
          canEntry: false,
        };
      }

      // Determine actions
      const canExit = leaveRequest.status === LeaveStatus.APPROVED && !leaveRequest.exitTime;
      const canEntry = leaveRequest.status === LeaveStatus.APPROVED && !!leaveRequest.exitTime && !leaveRequest.entryTime;

      return {
        isValid: true,
        message: 'QR code verified successfully',
        leaveRequest,
        canExit,
        canEntry,
      };
    } catch {
      return { isValid: false, message: 'Failed to decode QR code', canExit: false, canEntry: false };
    }
  }
}

export const qrService = new QRService();
