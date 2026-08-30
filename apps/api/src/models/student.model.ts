/**
 * Student Model
 *
 * Student profile linked to a User record.
 * Contains academic, hostel, and personal information.
 */

import mongoose, { Schema, type Document } from 'mongoose';

import { Gender } from '@hostel/shared-types';

export interface IStudentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rollNumber: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth?: Date;
  address: string;
  city: string;
  state: string;
  pincode: string;
  departmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  hostelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  profileImage?: string;
  year: number;
  semester: string;
  admissionYear: number;
  bloodGroup?: string;
  emergencyContact?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
      required: true,
    },
    dateOfBirth: { type: Date },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: 300,
    },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    pincode: { type: String, required: true, trim: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      index: true,
    },
    profileImage: { type: String },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
    },
    admissionYear: {
      type: Number,
      required: true,
    },
    bloodGroup: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Compound indexes for common queries
studentSchema.index({ hostelId: 1, isActive: 1 });
studentSchema.index({ departmentId: 1, isActive: 1 });
studentSchema.index({ name: 'text', rollNumber: 'text' });

export const Student = mongoose.model<IStudentDocument>('Student', studentSchema);
