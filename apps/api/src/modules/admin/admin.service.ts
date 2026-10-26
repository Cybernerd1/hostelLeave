/**
 * Admin Service
 *
 * CRUD operations for all system entities.
 */

import mongoose from 'mongoose';
import { UserRole } from '@hostel/shared-types';


import { User } from '../../models/user.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { Department } from '../../models/department.model';
import { Course } from '../../models/course.model';
import { Hostel } from '../../models/hostel.model';
import { Room } from '../../models/room.model';
import { StudentApplication } from '../../models/studentApplication.model';
import { RegistrationForm } from '../../models/registrationForm.model';
import { AllocationHistory } from '../../models/allocationHistory.model';
import { AuditLog } from '../../models/auditLog.model';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/response.util';
import { createAuditLog } from '../../middleware/audit.middleware';
import { logger } from '../../utils/logger';
import { generateRandomString } from '@hostel/shared-utils';

import type { PaginationMeta } from '@hostel/shared-types';

export class AdminService {
  // ─── Students ─────────────────────────────────────────────────────────────

  async assignParentToStudent(studentId: string, parentId: string, actorId: string) {
    const student = await Student.findById(studentId);
    if (!student) throw AppError.notFound('Student not found');

    const parent = await Parent.findById(parentId);
    if (!parent) throw AppError.notFound('Parent not found');

    const previousParentId = student.parentId;
    student.parentId = parent._id as mongoose.Types.ObjectId;
    await student.save();

    await createAuditLog({
      userId: actorId,
      action: 'update',
      entity: 'Student',
      entityId: studentId,
      previousData: { parentId: previousParentId },
      newData: { parentId: parent._id },
      description: `Parent ${parent.name} assigned to student ${student.name}`,
    });

    logger.info(`Parent ${parentId} assigned to student ${studentId} by ${actorId}`);
    return { student: student._id, parent: parent._id, message: 'Parent assigned successfully' };
  }

  async createStudent(data: Record<string, unknown>, adminId: string) {
    // Create user account
    const email = data.email as string;
    const password = data.password as string;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('Email already registered');
    }

    const user = await User.create({
      email,
      password,
      role: UserRole.STUDENT,
      name: data.name as string,
      phone: data.phone as string,
      isActive: true,
    });

    // Create student profile
    const student = await Student.create({
      userId: user._id,
      rollNumber: data.rollNumber,
      name: data.name,
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      departmentId: data.departmentId,
      courseId: data.courseId,
      hostelId: data.hostelId,
      roomId: data.roomId,
      parentId: data.parentId,
      year: data.year,
      semester: data.semester,
      admissionYear: data.admissionYear,
      bloodGroup: data.bloodGroup,
      emergencyContact: data.emergencyContact,
    });

    // Update room occupancy
    await Room.findByIdAndUpdate(data.roomId, { $inc: { occupied: 1 } });
    await Hostel.findByIdAndUpdate(data.hostelId, { $inc: { occupancy: 1 } });

    await createAuditLog({
      userId: adminId,
      action: 'create',
      entity: 'Student',
      entityId: student._id.toString(),
      newData: student.toObject(),
      description: `Student ${data.name} created`,
    });

    return student;
  }

  async getStudents(
    query: { page: number; limit: number; search?: string; departmentId?: string; hostelId?: string; isActive?: boolean },
  ): Promise<{ data: unknown[]; pagination: PaginationMeta }> {
    const filter: Record<string, unknown> = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { rollNumber: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.departmentId) { filter.departmentId = query.departmentId; }
    if (query.hostelId) { filter.hostelId = query.hostelId; }
    if (query.isActive !== undefined) { filter.isActive = query.isActive; }

    const total = await Student.countDocuments(filter);
    const data = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor')
      .populate('parentId', 'name phone email')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getStudentById(id: string) {
    return Student.findById(id)
      .populate('userId', 'email role isActive lastLogin')
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor type capacity occupied')
      .populate('parentId', 'name phone email relation')
      .lean();
  }

  async updateStudent(id: string, data: Record<string, unknown>, adminId: string) {
    const student = await Student.findById(id);
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const previousData = student.toObject();
    Object.assign(student, data);
    await student.save();

    await createAuditLog({
      userId: adminId,
      action: 'update',
      entity: 'Student',
      entityId: id,
      previousData,
      newData: student.toObject(),
      description: `Student ${student.name} updated`,
    });

    return student;
  }

  async deleteStudent(id: string, adminId: string) {
    const student = await Student.findById(id);
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Deactivate instead of delete
    student.isActive = false;
    await student.save();
    await User.findByIdAndUpdate(student.userId, { isActive: false });

    // Update room occupancy
    await Room.findByIdAndUpdate(student.roomId, { $inc: { occupied: -1 } });
    await Hostel.findByIdAndUpdate(student.hostelId, { $inc: { occupancy: -1 } });

    await createAuditLog({
      userId: adminId,
      action: 'delete',
      entity: 'Student',
      entityId: id,
      description: `Student ${student.name} deactivated`,
    });

    return student;
  }

  /**
   * Assign (or reassign / unassign) a hostel to a student.
   * hostelId = null removes the assignment.
   * hostelId/roomId are required in the schema, so unassignment and
   * room-clearing go through updateOne with $unset to bypass validators.
   */
  async assignHostelToStudent(studentId: string, hostelId: string | null, actorId: string) {
    const student = await Student.findById(studentId);
    if (!student) { throw AppError.notFound('Student not found'); }

    const previousHostelId = student.hostelId;

    // ── Unassign ──
    if (!hostelId) {
      if (!previousHostelId) { throw AppError.badRequest('Student has no hostel assigned'); }
      await Student.updateOne({ _id: student._id }, { $unset: { hostelId: 1, roomId: 1 } });
      await Hostel.findByIdAndUpdate(previousHostelId, { $inc: { occupancy: -1 } });

      await createAuditLog({
        userId: actorId,
        action: 'update',
        entity: 'Student',
        entityId: studentId,
        previousData: { hostelId: previousHostelId },
        description: `Hostel removed for student ${student.name}`,
      });
      logger.info(`Hostel unassigned from student ${studentId} by ${actorId}`);
      return Student.findById(studentId)
        .populate('hostelId', 'name type')
        .populate('roomId', 'roomNumber floor')
        .lean();
    }

    // ── Assign / reassign ──
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) { throw AppError.notFound('Hostel not found'); }
    if (!hostel.isActive) { throw AppError.badRequest('Hostel is not active'); }

    if (previousHostelId && String(previousHostelId) === String(hostel._id)) {
      throw AppError.badRequest('Student is already assigned to this hostel');
    }

    if (hostel.type === 'boys' && student.gender !== 'male') {
      throw AppError.badRequest(`${hostel.name} is a boys' hostel — this student cannot be assigned here`);
    }
    if (hostel.type === 'girls' && student.gender !== 'female') {
      throw AppError.badRequest(`${hostel.name} is a girls' hostel — this student cannot be assigned here`);
    }

    if (hostel.occupancy >= hostel.capacity) {
      throw AppError.badRequest(`${hostel.name} is at full capacity (${hostel.capacity})`);
    }

    await Student.updateOne(
      { _id: student._id },
      { $set: { hostelId: hostel._id }, $unset: { roomId: 1 } },
    );

    if (previousHostelId) {
      await Hostel.findByIdAndUpdate(previousHostelId, { $inc: { occupancy: -1 } });
    }
    await Hostel.findByIdAndUpdate(hostel._id, { $inc: { occupancy: 1 } });

    await createAuditLog({
      userId: actorId,
      action: 'update',
      entity: 'Student',
      entityId: studentId,
      previousData: { hostelId: previousHostelId },
      newData: { hostelId: hostel._id },
      description: `Student ${student.name} assigned to hostel ${hostel.name}`,
    });

    logger.info(`Hostel ${hostel._id} assigned to student ${studentId} by ${actorId}`);
    return Student.findById(studentId)
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor')
      .lean();
  }

  // ─── Parents ──────────────────────────────────────────────────────────────

  async createParent(data: Record<string, unknown>, adminId: string) {
    const email = data.email as string;
    const password = data.password as string;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('Email already registered');
    }

    const user = await User.create({
      email,
      password,
      role: UserRole.PARENT,
      name: data.name as string,
      phone: data.phone as string,
      isActive: true,
    });

    const parent = await Parent.create({
      userId: user._id,
      name: data.name,
      phone: data.phone,
      email,
      relation: data.relation,
      occupation: data.occupation,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
    });

    await createAuditLog({
      userId: adminId,
      action: 'create',
      entity: 'Parent',
      entityId: parent._id.toString(),
      description: `Parent ${data.name} created`,
    });

    return parent;
  }

  async getParents(query: { page: number; limit: number; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const total = await Parent.countDocuments(filter);
    const data = await Parent.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateParent(id: string, data: Record<string, unknown>, adminId: string) {
    const parent = await Parent.findById(id);
    if (!parent) { throw AppError.notFound('Parent not found'); }

    Object.assign(parent, data);
    await parent.save();

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Parent',
      entityId: id, description: `Parent ${parent.name} updated`,
    });

    return parent;
  }

  // ─── Departments ──────────────────────────────────────────────────────────

  async createDepartment(data: Record<string, unknown>, adminId: string) {
    const dept = await Department.create(data);
    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Department',
      entityId: dept._id.toString(), description: `Department ${data.name} created`,
    });
    return dept;
  }

  async getDepartments(query: { page: number; limit: number; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }

    const total = await Department.countDocuments(filter);
    const data = await Department.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('hodId', 'name email')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateDepartment(id: string, data: Record<string, unknown>, adminId: string) {
    const dept = await Department.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!dept) { throw AppError.notFound('Department not found'); }

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Department',
      entityId: id, description: `Department ${dept.name} updated`,
    });

    return dept;
  }

  // ─── Courses ──────────────────────────────────────────────────────────────

  async createCourse(data: Record<string, unknown>, adminId: string) {
    const course = await Course.create(data);
    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Course',
      entityId: course._id.toString(), description: `Course ${data.name} created`,
    });
    return course;
  }

  async getCourses(query: { page: number; limit: number; search?: string; departmentId?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.departmentId) { filter.departmentId = query.departmentId; }

    const total = await Course.countDocuments(filter);
    const data = await Course.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('departmentId', 'name code')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateCourse(id: string, data: Record<string, unknown>, adminId: string) {
    const course = await Course.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!course) { throw AppError.notFound('Course not found'); }

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Course',
      entityId: id, description: `Course ${course.name} updated`,
    });
    return course;
  }

  // ─── Hostels ──────────────────────────────────────────────────────────────

  async createHostel(data: Record<string, unknown>, adminId: string) {
    const hostel = await Hostel.create(data);
    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Hostel',
      entityId: hostel._id.toString(), description: `Hostel ${data.name} created`,
    });
    return hostel;
  }

  async getHostels(query: { page: number; limit: number; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const total = await Hostel.countDocuments(filter);
    const data = await Hostel.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('wardenId', 'name email')
      .populate('chiefWardenId', 'name email')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateHostel(id: string, data: Record<string, unknown>, adminId: string) {
    const hostel = await Hostel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!hostel) { throw AppError.notFound('Hostel not found'); }

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Hostel',
      entityId: id, description: `Hostel ${hostel.name} updated`,
    });
    return hostel;
  }

  async assignWardenToHostel(hostelId: string, wardenUserId: string | null, actorId: string) {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) { throw AppError.notFound('Hostel not found'); }

    if (wardenUserId) {
      const warden = await User.findById(wardenUserId);
      if (!warden) { throw AppError.notFound('Warden user not found'); }
      if (warden.role !== 'warden') { throw AppError.badRequest('User is not a warden'); }
    }

    const previousWardenId = hostel.wardenId;
    hostel.wardenId = wardenUserId ? new mongoose.Types.ObjectId(wardenUserId) : undefined;
    await hostel.save();

    await hostel.populate('wardenId', 'name email');
    await hostel.populate('chiefWardenId', 'name email');

    await createAuditLog({
      userId: actorId,
      action: 'update',
      entity: 'Hostel',
      entityId: hostelId,
      previousData: { wardenId: previousWardenId },
      newData: { wardenId: wardenUserId },
      description: wardenUserId
        ? `Warden assigned to hostel ${hostel.name}`
        : `Warden removed from hostel ${hostel.name}`,
    });

    logger.info(`Hostel ${hostelId} warden updated by ${actorId}`);
    return hostel;
  }


  // ─── Rooms ────────────────────────────────────────────────────────────────

  async createRoom(data: Record<string, unknown>, adminId: string) {
    const room = await Room.create(data);
    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Room',
      entityId: room._id.toString(), description: `Room ${data.roomNumber} created`,
    });
    return room;
  }

  async getRooms(query: { page: number; limit: number; hostelId?: string; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.hostelId) { filter.hostelId = query.hostelId; }
    if (query.search) {
      filter.roomNumber = { $regex: query.search, $options: 'i' };
    }

    const total = await Room.countDocuments(filter);
    const data = await Room.find(filter)
      .sort({ roomNumber: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('hostelId', 'name')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateRoom(id: string, data: Record<string, unknown>, adminId: string) {
    const room = await Room.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!room) { throw AppError.notFound('Room not found'); }

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Room',
      entityId: id, description: `Room ${room.roomNumber} updated`,
    });
    return room;
  }

  // ─── Staff (Warden, Chief Warden, HOD, Guard, VC) ─────────────────────────

  async createStaff(data: Record<string, unknown>, adminId: string) {
    const email = data.email as string;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('Email already registered');
    }

    const user = await User.create({
      email,
      password: data.password,
      role: data.role,
      name: data.name,
      phone: data.phone,
      isActive: true,
    });

    await createAuditLog({
      userId: adminId, action: 'create', entity: 'User',
      entityId: user._id.toString(), description: `Staff ${data.name} (${data.role}) created`,
    });

    return user;
  }

  async getStaff(role?: string) {
    const filter: Record<string, unknown> = {};
    if (role) {
      filter.role = role;
    } else {
      filter.role = {
        $in: [
          UserRole.WARDEN, UserRole.CHIEF_WARDEN, UserRole.HOD,
          UserRole.DIRECTOR, UserRole.GUARD,
        ],
      };
    }

    return User.find(filter).select('-password').sort({ name: 1 }).lean();
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async getAuditLogs(query: {
    page: number; limit: number;
    action?: string; entity?: string; userId?: string;
    fromDate?: string; toDate?: string;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.action) { filter.action = query.action; }
    if (query.entity) { filter.entity = query.entity; }
    if (query.userId) { filter.userId = query.userId; }
    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) { (filter.createdAt as Record<string, unknown>).$gte = new Date(query.fromDate); }
      if (query.toDate) { (filter.createdAt as Record<string, unknown>).$lte = new Date(query.toDate); }
    }

    const total = await AuditLog.countDocuments(filter);
    const data = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('userId', 'name email role')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalStudents,
      totalParents,
      totalDepartments,
      totalHostels,
      totalRooms,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      allocatedStudents,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Parent.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Hostel.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      StudentApplication.countDocuments({}),
      StudentApplication.countDocuments({ status: 'pending' }),
      StudentApplication.countDocuments({ status: 'approved' }),
      StudentApplication.countDocuments({ status: 'rejected' }),
      Student.countDocuments({ hostelId: { $exists: true, $ne: null }, isActive: true }),
    ]);

    return {
      totalStudents,
      totalParents,
      totalDepartments,
      totalHostels,
      totalRooms,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      allocatedStudents,
    };
  }

  // ─── Student Registration: Manual ───────────────────────────────────────

  async registerStudent(data: Record<string, unknown>, adminId: string) {
    const schemaData = data as {
      email: string;
      password: string;
      rollNumber: string;
      studentNumber?: string;
      name: string;
      phone: string;
      gender: string;
      dateOfBirth?: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      departmentId: string;
      courseId: string;
      year: number;
      semester: string;
      admissionYear: number;
      bloodGroup?: string;
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
    };

    // Check for duplicate email
    const existingUser = await User.findOne({ email: schemaData.email });
    if (existingUser) {
      throw AppError.conflict('Email already registered');
    }

    // Check for duplicate roll number
    const existingRoll = await Student.findOne({ rollNumber: schemaData.rollNumber });
    if (existingRoll) {
      throw AppError.conflict('Roll number already exists');
    }

    // Check for duplicate student number
    if (schemaData.studentNumber) {
      const existingStudentNumber = await Student.findOne({ studentNumber: schemaData.studentNumber });
      if (existingStudentNumber) {
        throw AppError.conflict('Student number already exists');
      }
    }

    // Validate department and course exist
    const department = await Department.findById(schemaData.departmentId);
    if (!department) {
      throw AppError.notFound('Department not found');
    }
    const course = await Course.findById(schemaData.courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    // Create application (pending approval)
    const applicationNumber = `APP-${new Date().getFullYear()}-${generateRandomString(6).toUpperCase()}`;
    const application = await StudentApplication.create({
      applicationNumber,
      status: 'pending',
      source: 'manual',
      fullName: schemaData.name,
      studentNumber: schemaData.studentNumber || schemaData.rollNumber,
      admissionNumber: schemaData.admissionNumber,
      dateOfBirth: schemaData.dateOfBirth ? new Date(schemaData.dateOfBirth) : undefined,
      gender: schemaData.gender as 'male' | 'female' | 'other',
      bloodGroup: schemaData.bloodGroup,
      phoneNumber: schemaData.phone,
      email: schemaData.email,
      city: schemaData.city,
      residentialAddress: schemaData.address,
      departmentId: schemaData.departmentId,
      courseId: schemaData.courseId,
      yearOfStudy: schemaData.year,
      semester: schemaData.semester,
      admissionYear: schemaData.admissionYear,
      academicSession: schemaData.academicSession,
      fatherName: schemaData.fatherName,
      fatherEmail: schemaData.fatherEmail,
      fatherPhone: schemaData.fatherPhone,
      motherName: schemaData.motherName,
      motherEmail: schemaData.motherEmail,
      motherPhone: schemaData.motherPhone,
      guardianAddressLine1: schemaData.guardianAddressLine1,
      guardianAddressLine2: schemaData.guardianAddressLine2,
      guardianCity: schemaData.guardianCity,
      guardianState: schemaData.guardianState,
      guardianPincode: schemaData.guardianPincode,
      guardianCountry: schemaData.guardianCountry,
    });

    await createAuditLog({
      userId: adminId,
      action: 'create',
      entity: 'StudentApplication',
      entityId: application._id.toString(),
      newData: application.toObject(),
      description: `Student application ${application.applicationNumber} created by admin`,
    });

    logger.info(`Student application ${applicationNumber} created by ${adminId}`);
    return application;
  }

  // ─── Student Registration: CSV/Excel Import ─────────────────────────────

  async previewImport(records: Record<string, unknown>[]) {
    const results: Array<Record<string, unknown> & { valid: boolean; errors: string[] }> = [];
    let duplicates = 0;

    const seenEmails = new Set<string>();
    const seenRollNumbers = new Set<string>();
    const seenStudentNumbers = new Set<string>();

    for (const record of records) {
      const errors: string[] = [];
      const email = String(record.email || '').trim().toLowerCase();
      const rollNumber = String(record.rollNumber || record.studentNumber || '').trim();
      const studentNumber = String(record.studentNumber || '').trim();

      // Required field validation
      if (!email) errors.push('Email is required');
      if (!rollNumber) errors.push('Roll number/student number is required');
      if (!String(record.name || '').trim()) errors.push('Name is required');
      if (!String(record.phone || '').trim()) errors.push('Phone is required');
      if (!String(record.gender || '').trim()) errors.push('Gender is required');
      if (!String(record.departmentId || '').trim()) errors.push('Department is required');
      if (!String(record.courseId || '').trim()) errors.push('Course is required');
      if (!record.year) errors.push('Year is required');
      if (!String(record.semester || '').trim()) errors.push('Semester is required');
      if (!record.admissionYear) errors.push('Admission year is required');
      if (!String(record.city || '').trim()) errors.push('City is required');
      if (!String(record.address || '').trim()) errors.push('Address is required');

      // Duplicate detection within the import file
      if (email && seenEmails.has(email)) {
        errors.push('Duplicate email within import file');
      }
      if (rollNumber && seenRollNumbers.has(rollNumber)) {
        errors.push('Duplicate roll number within import file');
      }
      if (studentNumber && seenStudentNumbers.has(studentNumber)) {
        errors.push('Duplicate student number within import file');
      }

      if (email) seenEmails.add(email);
      if (rollNumber) seenRollNumbers.add(rollNumber);
      if (studentNumber) seenStudentNumbers.add(studentNumber);

      const valid = errors.length === 0;
      if (!valid) duplicates += 0; // duplicates tracked separately

      results.push({ ...record, valid, errors });
    }

    return results;
  }

  async importStudents(records: Record<string, unknown>[], adminId: string) {
    const successful: string[] = [];
    const failed: Array<{ record: Record<string, unknown>; error: string }> = [];
    const duplicates: Array<{ record: Record<string, unknown>; reason: string }> = [];

    for (const record of records) {
      try {
        const email = String(record.email || '').trim().toLowerCase();
        const rollNumber = String(record.rollNumber || record.studentNumber || '').trim();
        const studentNumber = String(record.studentNumber || rollNumber).trim();

        // Check for existing user/student
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          duplicates.push({ record, reason: 'Email already registered' });
          continue;
        }
        const existingRoll = await Student.findOne({ rollNumber });
        if (existingRoll) {
          duplicates.push({ record, reason: 'Roll number already exists' });
          continue;
        }

        // Validate references
        const department = await Department.findById(record.departmentId);
        if (!department) {
          throw new Error('Department not found');
        }
        const course = await Course.findById(record.courseId);
        if (!course) {
          throw new Error('Course not found');
        }

        // Create application
        const applicationNumber = `APP-${new Date().getFullYear()}-${generateRandomString(6).toUpperCase()}`;
        await StudentApplication.create({
          applicationNumber,
          status: 'pending',
          source: 'import',
          fullName: String(record.name || '').trim(),
          studentNumber: studentNumber || rollNumber,
          admissionNumber: String(record.admissionNumber || '').trim() || undefined,
          dateOfBirth: record.dateOfBirth ? new Date(String(record.dateOfBirth)) : undefined,
          gender: String(record.gender || '').trim() as 'male' | 'female' | 'other',
          bloodGroup: String(record.bloodGroup || '').trim() || undefined,
          phoneNumber: String(record.phone || '').trim(),
          email,
          city: String(record.city || '').trim(),
          residentialAddress: String(record.address || '').trim(),
          departmentId: record.departmentId,
          courseId: record.courseId,
          yearOfStudy: Number(record.year),
          semester: String(record.semester || '').trim(),
          admissionYear: Number(record.admissionYear),
          academicSession: String(record.academicSession || '').trim() || undefined,
          fatherName: String(record.fatherName || '').trim() || undefined,
          fatherEmail: String(record.fatherEmail || '').trim() || undefined,
          fatherPhone: String(record.fatherPhone || '').trim() || undefined,
          motherName: String(record.motherName || '').trim() || undefined,
          motherEmail: String(record.motherEmail || '').trim() || undefined,
          motherPhone: String(record.motherPhone || '').trim() || undefined,
          guardianAddressLine1: String(record.guardianAddressLine1 || '').trim() || undefined,
          guardianAddressLine2: String(record.guardianAddressLine2 || '').trim() || undefined,
          guardianCity: String(record.guardianCity || '').trim() || undefined,
          guardianState: String(record.guardianState || '').trim() || undefined,
          guardianPincode: String(record.guardianPincode || '').trim() || undefined,
          guardianCountry: String(record.guardianCountry || '').trim() || undefined,
        });

        successful.push(rollNumber);
      } catch (err: unknown) {
        failed.push({
          record,
          error: err instanceof Error ? err.message : 'Import failed',
        });
      }
    }

    await createAuditLog({
      userId: adminId,
      action: 'import',
      entity: 'StudentApplication',
      description: `Imported ${successful.length} students, ${failed.length} failed, ${duplicates.length} duplicates`,
    });

    return { successful, failed, duplicates };
  }

  // ─── Application Approval Workflow ──────────────────────────────────────

  async getApplications(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    source?: string;
    departmentId?: string;
    courseId?: string;
    hostelId?: string;
  }) {
    const filter: Record<string, unknown> = { isActive: true };

    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { studentNumber: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { applicationNumber: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.courseId) filter.courseId = query.courseId;

    const total = await StudentApplication.countDocuments(filter);
    const data = await StudentApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('reviewedBy', 'name email role')
      .populate('allocatedBy', 'name email role')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getApplicationById(id: string) {
    return StudentApplication.findById(id)
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('reviewedBy', 'name email role')
      .populate('allocatedBy', 'name email role')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor type capacity occupied')
      .populate('registrationFormId', 'title token academicSession')
      .lean();
  }

  async approveRejectApplication(
    id: string,
    data: { action: 'approve' | 'reject'; reviewNotes?: string; rejectionReason?: string; hostelId?: string; roomId?: string },
    actorId: string
  ) {
    const application = await StudentApplication.findById(id);
    if (!application) {
      throw AppError.notFound('Application not found');
    }

    if (application.status !== 'pending' && application.status !== 'under_review') {
      throw AppError.badRequest(`Application is already ${application.status}`);
    }

    // Prevent duplicate/conflicting actions
    if (application.reviewedBy) {
      throw AppError.badRequest('Application has already been reviewed');
    }

    if (data.action === 'reject') {
      if (!data.rejectionReason) {
        throw AppError.badRequest('Rejection reason is required');
      }
      application.status = 'rejected';
      application.reviewedBy = new mongoose.Types.ObjectId(actorId);
      application.reviewedAt = new Date();
      application.reviewNotes = data.reviewNotes;
      application.rejectionReason = data.rejectionReason;
    } else {
      application.status = 'approved';
      application.reviewedBy = new mongoose.Types.ObjectId(actorId);
      application.reviewedAt = new Date();
      application.reviewNotes = data.reviewNotes;

      // If hostel and room are provided, allocate immediately
      if (data.hostelId && data.roomId) {
        await this.allocateRoomToApplication(application, data.hostelId, data.roomId, actorId, data.reviewNotes);
      }
    }

    await application.save();

    await createAuditLog({
      userId: actorId,
      action: data.action === 'approve' ? 'approve' : 'reject',
      entity: 'StudentApplication',
      entityId: id,
      previousData: { status: application.status === 'approved' || application.status === 'rejected' ? application.status : 'pending' },
      newData: { status: application.status, reviewNotes: data.reviewNotes, rejectionReason: data.rejectionReason },
      description: `Application ${application.applicationNumber} ${data.action}d`,
    });

    logger.info(`Application ${application.applicationNumber} ${data.action}d by ${actorId}`);
    return application;
  }

  private async allocateRoomToApplication(
    application: any,
    hostelId: string,
    roomId: string,
    actorId: string,
    notes?: string
  ) {
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw AppError.notFound('Hostel not found');
    if (!hostel.isActive) throw AppError.badRequest('Hostel is not active');

    const room = await Room.findById(roomId);
    if (!room) throw AppError.notFound('Room not found');
    if (!room.isActive) throw AppError.badRequest('Room is not active');
    if (String(room.hostelId) !== String(hostel._id)) throw AppError.badRequest('Room does not belong to this hostel');
    if (room.occupied >= room.capacity) throw AppError.badRequest('Room is at full capacity');

    // Gender compatibility check
    if (hostel.type === 'boys' && application.gender !== 'male') {
      throw AppError.badRequest(`${hostel.name} is a boys' hostel`);
    }
    if (hostel.type === 'girls' && application.gender !== 'female') {
      throw AppError.badRequest(`${hostel.name} is a girls' hostel`);
    }

    // Use transaction-like safety with session
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      application.hostelId = new mongoose.Types.ObjectId(hostelId);
      application.roomId = new mongoose.Types.ObjectId(roomId);
      application.status = 'allocated';
      application.allocatedAt = new Date();
      application.allocatedBy = new mongoose.Types.ObjectId(actorId);
      await application.save({ session });

      await Room.findByIdAndUpdate(roomId, { $inc: { occupied: 1 } }, { session });
      await Hostel.findByIdAndUpdate(hostelId, { $inc: { occupancy: 1 } }, { session });

      await AllocationHistory.create([{
        studentId: application._id,
        studentNumber: application.studentNumber,
        studentName: application.fullName,
        action: 'allocate',
        hostelId,
        roomId,
        reason: notes || 'Room allocated upon approval',
        allocatedBy: actorId,
        allocatedAt: new Date(),
      }], { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ─── Hostel and Room Allocation ─────────────────────────────────────────

  async allocateRoom(studentId: string, data: { hostelId: string; roomId: string; reason: string }, actorId: string) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const hostel = await Hostel.findById(data.hostelId);
    if (!hostel) throw AppError.notFound('Hostel not found');
    if (!hostel.isActive) throw AppError.badRequest('Hostel is not active');

    const room = await Room.findById(data.roomId);
    if (!room) throw AppError.notFound('Room not found');
    if (!room.isActive) throw AppError.badRequest('Room is not active');
    if (String(room.hostelId) !== String(hostel._id)) throw AppError.badRequest('Room does not belong to this hostel');
    if (room.occupied >= room.capacity) throw AppError.badRequest('Room is at full capacity');

    // Gender compatibility
    if (hostel.type === 'boys' && student.gender !== 'male') {
      throw AppError.badRequest(`${hostel.name} is a boys' hostel`);
    }
    if (hostel.type === 'girls' && student.gender !== 'female') {
      throw AppError.badRequest(`${hostel.name} is a girls' hostel`);
    }

    const previousHostelId = student.hostelId;
    const previousRoomId = student.roomId;

    // If already allocated to same hostel and room
    if (previousHostelId && String(previousHostelId) === String(data.hostelId) &&
        previousRoomId && String(previousRoomId) === String(data.roomId)) {
      throw AppError.badRequest('Student is already allocated to this hostel and room');
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Decrement old allocation
      if (previousRoomId) {
        await Room.findByIdAndUpdate(previousRoomId, { $inc: { occupied: -1 } }, { session });
        await Hostel.findByIdAndUpdate(previousHostelId, { $inc: { occupancy: -1 } }, { session });
      }

      // Assign new allocation
      student.hostelId = new mongoose.Types.ObjectId(data.hostelId);
      student.roomId = new mongoose.Types.ObjectId(data.roomId);
      student.applicationStatus = 'allocated';
      await student.save({ session });

      // Increment new allocation
      await Room.findByIdAndUpdate(data.roomId, { $inc: { occupied: 1 } }, { session });
      await Hostel.findByIdAndUpdate(data.hostelId, { $inc: { occupancy: 1 } }, { session });

      // Record history
      await AllocationHistory.create([{
        studentId: student._id,
        studentNumber: student.rollNumber,
        studentName: student.name,
        action: previousHostelId ? 'transfer' : 'allocate',
        previousHostelId,
        previousRoomId,
        hostelId: data.hostelId,
        roomId: data.roomId,
        reason: data.reason,
        allocatedBy: actorId,
        allocatedAt: new Date(),
      }], { session });

      // Update related application if exists
      await StudentApplication.updateOne(
        { studentId: student._id, status: 'approved' },
        { hostelId: data.hostelId, roomId: data.roomId, status: 'allocated', allocatedAt: new Date(), allocatedBy: actorId }
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return student;
  }

  // ─── Registration Form Management ───────────────────────────────────────

  async createRegistrationForm(data: Record<string, unknown>, actorId: string) {
    const token = generateRandomString(32);
    const form = await RegistrationForm.create({
      title: data.title,
      description: data.description,
      token,
      academicSession: data.academicSession,
      isActive: true,
      expiresAt: data.expiresAt ? new Date(String(data.expiresAt)) : undefined,
      submissionLimit: data.submissionLimit ? Number(data.submissionLimit) : undefined,
      requiredFields: Array.isArray(data.requiredFields) ? data.requiredFields : undefined,
      createdBy: actorId,
    });

    await createAuditLog({
      userId: actorId,
      action: 'create',
      entity: 'RegistrationForm',
      entityId: form._id.toString(),
      newData: form.toObject(),
      description: `Registration form "${form.title}" created`,
    });

    return form;
  }

  async getRegistrationForms(query: { page: number; limit: number; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }

    const total = await RegistrationForm.countDocuments(filter);
    const data = await RegistrationForm.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('createdBy', 'name email role')
      .lean();

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateRegistrationForm(id: string, data: Record<string, unknown>, actorId: string) {
    const form = await RegistrationForm.findById(id);
    if (!form) throw AppError.notFound('Registration form not found');

    const previousData = form.toObject();
    Object.assign(form, data);
    if (data.expiresAt) form.expiresAt = new Date(String(data.expiresAt));
    await form.save();

    await createAuditLog({
      userId: actorId,
      action: 'update',
      entity: 'RegistrationForm',
      entityId: id,
      previousData,
      newData: form.toObject(),
      description: `Registration form "${form.title}" updated`,
    });

    return form;
  }

  async getPublicFormConfig(token: string) {
    const form = await RegistrationForm.findOne({ token }).lean();
    if (!form) throw AppError.notFound('Registration form not found');
    if (!form.isActive) throw AppError.forbidden('Registration form is deactivated');
    if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
      throw AppError.forbidden('Registration form has expired');
    }
    if (form.submissionLimit && form.submissionCount >= form.submissionLimit) {
      throw AppError.forbidden('Registration form submission limit reached');
    }

    return {
      _id: form._id,
      title: form.title,
      description: form.description,
      academicSession: form.academicSession,
      requiredFields: form.requiredFields,
    };
  }

  async submitPublicRegistration(token: string, data: Record<string, unknown>) {
    const form = await RegistrationForm.findOne({ token });
    if (!form) throw AppError.notFound('Registration form not found');
    if (!form.isActive) throw AppError.forbidden('Registration form is deactivated');
    if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
      throw AppError.forbidden('Registration form has expired');
    }
    if (form.submissionLimit && form.submissionCount >= form.submissionLimit) {
      throw AppError.forbidden('Registration form submission limit reached');
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw AppError.conflict('Email already registered');
    }
    const existingApp = await StudentApplication.findOne({ email: data.email, isActive: true });
    if (existingApp) {
      throw AppError.conflict('Application already exists for this email');
    }

    // Create pending application
    const applicationNumber = `APP-${new Date().getFullYear()}-${generateRandomString(6).toUpperCase()}`;
    const application = await StudentApplication.create({
      applicationNumber,
      status: 'pending',
      source: 'public_form',
      registrationFormId: form._id,
      fullName: data.fullName,
      studentNumber: data.studentNumber,
      admissionNumber: data.admissionNumber,
      dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : undefined,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      phoneNumber: data.phoneNumber,
      email: data.email,
      city: data.city,
      residentialAddress: data.residentialAddress,
      departmentId: data.departmentId,
      courseId: data.courseId,
      yearOfStudy: data.yearOfStudy,
      semester: data.semester,
      admissionYear: data.admissionYear,
      academicSession: data.academicSession || form.academicSession,
      fatherName: data.fatherName,
      fatherEmail: data.fatherEmail,
      fatherPhone: data.fatherPhone,
      motherName: data.motherName,
      motherEmail: data.motherEmail,
      motherPhone: data.motherPhone,
      guardianAddressLine1: data.guardianAddressLine1,
      guardianAddressLine2: data.guardianAddressLine2,
      guardianCity: data.guardianCity,
      guardianState: data.guardianState,
      guardianPincode: data.guardianPincode,
      guardianCountry: data.guardianCountry,
    });

    // Increment submission count
    form.submissionCount += 1;
    await form.save();

    await createAuditLog({
      userId: form.createdBy.toString(),
      action: 'create',
      entity: 'StudentApplication',
      entityId: application._id.toString(),
      newData: { applicationNumber, source: 'public_form', formId: form._id },
      description: `Public registration submitted: ${application.applicationNumber}`,
    });

    return { application, applicationNumber, formId: form._id };
  }
}

export const adminService = new AdminService();
