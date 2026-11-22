/**
 * Gate Movement Model
 *
 * Records historical gate movements (exits and entries) for students.
 * Provides an immutable audit trail of physical movement in and out of hostels.
 *
 * Unlike GatePass (which tracks the state of a leave), GateMovement is append-only
 * and captures every individual scan event with timestamp, guard verification, and remarks.
 *
 * Lifecycle:
 *   - EXIT: Student leaves the hostel (actualExitAt recorded)
 *   - ENTRY: Student returns to the hostel (actualReturnAt recorded)
 *
 * Usage:
 *   - Historical absence calculation: query movements between selected date boundaries
 *   - Movement audit trail: view complete history per student/hostel
 *   - Concurrency-safe: each movement is immutable after creation
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { GuardAction } from '@hostel/shared-types';

export interface IGateMovementDocument extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  hostelId?: mongoose.Types.ObjectId;
  gatePassId?: mongoose.Types.ObjectId;
  leaveRequestId?: mongoose.Types.ObjectId;
  movementType: 'exit' | 'entry';
  actualTimestamp: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedGuardId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const gateMovementSchema = new Schema<IGateMovementDocument>(
  {
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
    gatePassId: {
      type: Schema.Types.ObjectId,
      ref: 'GatePass',
      index: true,
    },
    leaveRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      index: true,
    },
    movementType: {
      type: String,
      enum: ['exit', 'entry'],
      required: true,
      index: true,
    },
    actualTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedGuardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

// Composite indexes for efficient historical queries
gateMovementSchema.index({ studentId: 1, actualTimestamp: -1 });
gateMovementSchema.index({ hostelId: 1, actualTimestamp: -1 });
gateMovementSchema.index({ studentId: 1, hostelId: 1, actualTimestamp: -1 });
gateMovementSchema.index({ gatePassId: 1, actualTimestamp: -1 });
gateMovementSchema.index({ actualTimestamp: 1, movementType: 1 });

// Sparse index for absence period queries: (studentId, actualTimestamp) for students in a date range
gateMovementSchema.index({ studentId: 1, movementType: 1, actualTimestamp: 1 });

export const GateMovement = mongoose.model<IGateMovementDocument>(
  'GateMovement',
  gateMovementSchema,
);
