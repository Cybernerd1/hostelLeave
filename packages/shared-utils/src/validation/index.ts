/**
 * Validation Schemas - Barrel Export
 */

export {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  type LoginSchemaType,
  type RefreshTokenSchemaType,
  type ChangePasswordSchemaType,
} from './auth.schema';

export {
  createLeaveSchema,
  approveLeaveSchema,
  cancelLeaveSchema,
  leaveFilterSchema,
  type CreateLeaveSchemaType,
  type ApproveLeaveSchemaType,
  type CancelLeaveSchemaType,
  type LeaveFilterSchemaType,
} from './leave.schema';

export {
  paginationSchema,
  createStudentSchema,
  updateStudentSchema,
  createParentSchema,
  updateParentSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createCourseSchema,
  updateCourseSchema,
  createHostelSchema,
  updateHostelSchema,
  createRoomSchema,
  updateRoomSchema,
  createStaffSchema,
  verifyQRSchema,
  markGateSchema,
  type PaginationSchemaType,
  type CreateStudentSchemaType,
  type UpdateStudentSchemaType,
  type CreateParentSchemaType,
  type UpdateParentSchemaType,
  type CreateDepartmentSchemaType,
  type UpdateDepartmentSchemaType,
  type CreateCourseSchemaType,
  type UpdateCourseSchemaType,
  type CreateHostelSchemaType,
  type UpdateHostelSchemaType,
  type CreateRoomSchemaType,
  type UpdateRoomSchemaType,
  type CreateStaffSchemaType,
  type VerifyQRSchemaType,
  type MarkGateSchemaType,
} from './admin.schema';
