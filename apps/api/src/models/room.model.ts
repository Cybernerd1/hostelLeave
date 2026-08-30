/**
 * Room Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { RoomType } from '@hostel/shared-types';

export interface IRoomDocument extends Document {
  _id: mongoose.Types.ObjectId;
  roomNumber: string;
  hostelId: mongoose.Types.ObjectId;
  floor: string;
  capacity: number;
  occupied: number;
  type: RoomType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoomDocument>(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      maxlength: 20,
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    floor: { type: String, required: true, trim: true, maxlength: 10 },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    occupied: { type: Number, default: 0, min: 0 },
    type: {
      type: String,
      enum: Object.values(RoomType),
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Unique room number within a hostel
roomSchema.index({ hostelId: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.model<IRoomDocument>('Room', roomSchema);
