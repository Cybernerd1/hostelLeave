/**
 * Registration Form Model
 *
 * Represents a shareable public student registration form link.
 * Staff can create forms with configurable title, description, required fields,
 * academic session, expiry date, and submission limit.
 */

import mongoose, { Schema, type Document } from 'mongoose';

export interface IRegistrationFormDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  token: string;
  academicSession?: string;
  isActive: boolean;
  expiresAt?: Date;
  submissionLimit?: number;
  submissionCount: number;

  // Configurable required fields
  requiredFields: string[];

  // Created by staff member
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const registrationFormSchema = new Schema<IRegistrationFormDocument>(
  {
    title: {
      type: String,
      required: [true, 'Form title is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 1000 },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    academicSession: { type: String, trim: true, maxlength: 20 },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: { type: Date },
    submissionLimit: { type: Number, min: 1 },
    submissionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredFields: {
      type: [String],
      default: [
        'fullName',
        'studentNumber',
        'email',
        'phoneNumber',
        'gender',
        'departmentId',
        'courseId',
        'yearOfStudy',
        'semester',
        'admissionYear',
        'residentialAddress',
        'city',
      ],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  },
);

// Indexes
registrationFormSchema.index({ token: 1 }, { unique: true });
registrationFormSchema.index({ isActive: 1, expiresAt: 1 });
registrationFormSchema.index({ createdBy: 1 });

export const RegistrationForm = mongoose.model<IRegistrationFormDocument>(
  'RegistrationForm',
  registrationFormSchema,
);
