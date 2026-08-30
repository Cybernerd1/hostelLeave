/**
 * Course Model
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface ICourseDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  duration: number;
  totalSemesters: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourseDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    duration: { type: Number, required: true, min: 1, max: 8 },
    totalSemesters: { type: Number, required: true, min: 1, max: 16 },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

export const Course = mongoose.model<ICourseDocument>('Course', courseSchema);
