/**
 * PDF Service
 *
 * Generates a leave application PDF modelled on the official
 * AKGEC Hostel Leave Application Form template.
 *
 * Sections:
 *  1. College header + leave ID
 *  2. Student details (name, roll, course, hostel, room, year)
 *  3. Leave details (dates, duration, time-out, type, reason)
 *  4. Person being visited (name, relation, address, contact)
 *  5. Mobile numbers
 *  6. Approval signatures table
 *  7. QR code for gate verification
 *  8. Footer notices
 */

import PDFDocument from 'pdfkit';
import { LeaveRequest } from '../../models/leaveRequest.model';
import { AppError } from '../../utils/AppError';
import { LeaveStatus } from '@hostel/shared-types';
import { formatDate, calculateDays, LEAVE_TYPE_CONFIG } from '@hostel/shared-utils';
import { qrService } from '../qr/qr.service';

const PAGE_MARGIN = 45;
const PAGE_WIDTH  = 595.28; // A4
const CONTENT_W   = PAGE_WIDTH - PAGE_MARGIN * 2;
const COL_LABEL   = 130;
const LINE_H      = 18;

export class PdfService {
  /** Generate a leave application PDF with QR code. Returns a readable stream. */
  async generateLeavePDF(leaveRequestId: string): Promise<PDFKit.PDFDocument> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate({
        path: 'studentId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'courseId', select: 'name code' },
          { path: 'hostelId', select: 'name' },
          { path: 'roomId', select: 'roomNumber' },
          { path: 'parentId', select: 'name phone relation' },
        ],
      })
      .populate({
        path: 'approvals',
        populate: { path: 'approverId', select: 'name role' },
      });

    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    if (
      leaveRequest.status !== LeaveStatus.APPROVED &&
      leaveRequest.status !== LeaveStatus.COMPLETED
    ) {
      throw AppError.badRequest('PDF can only be generated for approved leaves');
    }

    const s = leaveRequest.studentId as unknown as {
      name: string;
      rollNumber: string;
      phone: string;
      year: number;
      semester: string;
      bloodGroup?: string;
      departmentId: { name: string; code: string };
      courseId: { name: string; code: string };
      hostelId: { name: string };
      roomId: { roomNumber: string };
      parentId?: { name: string; phone: string; relation: string };
    };

    const approvals = (leaveRequest.approvals as unknown as Array<{
      approverId: { name: string; role: string };
      role: string;
      action: string;
      remarks?: string;
      actionDate: Date;
    }>);

    // Extract destination / visit info from destination field
    const destinationRaw = leaveRequest.destination || '';
    const visitMatch = destinationRaw.match(/^(.*?)\s*\(([^,]+),\s*([^)]+)\)$/);
    const visitPlace    = visitMatch ? visitMatch[1].trim() : destinationRaw;
    const visitPerson   = visitMatch ? visitMatch[2].trim() : '—';
    const visitRelation = visitMatch ? visitMatch[3].trim() : '—';

    const duration = calculateDays(leaveRequest.fromDate, leaveRequest.toDate);
    const leaveTypeLabel =
      LEAVE_TYPE_CONFIG[leaveRequest.leaveType as keyof typeof LEAVE_TYPE_CONFIG]?.label ||
      leaveRequest.leaveType;

    const qrDataUrl = await qrService.generateQRDataURL(leaveRequestId);

    /* ─── Document Setup ──────────────────────────────────────── */
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Leave Pass — ${leaveRequest.leaveId}`,
        Author: 'Hostel Leave Management System',
        Subject: 'Hostel Leave Application',
      },
    });

    let y = PAGE_MARGIN;

    /* ─── Helpers ─────────────────────────────────────────────── */
    const line = (x1: number, y1: number, x2: number, y2: number, w = 0.5) =>
      doc.strokeColor('#000').lineWidth(w).moveTo(x1, y1).lineTo(x2, y2).stroke();

    const hLine = (yPos: number, w = 0.5) =>
      line(PAGE_MARGIN, yPos, PAGE_MARGIN + CONTENT_W, yPos, w);

    const box = (x: number, yPos: number, w: number, h: number) =>
      doc.strokeColor('#000').lineWidth(0.5).rect(x, yPos, w, h).stroke();

    /** Start a new page if fewer than `needed` points remain above the bottom margin. */
    const ensureSpace = (needed: number) => {
      if (y + needed > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        y = PAGE_MARGIN;
      }
    };

    /**
     * Draw "label ........ value" inside a cell.
     * `width` is the full width of the cell, `xOffset` is where the cell starts
     * (relative to the left margin) and `labelW` is the width reserved for the label.
     */
    const labelVal = (
      label: string,
      value: string,
      xOffset = 0,
      yPos?: number,
      width = CONTENT_W,
      labelW = COL_LABEL,
    ) => {
      const cy = yPos ?? y;
      // Value width must never be zero/negative — pdfkit's line wrapper can loop forever on that.
      const valueW = Math.max(width - labelW - 4, 20);

      doc
        .font('Helvetica-Bold').fontSize(8.5)
        .text(label, PAGE_MARGIN + xOffset, cy, { width: labelW, lineBreak: false });
      if (value) {
        doc
          .font('Helvetica').fontSize(9)
          .text(value, PAGE_MARGIN + xOffset + labelW, cy, {
            width: valueW,
            lineBreak: false,
          });
      }
      line(
        PAGE_MARGIN + xOffset + labelW,
        cy + LINE_H - 2,
        PAGE_MARGIN + xOffset + width,
        cy + LINE_H - 2,
      );
      y = cy + LINE_H + 4;
      return y;
    };

    /* ─── HEADER ──────────────────────────────────────────────── */
    // Outer border
    box(PAGE_MARGIN, y, CONTENT_W, 72);

    // Left: AKGEC logo box (placeholder square)
    const logoSize = 56;
    const logoX = PAGE_MARGIN + 8;
    const logoY = y + 8;
    box(logoX, logoY, logoSize, logoSize);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000')
      .text('AKGEC', logoX + 2, logoY + 20, { width: logoSize - 4, align: 'center', lineBreak: false });

    // Right: college name + form title
    const titleX = PAGE_MARGIN + logoSize + 20;
    const titleW = CONTENT_W - logoSize - 28;

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000')
      .text('AJAY KUMAR GARG ENGINEERING COLLEGE, GHAZIABAD',
        titleX, y + 12, { width: titleW, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000')
      .text('HOSTEL LEAVE APPLICATION FORM',
        titleX, y + 34, { width: titleW, align: 'center' });

    // Underline the form title
    const titleMid = y + 34 + 13;
    doc.strokeColor('#000').lineWidth(0.8)
      .moveTo(titleX, titleMid)
      .lineTo(titleX + titleW, titleMid)
      .stroke();

    // Leave ID + status info below the title
    // (no "✓" here: it is not in the built-in Helvetica font and renders as garbage)
    doc.font('Helvetica').fontSize(7.5).fillColor('#444')
      .text(`Application No.: ${leaveRequest.leaveId}   |   Status: APPROVED   |   Date: ${formatDate(new Date())}`,
        titleX, y + 56, { width: titleW, align: 'center', lineBreak: false });

    y += 80;


    /* ─── SECTION 1–3: STUDENT DETAILS ───────────────────────── */
    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333')
      .text('STUDENT INFORMATION', PAGE_MARGIN, y + 3);
    y += 16;

    // Row 1: Name + Roll
    labelVal('1.  Name of Student', s.name || '—', 0, y, CONTENT_W / 2 - 4);
    labelVal('    Student No.', s.rollNumber || '—', CONTENT_W / 2 + 4, y - LINE_H - 4, CONTENT_W / 2 - 4);

    // Row 2: Course + Year
    const courseName = s.courseId?.name ? `${s.courseId.name} (${s.courseId.code})` : '—';
    const deptName   = s.departmentId?.name || '—';
    labelVal('2.  Course / Branch', `${courseName} / ${deptName}`, 0, y, CONTENT_W, 130);
    labelVal('    Year', s.year ? `Year ${s.year}, Sem ${s.semester}` : '—', 0, y, CONTENT_W);

    // Row 3: Hostel + Room
    labelVal('3.  Hostel Name', s.hostelId?.name || '—', 0, y, CONTENT_W / 2 - 4);
    labelVal('    Room No.', s.roomId?.roomNumber || '—', CONTENT_W / 2 + 4, y - LINE_H - 4, CONTENT_W / 2 - 4);

    /* ─── SECTION 4: PERIOD OF LEAVE ─────────────────────────── */
    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333')
      .text('LEAVE PERIOD', PAGE_MARGIN, y + 3);
    y += 16;

    const colW3 = CONTENT_W / 3;
    const label3 = 80;
    labelVal('4.  Period of Leave', `${duration} Day(s)`, 0, y, colW3 - 2, label3);
    labelVal('    From Date', formatDate(leaveRequest.fromDate), colW3 + 1, y - LINE_H - 4, colW3 - 2, label3);
    labelVal('    To Date', formatDate(leaveRequest.toDate), colW3 * 2 + 2, y - LINE_H - 4, colW3 - 2, label3);

    labelVal('    Leave Type', leaveTypeLabel, 0, y, CONTENT_W);
    if (leaveRequest.attendance !== undefined && leaveRequest.attendance !== null) {
      labelVal('    Attendance', `${leaveRequest.attendance}%`, 0, y, CONTENT_W);
    }

    /* ─── SECTION 5: REASON ───────────────────────────────────── */
    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333')
      .text('REASON FOR LEAVE', PAGE_MARGIN, y + 3);
    y += 16;

    doc.font('Helvetica-Bold').fontSize(8.5)
      .text('5.  Reason for Leave (State Clearly):', PAGE_MARGIN, y);
    y += 13;

    // Reason text with wrapping lines
    const reasonText = leaveRequest.reason || '—';
    doc.font('Helvetica').fontSize(9)
      .text(reasonText, PAGE_MARGIN + 8, y, { width: CONTENT_W - 8, lineBreak: true });
    const reasonH = doc.heightOfString(reasonText, { width: CONTENT_W - 8 });
    // Draw lines under reason
    for (let i = 0; i < 3; i++) {
      line(PAGE_MARGIN, y + 14 + i * 14, PAGE_MARGIN + CONTENT_W, y + 14 + i * 14);
    }
    y += Math.max(reasonH + 10, 48);

    /* ─── SECTION 6–8: PERSON BEING VISITED ──────────────────── */
    hLine(y, 1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333')
      .text('VISIT DETAILS', PAGE_MARGIN, y + 3);
    y += 16;

    labelVal('6.  Name of person being visited', visitPerson, 0, y, CONTENT_W / 2 - 4);
    labelVal('    Relation', visitRelation, CONTENT_W / 2 + 4, y - LINE_H - 4, CONTENT_W / 2 - 4);

    labelVal('7.  Destination / Place', visitPlace, 0, y, CONTENT_W);

    doc.font('Helvetica-Bold').fontSize(8.5).text('8.  Address & Contact (of person being visited):', PAGE_MARGIN, y);
    y += 13;
    line(PAGE_MARGIN, y + 12, PAGE_MARGIN + CONTENT_W, y + 12);
    line(PAGE_MARGIN, y + 26, PAGE_MARGIN + CONTENT_W, y + 26);
    y += 32;

    /* ─── SECTION 9–10: MOBILE NUMBERS ───────────────────────── */
    hLine(y, 1);
    y += 6;

    labelVal('9.  Applicant\'s Mobile No.', s.phone || '—', 0, y, CONTENT_W / 2 - 4);
    labelVal('10. Parent\'s Mobile No.', s.parentId?.phone || '—', CONTENT_W / 2 + 4, y - LINE_H - 4, CONTENT_W / 2 - 4);

    labelVal('    Student\'s Signature', '', 0, y, CONTENT_W / 2 - 4);
    labelVal('    Date', formatDate(new Date()), CONTENT_W / 2 + 4, y - LINE_H - 4, CONTENT_W / 2 - 4);

    y += 4;

    /* ─── APPROVALS TABLE ─────────────────────────────────────── */
    if (approvals && approvals.length > 0) {
      const appColW = CONTENT_W / 4;
      const appRowH = 22;
      ensureSpace(14 + appRowH * (approvals.length + 1) + 6);

      hLine(y, 1);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#333')
        .text('APPROVAL TRAIL', PAGE_MARGIN, y + 3);
      y += 14;

      const headers = ['Approver', 'Role', 'Decision', 'Date'];

      // Header row
      box(PAGE_MARGIN, y, CONTENT_W, appRowH);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
      headers.forEach((h, i) => {
        if (i > 0) line(PAGE_MARGIN + appColW * i, y, PAGE_MARGIN + appColW * i, y + appRowH);
        doc.text(h, PAGE_MARGIN + appColW * i + 4, y + 6, { width: appColW - 8, lineBreak: false });
      });
      y += appRowH;

      // Data rows
      approvals.forEach((a) => {
        box(PAGE_MARGIN, y, CONTENT_W, appRowH);
        const vals = [
          a.approverId?.name || '—',
          a.role?.replace(/_/g, ' ').toUpperCase() || '—',
          a.action?.toUpperCase() || '—',
          a.actionDate ? formatDate(new Date(a.actionDate)) : '—',
        ];
        doc.font('Helvetica').fontSize(8).fillColor('#000');
        vals.forEach((v, i) => {
          if (i > 0) line(PAGE_MARGIN + appColW * i, y, PAGE_MARGIN + appColW * i, y + appRowH);
          doc.text(v, PAGE_MARGIN + appColW * i + 4, y + 6, { width: appColW - 8, lineBreak: false });
        });
        y += appRowH;
      });

      y += 6;
    }

    /* ─── SIGNATURE BLOCK ─────────────────────────────────────── */
    ensureSpace(46);
    hLine(y, 1);
    y += 10;
    const sigW = CONTENT_W / 2 - 8;

    doc.font('Helvetica').fontSize(8).fillColor('#000')
      .text('Signature of Warden / Associate Dean', PAGE_MARGIN, y, { width: sigW });

    doc.font('Helvetica').fontSize(8)
      .text('Signature of Director General / VC', PAGE_MARGIN + sigW + 16, y, { width: sigW });

    y += 36;
    hLine(y);

    /* ─── QR CODE ─────────────────────────────────────────────── */
    // The QR block (title + caption + 140pt image) must never be cut off by the page edge.
    const qrSize = 140;
    ensureSpace(10 + 14 + 14 + qrSize + 10);

    y += 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
      .text('GATE VERIFICATION QR CODE', PAGE_MARGIN, y, { align: 'center', width: CONTENT_W });
    y += 14;

    doc.font('Helvetica').fontSize(8)
      .text('Show this QR code to the security guard at the gate for verification.',
        PAGE_MARGIN, y, { align: 'center', width: CONTENT_W });
    y += 14;

    if (qrDataUrl) {
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrX = PAGE_MARGIN + (CONTENT_W - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 10;
    }

    /* ─── FOOTER NOTICES ──────────────────────────────────────── */
    const notices = [
      '* Leave from the hostel does not mean leave from college/classes.',
      '* Leave from the hostel on holidays may be granted by the Warden.',
      '* Leave on working days up to 3 days may be granted by the Chief Warden / Associate Dean.',
      '* Leave beyond 3 working days may be granted by the Director General on recommendation of the Dean Hostel.',
      `* This is a digitally approved document. Generated on: ${formatDate(new Date())}`,
    ];

    ensureSpace(6 + notices.length * 11);
    hLine(y);
    y += 6;

    doc.font('Helvetica').fontSize(7).fillColor('#444');
    notices.forEach((n) => {
      doc.text(n, PAGE_MARGIN, y, { width: CONTENT_W });
      y += 11;
    });

    doc.end();
    return doc;
  }
}

export const pdfService = new PdfService();
