/**
 * Notification Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { NotificationType } from '@hostel/shared-types';

export interface INotificationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    referenceId: { type: Schema.Types.ObjectId },
    referenceModel: {
      type: String,
      enum: ['LeaveRequest', 'GuardLog', 'User'],
    },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema,
);
