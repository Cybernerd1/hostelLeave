/**
 * Guard Log Model
 *
 * Records guard gate activities (exit/entry scans).
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { GuardAction } from '@hostel/shared-types';

export interface IGuardLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  guardId: mongoose.Types.ObjectId;
  leaveRequestId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  action: GuardAction;
  timestamp: Date;
  location?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardLogSchema = new Schema<IGuardLogDocument>(
  {
    guardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leaveRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(GuardAction),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    location: { type: String, maxlength: 100 },
    remarks: { type: String, maxlength: 200 },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

guardLogSchema.index({ timestamp: -1 });
guardLogSchema.index({ guardId: 1, timestamp: -1 });

export const GuardLog = mongoose.model<IGuardLogDocument>('GuardLog', guardLogSchema);
