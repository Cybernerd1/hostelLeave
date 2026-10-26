/**
 * Leave Validation Schemas
 *
 * Zod schemas for leave-related API requests.
 */

import { z } from 'zod';

import { ApprovalAction, LeaveType } from '@hostel/shared-types';

/** Create leave request schema */
export const createLeaveSchema = z
  .object({
    leaveType: z.nativeEnum(LeaveType, {
      required_error: 'Leave type is required',
      invalid_type_error: 'Invalid leave type',
    }),
    fromDate: z
      .string({ required_error: 'From date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid from date' }),
    toDate: z
      .string({ required_error: 'To date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid to date' }),
    reason: z
      .string({ required_error: 'Reason is required' })
      .min(10, 'Reason must be at least 10 characters')
      .max(1000, 'Reason must not exceed 1000 characters')
      .trim(),
    destination: z
      .string({ required_error: 'Destination is required' })
      .min(3, 'Destination must be at least 3 characters')
      .max(200, 'Destination must not exceed 200 characters')
      .trim(),
    attendance: z.coerce
      .number()
      .min(0, 'Attendance cannot be below 0%')
      .max(100, 'Attendance cannot exceed 100%')
      .optional(),
  })
  .refine(
    (data) => {
      const from = new Date(data.fromDate);
      const to = new Date(data.toDate);
      return to >= from;
    },
    {
      message: 'To date must be on or after from date',
      path: ['toDate'],
    },
  )
  .refine(
    (data) => {
      const from = new Date(data.fromDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return from >= now;
    },
    {
      message: 'From date cannot be in the past',
      path: ['fromDate'],
    },
  );

/** Approve/reject leave schema */
export const approveLeaveSchema = z.object({
  action: z.preprocess(
    (val) => (val === 'approve' ? ApprovalAction.APPROVED : val === 'reject' ? ApprovalAction.REJECTED : val),
    z.nativeEnum(ApprovalAction, {
      required_error: 'Action is required',
      invalid_type_error: 'Action must be either approved or rejected',
    }),
  ),
  remarks: z
    .string()
    .max(500, 'Remarks must not exceed 500 characters')
    .trim()
    .optional(),
});

/** Cancel leave schema */
export const cancelLeaveSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters')
    .trim(),
});

/** Leave filter query schema */
export const leaveFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  leaveType: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  studentId: z.string().optional(),
  hostelId: z.string().optional(),
  departmentId: z.string().optional(),
});

export type CreateLeaveSchemaType = z.infer<typeof createLeaveSchema>;
export type ApproveLeaveSchemaType = z.infer<typeof approveLeaveSchema>;
export type CancelLeaveSchemaType = z.infer<typeof cancelLeaveSchema>;
export type LeaveFilterSchemaType = z.infer<typeof leaveFilterSchema>;
