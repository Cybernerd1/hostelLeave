/**
 * Allocation History Model
 *
 * Tracks all hostel and room allocations, transfers, and reassignments
 * for audit and historical purposes.
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IAllocationHistoryDocument extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentNumber: string;
  studentName: string;
  action: 'allocate' | 'transfer' | 'reassign' | 'deallocate';

  // Previous allocation
  previousHostelId?: mongoose.Types.ObjectId;
  previousRoomId?: mongoose.Types.ObjectId;

  // New allocation
  hostelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;

  // Reason and metadata
  reason: string;
  allocatedBy: mongoose.Types.ObjectId;
  allocatedAt: Date;
  status: 'active' | 'transferred' | 'ended';

  createdAt: Date;
  updatedAt: Date;
}

const allocationHistorySchema = new Schema<IAllocationHistoryDocument>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    studentNumber: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['allocate', 'transfer', 'reassign', 'deallocate'],
      required: true,
    },
    previousHostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
    },
    previousRoomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: 500,
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    allocatedAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'transferred', 'ended'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Indexes
allocationHistorySchema.index({ studentId: 1, createdAt: -1 });
allocationHistorySchema.index({ action: 1, createdAt: -1 });
allocationHistorySchema.index({ hostelId: 1, roomId: 1 });

export const AllocationHistory = mongoose.model<IAllocationHistoryDocument>(
  'AllocationHistory',
  allocationHistorySchema,
);
