/**
 * Leave Approval Model
 *
 * Records each approval/rejection action in the leave workflow.
 * One record per approval stage per leave request.
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { ApprovalAction, UserRole } from '@hostel/shared-types';

export interface ILeaveApprovalDocument extends Document {
  _id: mongoose.Types.ObjectId;
  leaveRequestId: mongoose.Types.ObjectId;
  approverId: mongoose.Types.ObjectId;
  role: UserRole;
  action: ApprovalAction;
  remarks?: string;
  actionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leaveApprovalSchema = new Schema<ILeaveApprovalDocument>(
  {
    leaveRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      required: true,
      index: true,
    },
    approverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ApprovalAction),
      required: true,
    },
    remarks: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    actionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

leaveApprovalSchema.index({ leaveRequestId: 1, role: 1 }, { unique: true });

export const LeaveApproval = mongoose.model<ILeaveApprovalDocument>(
  'LeaveApproval',
  leaveApprovalSchema,
);
