/**
 * Hostel Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { HostelType } from '@hostel/shared-types';

export interface IHostelDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: HostelType;
  wardenId?: mongoose.Types.ObjectId;
  chiefWardenId?: mongoose.Types.ObjectId;
  address?: string;
  totalRooms: number;
  capacity: number;
  occupancy: number;
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hostelSchema = new Schema<IHostelDocument>(
  {
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: Object.values(HostelType),
      required: true,
    },
    wardenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    chiefWardenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    address: { type: String, maxlength: 300 },
    totalRooms: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1 },
    occupancy: { type: Number, default: 0, min: 0 },
    contactNumber: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

export const Hostel = mongoose.model<IHostelDocument>('Hostel', hostelSchema);
