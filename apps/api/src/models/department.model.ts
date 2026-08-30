/**
 * Department Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IDepartmentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  hodId?: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartmentDocument>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    hodId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

export const Department = mongoose.model<IDepartmentDocument>('Department', departmentSchema);
