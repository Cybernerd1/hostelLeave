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
import { AuditLog } from '../../models/auditLog.model';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/response.util';
import { createAuditLog } from '../../middleware/audit.middleware';
import { logger } from '../../utils/logger';

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
          UserRole.VICE_CHANCELLOR, UserRole.GUARD,
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
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Parent.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Hostel.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
    ]);

    return {
      totalStudents,
      totalParents,
      totalDepartments,
      totalHostels,
      totalRooms,
    };
  }
}

export const adminService = new AdminService();
