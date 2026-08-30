/**
 * QR Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { qrService } from './qr.service';
import { pdfService } from '../pdf/pdf.service';
import { sendSuccess } from '../../utils/response.util';

export const getQRCode = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const qrDataUrl = await qrService.generateQRDataURL(id);
  sendSuccess(res, { qrCode: qrDataUrl }, 'QR code generated');
});

export const downloadPDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await pdfService.generateLeavePDF(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=leave-pass-${id}.pdf`);

  doc.pipe(res);
});
