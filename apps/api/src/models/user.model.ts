/**
 * User Model
 *
 * Base user document for authentication.
 * All roles (Student, Parent, Warden, etc.) have a corresponding User record.
 * Password is hashed using bcrypt before saving.
 */

import mongoose, { Schema, type Document } from 'mongoose';


import { UserRole } from '@hostel/shared-types';

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  name: string;
  phone?: string;
  profileRef?: mongoose.Types.ObjectId;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'Role is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
    },
    profileRef: {
      type: Schema.Types.ObjectId,
      refPath: 'role',
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        delete r.password;
        delete r.__v;
        return r;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const r = ret as Record<string, unknown>;
        delete r.password;
        delete r.__v;
        return r;
      },
    },
  },
);

// Index for common queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });

/**
 * Instance method: Compare a candidate password with the stored plain-text password.
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return candidatePassword === this.password;
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
