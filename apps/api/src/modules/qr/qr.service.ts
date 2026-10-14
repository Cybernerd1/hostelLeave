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

const QR_TOKEN_LENGTH = 32;

/**
 * Get a plain id string whether studentId is a raw ObjectId or a populated document.
 * (Calling toString() on a populated Mongoose document dumps the whole document.)
 */
function getStudentIdString(studentId: unknown): string {
  const maybeDoc = studentId as { _id?: { toString(): string } } | null;
  if (maybeDoc && maybeDoc._id) {
    return maybeDoc._id.toString();
  }
  return String(studentId);
}

export class QRService {
  /**
   * Generate a QR token and expiry for an approved leave.
   * Returns the RAW short token (stored on the leave) and expiry date.
   * The token is encrypted into the QR payload later, in generateQRDataURL.
   */
  async generateQR(
    _leaveRequest: ILeaveRequestDocument,
  ): Promise<{ token: string; expiry: Date }> {
    const token = generateRandomString(QR_TOKEN_LENGTH);
    const expiry = addHours(new Date(), config.qr.expiryHours);
    return { token, expiry };
  }

  /**
   * Generate QR code as a data URL (base64 PNG).
   * The QR encodes a public URL that the guard's phone browser can open.
   */
  async generateQRDataURL(leaveRequestId: string): Promise<string> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      throw AppError.badRequest('QR code can only be generated for approved leaves');
    }

    // Generate a new token if missing or malformed
    if (!leaveRequest.qrToken || leaveRequest.qrToken.length !== QR_TOKEN_LENGTH || !leaveRequest.qrExpiry) {
      const qrData = await this.generateQR(leaveRequest);
      leaveRequest.qrToken = qrData.token;
      leaveRequest.qrExpiry = qrData.expiry;
      await leaveRequest.save();
    }

    // Encode a public URL: guard scans QR → opens browser → sees leave status
    const webBaseUrl = config.webBaseUrl || 'http://localhost:3000';
    const verifyUrl = `${webBaseUrl}/verify/${leaveRequest.leaveId}`;

    // Generate QR image as data URL
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
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