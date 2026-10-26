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
  studentNumber?: string;
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
  hostelId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  profileImage?: string;
  year: number;
  semester: string;
  admissionYear: number;
  bloodGroup?: string;
  emergencyContact?: string;
  admissionNumber?: string;
  academicSession?: string;
  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;
  guardianAddressLine1?: string;
  guardianAddressLine2?: string;
  guardianCity?: string;
  guardianState?: string;
  guardianPincode?: string;
  guardianCountry?: string;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'allocated';
  allocationStatus: 'none' | 'active' | 'transferred' | 'ended';
  allocatedAt?: Date;
  allocatedBy?: mongoose.Types.ObjectId;
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
    studentNumber: {
      type: String,
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
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
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
    admissionNumber: { type: String, trim: true, maxlength: 50 },
    academicSession: { type: String, trim: true, maxlength: 20 },
    fatherName: { type: String, trim: true, maxlength: 100 },
    fatherEmail: { type: String, lowercase: true, trim: true },
    fatherPhone: { type: String, trim: true },
    motherName: { type: String, trim: true, maxlength: 100 },
    motherEmail: { type: String, lowercase: true, trim: true },
    motherPhone: { type: String, trim: true },
    guardianAddressLine1: { type: String, trim: true, maxlength: 150 },
    guardianAddressLine2: { type: String, trim: true, maxlength: 150 },
    guardianCity: { type: String, trim: true, maxlength: 100 },
    guardianState: { type: String, trim: true, maxlength: 100 },
    guardianPincode: { type: String, trim: true, maxlength: 20 },
    guardianCountry: { type: String, trim: true, maxlength: 100 },
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'allocated'],
      default: 'pending',
      index: true,
    },
    allocationStatus: {
      type: String,
      enum: ['none', 'active', 'transferred', 'ended'],
      default: 'none',
      index: true,
    },
    allocatedAt: { type: Date },
    allocatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
