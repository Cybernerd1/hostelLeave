/**
 * Leave Approval Model
 *
 * Records each approval/rejection action in the leave workflow.
 * One record per approval stage per leave request.
 * 
 * The `stageBypassed` field records whether this approval skipped intermediate stages.
 * For example, if Chief Warden approves a PENDING_WARDEN leave directly, the Chief Warden's
 * approval record will have stageBypassed=true, indicating the Warden stage was skipped.
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
  stageBypassed?: boolean;
  bypassedFromStatus?: string;
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
    stageBypassed: {
      type: Boolean,
      default: false,
    },
    bypassedFromStatus: {
      type: String,
      trim: true,
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
