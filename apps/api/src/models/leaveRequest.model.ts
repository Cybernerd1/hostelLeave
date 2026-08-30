/**
 * Leave Request Model
 *
 * Core document tracking the full lifecycle of a leave request.
 * Status transitions are governed by the approval workflow state machine.
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { ApprovalStage, LeaveStatus, LeaveType } from '@hostel/shared-types';

export interface ILeaveRequestDocument extends Document {
  _id: mongoose.Types.ObjectId;
  leaveId: string;
  studentId: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  reason: string;
  destination: string;
  documents: string[];
  status: LeaveStatus;
  currentApprovalStage: ApprovalStage;
  approvals: mongoose.Types.ObjectId[];
  qrToken?: string;
  qrExpiry?: Date;
  exitTime?: Date;
  entryTime?: Date;
  exitGuardId?: mongoose.Types.ObjectId;
  entryGuardId?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<ILeaveRequestDocument>(
  {
    leaveId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: Object.values(LeaveType),
      required: true,
      index: true,
    },
    fromDate: {
      type: Date,
      required: [true, 'From date is required'],
    },
    toDate: {
      type: Date,
      required: [true, 'To date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: 1000,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      maxlength: 200,
    },
    documents: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(LeaveStatus),
      default: LeaveStatus.PENDING_PARENT,
      index: true,
    },
    currentApprovalStage: {
      type: String,
      enum: Object.values(ApprovalStage),
      default: ApprovalStage.PARENT,
    },
    approvals: [{
      type: Schema.Types.ObjectId,
      ref: 'LeaveApproval',
    }],
    qrToken: { type: String },
    qrExpiry: { type: Date },
    exitTime: { type: Date },
    entryTime: { type: Date },
    exitGuardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    entryGuardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: { type: Date },
    cancelReason: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Compound indexes for common queries
leaveRequestSchema.index({ status: 1, createdAt: -1 });
leaveRequestSchema.index({ studentId: 1, status: 1 });
leaveRequestSchema.index({ currentApprovalStage: 1, status: 1 });
leaveRequestSchema.index({ fromDate: 1, toDate: 1 });
leaveRequestSchema.index({ qrToken: 1 }, { sparse: true });

/** Virtual: calculate leave duration in days */
leaveRequestSchema.virtual('durationDays').get(function () {
  const diffTime = Math.abs(this.toDate.getTime() - this.fromDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

export const LeaveRequest = mongoose.model<ILeaveRequestDocument>(
  'LeaveRequest',
  leaveRequestSchema,
);
