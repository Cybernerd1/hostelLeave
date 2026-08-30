/**
 * Audit Log Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { AuditAction } from '@hostel/shared-types';

export interface IAuditLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    description: { type: String, maxlength: 500 },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
