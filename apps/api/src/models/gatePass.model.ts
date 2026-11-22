/**
 * Gate Pass Model
 *
 * A gate pass is created when a leave application is finally approved. It
 * tracks the student's physical movement in and out of the hostel and is
 * the authoritative record for gate operations and dashboards.
 *
 * Lifecycle:
 *   approved (not yet exited) → out_of_hostel → returned
 *   an out_of_hostel pass whose expectedReturn has passed is treated as
 *   `overdue` (computed server-side, not stored) until the student returns.
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { GatePassStatus } from '@hostel/shared-types';

export interface IGatePassDocument extends Document {
  _id: mongoose.Types.ObjectId;
  gatePassNumber: string;
  leaveRequestId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  hostelId?: mongoose.Types.ObjectId;
  status: GatePassStatus;
  approvedDeparture: Date;
  expectedReturn: Date;
  actualExitTime?: Date;
  actualReturnTime?: Date;
  exitVerifiedBy?: mongoose.Types.ObjectId;
  returnVerifiedBy?: mongoose.Types.ObjectId;
  exitRemarks?: string;
  returnRemarks?: string;
  cancelledAt?: Date;
  /** Set once an overdue notification has been sent, so it is sent only once. */
  overdueNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gatePassSchema = new Schema<IGatePassDocument>(
  {
    gatePassNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    leaveRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveRequest',
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
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(GatePassStatus),
      default: GatePassStatus.APPROVED,
      index: true,
    },
    approvedDeparture: { type: Date, required: true },
    expectedReturn: { type: Date, required: true, index: true },
    actualExitTime: { type: Date },
    actualReturnTime: { type: Date },
    exitVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    exitRemarks: { type: String, maxlength: 500, trim: true },
    returnRemarks: { type: String, maxlength: 500, trim: true },
    cancelledAt: { type: Date },
    overdueNotifiedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

gatePassSchema.index({ status: 1, expectedReturn: 1 });
gatePassSchema.index({ hostelId: 1, status: 1 });

export const GatePass = mongoose.model<IGatePassDocument>('GatePass', gatePassSchema);