/**
 * User-related type definitions
 *
 * Core user types representing all system actors.
 * These interfaces match the MongoDB document structure.
 */

import type { Gender, HostelType, ParentRelation, RoomType, UserRole } from '../enums';

/** Base user document - all roles have a User record */
export interface IUser {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  profileRef?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** User without sensitive fields - for API responses */
export interface IUserSafe {
  _id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  profileRef?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Student profile document */
export interface IStudent {
  _id: string;
  userId: string;
  rollNumber: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth?: Date;
  address: string;
  city: string;
  state: string;
  pincode: string;
  departmentId: string;
  courseId: string;
  hostelId: string;
  roomId: string;
  parentId: string;
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

/** Student with populated references - for detailed views */
export interface IStudentPopulated extends IStudent {
  user?: IUserSafe;
  department?: IDepartmentBase;
  course?: ICourseBase;
  hostel?: IHostelBase;
  room?: IRoomBase;
  parent?: IParent;
}

/** Parent profile document */
export interface IParent {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  relation: ParentRelation;
  occupation?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Parent with populated user */
export interface IParentPopulated extends IParent {
  user?: IUserSafe;
  children?: IStudent[];
}

/** Department base fields */
export interface IDepartmentBase {
  _id: string;
  name: string;
  code: string;
}

/** Full department document */
export interface IDepartment extends IDepartmentBase {
  hodId?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Department with populated HOD */
export interface IDepartmentPopulated extends IDepartment {
  hod?: IUserSafe;
}

/** Course base fields */
export interface ICourseBase {
  _id: string;
  name: string;
  code: string;
}

/** Full course document */
export interface ICourse extends ICourseBase {
  departmentId: string;
  duration: number;
  totalSemesters: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Course with populated department */
export interface ICoursePopulated extends ICourse {
  department?: IDepartmentBase;
}

/** Hostel base fields */
export interface IHostelBase {
  _id: string;
  name: string;
  type: HostelType;
}

/** Full hostel document */
export interface IHostel extends IHostelBase {
  wardenId?: string;
  chiefWardenId?: string;
  address?: string;
  totalRooms: number;
  capacity: number;
  occupancy: number;
  contactNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Hostel with populated staff */
export interface IHostelPopulated extends IHostel {
  warden?: IUserSafe;
  chiefWarden?: IUserSafe;
}

/** Room base fields */
export interface IRoomBase {
  _id: string;
  roomNumber: string;
  type: RoomType;
}

/** Full room document */
export interface IRoom extends IRoomBase {
  hostelId: string;
  floor: string;
  capacity: number;
  occupied: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Room with populated hostel */
export interface IRoomPopulated extends IRoom {
  hostel?: IHostelBase;
  occupants?: IStudent[];
}

/** Student application document */
export interface IStudentApplication {
  _id: string;
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
  departmentId: string;
  courseId: string;
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

  // Registration form reference
  registrationFormId?: string;

  // Approval workflow
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;

  // Allocation
  hostelId?: string;
  roomId?: string;
  allocatedAt?: Date;
  allocatedBy?: string;

  // Linked records
  userId?: string;
  studentId?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Registration form document */
export interface IRegistrationForm {
  _id: string;
  title: string;
  description?: string;
  token: string;
  academicSession?: string;
  isActive: boolean;
  expiresAt?: Date;
  submissionLimit?: number;
  submissionCount: number;
  requiredFields: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Allocation history document */
export interface IAllocationHistory {
  _id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  action: 'allocate' | 'transfer' | 'reassign' | 'deallocate';
  previousHostelId?: string;
  previousRoomId?: string;
  hostelId: string;
  roomId: string;
  reason: string;
  allocatedBy: string;
  allocatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
