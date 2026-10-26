/**
 * Student Application Model
 *
 * Represents a student registration application submitted through
 * manual registration, CSV import, or public registration form.
 * Tracks the approval workflow from Pending to Approved/Rejected/Allocated.
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IStudentApplicationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  applicationNumber: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'allocated';
  source: 'manual' | 'import' | 'public_form';

  // Personal Details
  fullName: string;
  studentNumber: string;
  admissionNumber?: string;
  dateOfBirth?: Date;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phoneNumber: string;
  email: string;
  city: string;
  residentialAddress: string;

  // Academic Details
  departmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  yearOfStudy: number;
  semester: string;
  admissionYear: number;
  academicSession?: string;

  // Father's Details
  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;

  // Mother's Details
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;

  // Parent/Guardian Address
  guardianAddressLine1?: string;
  guardianAddressLine2?: string;
  guardianCity?: string;
  guardianState?: string;
  guardianPincode?: string;
  guardianCountry?: string;

  // Registration form reference (for public form submissions)
  registrationFormId?: mongoose.Types.ObjectId;

  // Approval workflow
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;

  // Allocation
  hostelId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  allocatedAt?: Date;
  allocatedBy?: mongoose.Types.ObjectId;

  // Linked records (created after approval)
  userId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const studentApplicationSchema = new Schema<IStudentApplicationDocument>(
  {
    applicationNumber: {
      type: String,
      required: [true, 'Application number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'allocated'],
      required: true,
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'import', 'public_form'],
      required: true,
      default: 'manual',
    },

    // Personal Details
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 100 },
    studentNumber: {
      type: String,
      required: [true, 'Student number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    admissionNumber: { type: String, trim: true, maxlength: 50 },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    bloodGroup: { type: String, trim: true, maxlength: 10 },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    residentialAddress: {
      type: String,
      required: [true, 'Residential address is required'],
      trim: true,
      maxlength: 300,
    },

    // Academic Details
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
    yearOfStudy: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    semester: { type: String, required: true, trim: true, maxlength: 10 },
    admissionYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    academicSession: { type: String, trim: true, maxlength: 20 },

    // Father's Details
    fatherName: { type: String, trim: true, maxlength: 100 },
    fatherEmail: { type: String, lowercase: true, trim: true },
    fatherPhone: { type: String, trim: true },

    // Mother's Details
    motherName: { type: String, trim: true, maxlength: 100 },
    motherEmail: { type: String, lowercase: true, trim: true },
    motherPhone: { type: String, trim: true },

    // Parent/Guardian Address
    guardianAddressLine1: { type: String, trim: true, maxlength: 150 },
    guardianAddressLine2: { type: String, trim: true, maxlength: 150 },
    guardianCity: { type: String, trim: true, maxlength: 100 },
    guardianState: { type: String, trim: true, maxlength: 100 },
    guardianPincode: { type: String, trim: true, maxlength: 20 },
    guardianCountry: { type: String, trim: true, maxlength: 100 },

    // Registration form reference
    registrationFormId: {
      type: Schema.Types.ObjectId,
      ref: 'RegistrationForm',
    },

    // Approval workflow
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, maxlength: 500 },
    rejectionReason: { type: String, maxlength: 500 },

    // Allocation
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    allocatedAt: { type: Date },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Linked records
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },

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

// Compound indexes
studentApplicationSchema.index({ status: 1, createdAt: -1 });
studentApplicationSchema.index({ email: 1 });
studentApplicationSchema.index({ studentNumber: 1 });
studentApplicationSchema.index({ source: 1, status: 1 });
studentApplicationSchema.index({ registrationFormId: 1 });

export const StudentApplication = mongoose.model<IStudentApplicationDocument>(
  'StudentApplication',
  studentApplicationSchema,
);
