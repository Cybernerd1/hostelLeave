/**
 * Parent Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { ParentRelation } from '@hostel/shared-types';

export interface IParentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  relation: ParentRelation;
  occupation?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const parentSchema = new Schema<IParentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    relation: {
      type: String,
      enum: Object.values(ParentRelation),
      required: true,
    },
    occupation: { type: String, trim: true, maxlength: 100 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    pincode: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

parentSchema.index({ name: 'text', email: 'text' });

export const Parent = mongoose.model<IParentDocument>('Parent', parentSchema);
