/**
 * Academic Holiday Model
 *
 * Holiday dates are stored at institution-local midnight as UTC instants. The
 * API accepts and returns YYYY-MM-DD values so calendar dates cannot shift
 * between server and browser time zones.
 */

import mongoose, { Schema, type Document } from 'mongoose';
import { CalendarScope, HolidayType } from '@hostel/shared-types';

export interface IAcademicHolidayDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  type?: HolidayType;
  scope: CalendarScope;
  hostelId?: mongoose.Types.ObjectId;
  academicYear?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const academicHolidaySchema = new Schema<IAcademicHolidayDocument>(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
      maxlength: 200,
    },
    startDate: { type: Date, required: [true, 'Holiday start date is required'] },
    endDate: {
      type: Date,
      required: [true, 'Holiday end date is required'],
      validate: {
        validator(this: IAcademicHolidayDocument, value: Date) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'Holiday end date cannot be earlier than start date',
      },
    },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: Object.values(HolidayType), default: HolidayType.OTHER },
    scope: {
      type: String,
      enum: Object.values(CalendarScope),
      default: CalendarScope.INSTITUTION,
      index: true,
    },
    hostelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      index: true,
    },
    academicYear: { type: String, trim: true, maxlength: 20 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
);

// Calendar entries are scoped by (scope, hostelId); keep lookups fast.
academicHolidaySchema.index({ startDate: 1, endDate: 1 });
academicHolidaySchema.index({ scope: 1, hostelId: 1 });
academicHolidaySchema.index({ academicYear: 1, startDate: 1 });
academicHolidaySchema.index({ name: 1 });

export const AcademicHoliday = mongoose.model<IAcademicHolidayDocument>(
  'AcademicHoliday',
  academicHolidaySchema,
);
