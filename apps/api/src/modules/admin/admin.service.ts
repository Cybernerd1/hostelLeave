/**
 * Admin Service
 *
 * CRUD operations for all system entities.
 */

import mongoose from 'mongoose';
import { UserRole, RoomType } from '@hostel/shared-types';


import { User } from '../../models/user.model';
import { Student, type IStudentDocument } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { Department } from '../../models/department.model';
import { Course } from '../../models/course.model';
import { Hostel } from '../../models/hostel.model';
import { Room } from '../../models/room.model';
import { StudentApplication, type IStudentApplicationDocument } from '../../models/studentApplication.model';
import { RegistrationForm } from '../../models/registrationForm.model';
import { AllocationHistory } from '../../models/allocationHistory.model';
import { AuditLog } from '../../models/auditLog.model';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/response.util';
import { createAuditLog } from '../../middleware/audit.middleware';
import { logger } from '../../utils/logger';
import { generateRandomString } from '@hostel/shared-utils';

import type { PaginationMeta } from '@hostel/shared-types';

type HostelCapacityInput = {
  name?: unknown;
  type?: unknown;
  wardenId?: unknown;
  chiefWardenId?: unknown;
  address?: unknown;
  totalRooms?: unknown;
  numberOfRooms?: unknown;
  studentsPerRoom?: unknown;
  capacity?: unknown;
  contactNumber?: unknown;
  isActive?: unknown;
};

function roomTypeForCapacity(capacity: number): RoomType {
  if (capacity === 1) return RoomType.SINGLE;
  if (capacity === 2) return RoomType.DOUBLE;
  return RoomType.TRIPLE;
}

function roomNumberForIndex(index: number, prefix?: string): string {
  const number = String(101 + index);
  return prefix ? `${prefix}-${number}` : number;
}

function isTransactionUnsupported(error: unknown): boolean {
  const candidate = error as { code?: number; message?: string };
  return candidate?.code === 20 || /transaction[s]? not supported|replica set/i.test(candidate?.message || '');
}

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
      .populate('allocatedBy', 'name email role')
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

  async deleteDepartment(id: string, adminId: string) {
    const dept = await Department.findById(id);
    if (!dept) throw AppError.notFound('Department not found');
    const linkedCourses = await Course.countDocuments({ departmentId: dept._id, isActive: true });
    const linkedStudents = await Student.countDocuments({ departmentId: dept._id, isActive: true });
    if (linkedCourses > 0 || linkedStudents > 0) throw AppError.badRequest('Department is in use. Reassign its courses and students first.');
    dept.isActive = false;
    await dept.save();
    await createAuditLog({ userId: adminId, action: 'delete', entity: 'Department', entityId: id, description: `Department ${dept.name} deactivated` });
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

  async deleteCourse(id: string, adminId: string) {
    const course = await Course.findById(id);
    if (!course) throw AppError.notFound('Course not found');
    const linkedStudents = await Student.countDocuments({ courseId: course._id, isActive: true });
    if (linkedStudents > 0) throw AppError.badRequest('Course is assigned to active students. Reassign them first.');
    course.isActive = false;
    await course.save();
    await createAuditLog({ userId: adminId, action: 'delete', entity: 'Course', entityId: id, description: `Course ${course.name} deactivated` });
    return course;
  }

  // ─── Hostels ──────────────────────────────────────────────────────────────

  private getHostelConfiguration(data: HostelCapacityInput, existing?: { totalRooms?: number; studentsPerRoom?: number; capacity?: number }) {
    const totalRooms = Number(data.numberOfRooms ?? data.totalRooms ?? existing?.totalRooms ?? 0);
    if (!Number.isInteger(totalRooms) || totalRooms < 1) {
      throw AppError.badRequest('Number of rooms must be a positive integer');
    }

    let studentsPerRoom = data.studentsPerRoom == null
      ? Number(existing?.studentsPerRoom ?? 0)
      : Number(data.studentsPerRoom);
    if (!Number.isInteger(studentsPerRoom) || ![1, 2, 3].includes(studentsPerRoom)) {
      const legacyCapacity = Number(data.capacity ?? existing?.capacity ?? 0);
      studentsPerRoom = legacyCapacity > 0 && legacyCapacity % totalRooms === 0
        ? legacyCapacity / totalRooms
        : 0;
    }
    if (![1, 2, 3].includes(studentsPerRoom)) {
      throw AppError.badRequest('Students per room must be 1, 2, or 3');
    }

    return { totalRooms, studentsPerRoom: studentsPerRoom as 1 | 2 | 3, capacity: totalRooms * studentsPerRoom };
  }

  private async getRoomPrefix(): Promise<string | undefined> {
    const existingRoom = await Room.findOne({ roomNumber: /^([A-Za-z]+)-\d+$/ }).select('roomNumber').lean();
    const match = existingRoom?.roomNumber.match(/^([A-Za-z]+)-\d+$/);
    return match?.[1];
  }

  private async generateRooms(
    hostelId: mongoose.Types.ObjectId,
    startIndex: number,
    count: number,
    capacity: number,
    prefix?: string,
  ) {
    if (count <= 0) return;
    const operations = Array.from({ length: count }, (_, offset) => {
      const index = startIndex + offset;
      const roomNumber = roomNumberForIndex(index, prefix);
      return {
        updateOne: {
          filter: { hostelId, roomNumber },
          update: {
            $setOnInsert: {
              roomNumber,
              hostelId,
              floor: String(Math.floor(index / 10) + 1),
              capacity,
              occupied: 0,
              type: roomTypeForCapacity(capacity),
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    });
    await Room.bulkWrite(operations, { ordered: true });
  }

  private async getHostelStatistics(hostelIds: mongoose.Types.ObjectId[]) {
    if (hostelIds.length === 0) return new Map<string, { totalRooms: number; capacity: number; occupied: number; fullyOccupiedRooms: number }>();

    const roomStats = await Room.aggregate([
      { $match: { hostelId: { $in: hostelIds }, isActive: true } },
      { $group: { _id: '$hostelId', totalRooms: { $sum: 1 }, capacity: { $sum: '$capacity' } } },
    ]);
    const occupancyStats = await Student.aggregate([
      { $match: { isActive: true, hostelId: { $in: hostelIds }, roomId: { $exists: true, $ne: null } } },
      { $group: { _id: { hostelId: '$hostelId', roomId: '$roomId' }, occupied: { $sum: 1 } } },
      { $group: { _id: '$_id.hostelId', occupied: { $sum: '$occupied' } } },
    ]);
    const fullRoomStats = await Room.aggregate([
      { $match: { hostelId: { $in: hostelIds }, isActive: true } },
      {
        $lookup: {
          from: 'students',
          let: { roomId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$roomId', '$$roomId'] },
              { $eq: ['$isActive', true] },
            ] } } },
            { $count: 'count' },
          ],
          as: 'occupancy',
        },
      },
      { $addFields: { occupiedSeats: { $ifNull: [{ $arrayElemAt: ['$occupancy.count', 0] }, 0] } } },
      { $match: { $expr: { $gte: ['$occupiedSeats', '$capacity'] } } },
      { $group: { _id: '$hostelId', fullyOccupiedRooms: { $sum: 1 } } },
    ]);

    const result = new Map<string, { totalRooms: number; capacity: number; occupied: number; fullyOccupiedRooms: number }>();
    for (const item of roomStats) {
      result.set(String(item._id), { totalRooms: item.totalRooms, capacity: item.capacity, occupied: 0, fullyOccupiedRooms: 0 });
    }
    for (const item of occupancyStats) {
      const stats = result.get(String(item._id));
      if (stats) stats.occupied = item.occupied;
    }
    for (const item of fullRoomStats) {
      const stats = result.get(String(item._id));
      if (stats) stats.fullyOccupiedRooms = item.fullyOccupiedRooms;
    }
    return result;
  }

  private async formatHostels(hostels: Array<Record<string, any>>): Promise<Array<Record<string, any>>> {
    const stats = await this.getHostelStatistics(hostels.map((hostel) => new mongoose.Types.ObjectId(String(hostel._id))));
    return hostels.map((hostel) => {
      const item = stats.get(String(hostel._id)) || { totalRooms: 0, capacity: 0, occupied: 0, fullyOccupiedRooms: 0 };
      const availableSeats = Math.max(item.capacity - item.occupied, 0);
      return {
        ...hostel,
        totalRooms: item.totalRooms,
        capacity: item.capacity,
        occupiedSeats: item.occupied,
        occupancy: item.occupied,
        availableSeats,
        fullyOccupiedRooms: item.fullyOccupiedRooms,
        occupancyPercentage: item.capacity ? Math.round((item.occupied / item.capacity) * 10000) / 100 : 0,
      };
    });
  }

  private async assertHostelScope(hostel: { wardenId?: mongoose.Types.ObjectId }, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.WARDEN && String(hostel.wardenId || '') !== actorId) {
      throw AppError.forbidden('You are not authorized to manage this hostel');
    }
  }

  async createHostel(data: Record<string, unknown>, adminId: string) {
    const config = this.getHostelConfiguration(data);
    const name = String(data.name || '').trim();
    const existing = await Hostel.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) throw AppError.conflict('A hostel with this name already exists');

    let hostel;
    try {
      hostel = await Hostel.create({
        ...data,
        name,
        normalizedName: name.toLocaleLowerCase().trim(),
        totalRooms: config.totalRooms,
        studentsPerRoom: config.studentsPerRoom,
        capacity: config.capacity,
        occupancy: 0,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw AppError.conflict('A hostel with this name already exists');
      throw error;
    }

    try {
      await this.generateRooms(hostel._id, 0, config.totalRooms, config.studentsPerRoom, await this.getRoomPrefix());
    } catch (error) {
      await Room.deleteMany({ hostelId: hostel._id });
      await Hostel.deleteOne({ _id: hostel._id });
      throw error;
    }

    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Hostel',
      entityId: hostel._id.toString(), description: `Hostel ${name} created with ${config.totalRooms} rooms`,
    });
    const formatted = await this.formatHostels([hostel.toObject()]);
    return formatted[0];
  }

  async getHostels(query: { page: number; limit: number; search?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const total = await Hostel.countDocuments(filter);
    const hostels = await Hostel.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('wardenId', 'name email')
      .populate('chiefWardenId', 'name email')
      .lean();

    const data = await this.formatHostels(hostels as Array<Record<string, any>>);
    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async updateHostel(id: string, data: Record<string, unknown>, adminId: string) {
    const hostel = await Hostel.findById(id);
    if (!hostel) throw AppError.notFound('Hostel not found');
    const config = this.getHostelConfiguration(data, hostel);
    if (data.name && String(data.name).trim().toLowerCase() !== hostel.name.toLowerCase()) {
      const duplicate = await Hostel.findOne({ _id: { $ne: hostel._id }, name: { $regex: `^${String(data.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      if (duplicate) throw AppError.conflict('A hostel with this name already exists');
      hostel.name = String(data.name).trim();
      hostel.normalizedName = hostel.name.toLocaleLowerCase();
    }

    const allRooms = await Room.find({ hostelId: hostel._id }).sort({ roomNumber: 1 });
    const activeRooms = allRooms.filter((room) => room.isActive);
    const actualOccupancy = await Student.aggregate([
      { $match: { isActive: true, hostelId: hostel._id, roomId: { $exists: true, $ne: null } } },
      { $group: { _id: '$roomId', occupied: { $sum: 1 } } },
    ]);
    const occupiedByRoom = new Map(actualOccupancy.map((item) => [String(item._id), item.occupied as number]));
    if (config.studentsPerRoom !== hostel.studentsPerRoom) {
      const overCapacity = actualOccupancy.some((item) => item.occupied > config.studentsPerRoom);
      if (overCapacity) throw AppError.badRequest('Students per room cannot be reduced below current occupancy');
    }

    if (config.totalRooms < activeRooms.length) {
      const roomsToDeactivate = activeRooms.slice(config.totalRooms).filter((room) => (occupiedByRoom.get(String(room._id)) || 0) > 0);
      if (roomsToDeactivate.length) throw AppError.badRequest('Occupied rooms cannot be removed from a hostel');
      await Room.updateMany(
        { _id: { $in: activeRooms.slice(config.totalRooms).map((room) => room._id) } },
        { $set: { isActive: false } },
      );
    } else if (config.totalRooms > activeRooms.length) {
      await this.generateRooms(hostel._id, allRooms.length, config.totalRooms - activeRooms.length, config.studentsPerRoom, await this.getRoomPrefix());
    }

    await Room.updateMany(
      { hostelId: hostel._id, isActive: true },
      { $set: { capacity: config.studentsPerRoom, type: roomTypeForCapacity(config.studentsPerRoom) } },
    );
    hostel.totalRooms = config.totalRooms;
    hostel.studentsPerRoom = config.studentsPerRoom;
    hostel.capacity = config.capacity;
    if (data.type !== undefined) hostel.type = data.type as typeof hostel.type;
    if (data.wardenId !== undefined) hostel.wardenId = data.wardenId ? new mongoose.Types.ObjectId(String(data.wardenId)) : undefined;
    if (data.chiefWardenId !== undefined) hostel.chiefWardenId = data.chiefWardenId ? new mongoose.Types.ObjectId(String(data.chiefWardenId)) : undefined;
    if (data.address !== undefined) hostel.address = data.address as string;
    if (data.contactNumber !== undefined) hostel.contactNumber = data.contactNumber as string;
    if (data.isActive !== undefined) hostel.isActive = Boolean(data.isActive);
    await hostel.save();

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Hostel',
      entityId: id, description: `Hostel ${hostel.name} updated`,
    });
    const formatted = await this.formatHostels([hostel.toObject()]);
    return formatted[0];
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
    const hostel = await Hostel.findById(data.hostelId);
    if (!hostel) throw AppError.notFound('Hostel not found');
    const capacity = Number(data.capacity);
    if (![1, 2, 3].includes(capacity)) throw AppError.badRequest('Room capacity must be 1, 2, or 3');
    const room = await Room.create({
      ...data,
      capacity,
      type: data.type || roomTypeForCapacity(capacity),
      occupied: 0,
    });
    await createAuditLog({
      userId: adminId, action: 'create', entity: 'Room',
      entityId: room._id.toString(), description: `Room ${data.roomNumber} created`,
    });
    return this.formatRooms([room.toObject()]).then((rooms) => rooms[0]);
  }

  private async formatRooms(rooms: Array<Record<string, any>>): Promise<Array<Record<string, any>>> {
    if (rooms.length === 0) return [];
    const roomIds = rooms.map((room) => new mongoose.Types.ObjectId(String(room._id)));
    const occupancy = await Student.aggregate([
      { $match: { isActive: true, roomId: { $in: roomIds } } },
      { $group: { _id: '$roomId', occupied: { $sum: 1 } } },
    ]);
    const occupiedByRoom = new Map(occupancy.map((item) => [String(item._id), item.occupied as number]));
    const students = await Student.find({ isActive: true, roomId: { $in: roomIds } })
      .select('name rollNumber studentNumber userId hostelId roomId')
      .populate('userId', 'email')
      .lean();
    const studentsByRoom = new Map<string, Array<Record<string, unknown>>>();
    for (const student of students) {
      const key = String(student.roomId);
      const roomStudents = studentsByRoom.get(key) || [];
      roomStudents.push({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        studentNumber: student.studentNumber,
        email: (student.userId as unknown as { email?: string })?.email,
      });
      studentsByRoom.set(key, roomStudents);
    }
    return rooms.map((room) => {
      const occupied = occupiedByRoom.get(String(room._id)) || 0;
      return { ...room, occupied, availableSeats: Math.max(room.capacity - occupied, 0), occupancyStatus: occupied === 0 ? 'Available' : occupied >= room.capacity ? 'Full' : 'Partially Occupied', students: studentsByRoom.get(String(room._id)) || [] };
    });
  }

  async getRooms(query: { page: number; limit: number; hostelId?: string; search?: string; availability?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.hostelId) { filter.hostelId = query.hostelId; }
    if (query.search) {
      filter.roomNumber = { $regex: query.search, $options: 'i' };
    }

    const total = await Room.countDocuments(filter);
    const rooms = await Room.find(filter)
      .sort({ roomNumber: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('hostelId', 'name')
      .lean();

    let data = await this.formatRooms(rooms as Array<Record<string, any>>);
    if (query.availability === 'available') data = data.filter((room) => room.isActive && room.availableSeats > 0);
    if (query.availability === 'full') data = data.filter((room) => room.isActive && room.availableSeats === 0);
    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getHostelRooms(hostelId: string, actorId: string, actorRole: UserRole, onlyAvailable = false, search?: string) {
    const hostel = await Hostel.findById(hostelId).lean();
    if (!hostel) throw AppError.notFound('Hostel not found');
    await this.assertHostelScope(hostel, actorId, actorRole);
    const filter: Record<string, unknown> = { hostelId: hostel._id };
    if (onlyAvailable) filter.isActive = true;
    if (search) filter.roomNumber = { $regex: search, $options: 'i' };
    const rooms = await Room.find(filter).sort({ roomNumber: 1 }).populate('hostelId', 'name').lean();
    const formatted = await this.formatRooms(rooms as Array<Record<string, any>>);
    return onlyAvailable ? formatted.filter((room) => room.availableSeats > 0) : formatted;
  }

  async getAvailableHostels(actorId: string, actorRole: UserRole) {
    const filter: Record<string, unknown> = { isActive: true };
    if (actorRole === UserRole.WARDEN) filter.wardenId = actorId;
    const hostels = await Hostel.find(filter).sort({ name: 1 }).lean();
    const formatted = await this.formatHostels(hostels as Array<Record<string, any>>);
    return formatted
      .filter((hostel) => hostel.availableSeats > 0)
      .map((hostel) => ({
        _id: hostel._id,
        name: hostel.name,
        type: hostel.type,
        roomsAvailable: hostel.totalRooms - hostel.fullyOccupiedRooms,
        seatsRemaining: hostel.availableSeats,
      }));
  }

  async getAvailableRooms(hostelId: string, actorId: string, actorRole: UserRole) {
    return this.getHostelRooms(hostelId, actorId, actorRole, true);
  }

  async updateRoom(id: string, data: Record<string, unknown>, adminId: string) {
    const room = await Room.findById(id);
    if (!room) throw AppError.notFound('Room not found');
    if (data.capacity !== undefined) {
      const capacity = Number(data.capacity);
      if (![1, 2, 3].includes(capacity)) throw AppError.badRequest('Room capacity must be 1, 2, or 3');
      const occupied = await Student.countDocuments({ isActive: true, roomId: room._id });
      if (occupied > capacity) throw AppError.badRequest('Room capacity cannot be less than current occupancy');
      room.capacity = capacity;
      room.type = roomTypeForCapacity(capacity);
    }
    if (data.roomNumber !== undefined) room.roomNumber = String(data.roomNumber);
    if (data.floor !== undefined) room.floor = String(data.floor);
    if (data.isActive !== undefined) room.isActive = Boolean(data.isActive);
    await room.save();

    await createAuditLog({
      userId: adminId, action: 'update', entity: 'Room',
      entityId: id, description: `Room ${room.roomNumber} updated`,
    });
    return this.formatRooms([room.toObject()]).then((rooms) => rooms[0]);
  }

  async deleteRoom(id: string, actorId: string) {
    const room = await Room.findById(id);
    if (!room) throw AppError.notFound('Room not found');
    const activeStudents = await Student.countDocuments({ isActive: true, roomId: room._id });
    if (activeStudents > 0) throw AppError.badRequest('Room has allocated students. Remove or transfer them before deleting it.');
    const historyCount = await AllocationHistory.countDocuments({ roomId: room._id });
    if (historyCount > 0) throw AppError.badRequest('Room has allocation history. Mark it unavailable instead of deleting it.');
    await Room.deleteOne({ _id: room._id });
    await createAuditLog({ userId: actorId, action: 'delete', entity: 'Room', entityId: id, description: `Room ${room.roomNumber} deleted` });
    return { deleted: true, id };
  }

  async deleteHostel(id: string, actorId: string) {
    const hostel = await Hostel.findById(id);
    if (!hostel) throw AppError.notFound('Hostel not found');
    const activeStudents = await Student.countDocuments({ isActive: true, hostelId: hostel._id });
    if (activeStudents > 0) throw AppError.badRequest('Hostel has allocated students. Remove or transfer them before deleting it.');
    const roomIds = await Room.find({ hostelId: hostel._id }).distinct('_id');
    const historyCount = await AllocationHistory.countDocuments({ $or: [{ hostelId: hostel._id }, { roomId: { $in: roomIds } }] });
    if (historyCount > 0) throw AppError.badRequest('Hostel has allocation history. Mark it unavailable instead of deleting it.');
    await Room.deleteMany({ hostelId: hostel._id });
    await Hostel.deleteOne({ _id: hostel._id });
    await createAuditLog({ userId: actorId, action: 'delete', entity: 'Hostel', entityId: id, description: `Hostel ${hostel.name} deleted` });
    return { deleted: true, id };
  }

  async getAllocationCandidates() {
    return Student.find({ isActive: true, applicationStatus: { $in: ['approved', 'allocated'] } })
      .select('name rollNumber studentNumber gender applicationStatus hostelId roomId')
      .sort({ name: 1 })
      .lean();
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
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      allocatedStudents,
      roomSummary,
      awaitingStudents,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Parent.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Hostel.countDocuments({ isActive: true }),
      StudentApplication.countDocuments({}),
      StudentApplication.countDocuments({ status: 'pending' }),
      StudentApplication.countDocuments({ status: 'approved' }),
      StudentApplication.countDocuments({ status: 'rejected' }),
      Student.countDocuments({ roomId: { $exists: true, $ne: null }, isActive: true }),
      Room.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'students',
            let: { roomId: '$_id' },
            pipeline: [
              { $match: { $expr: { $and: [
                { $eq: ['$roomId', '$$roomId'] },
                { $eq: ['$isActive', true] },
              ] } } },
              { $count: 'count' },
            ],
            as: 'occupancy',
          },
        },
        { $addFields: { occupiedSeats: { $ifNull: [{ $arrayElemAt: ['$occupancy.count', 0] }, 0] } } },
        { $group: {
          _id: null,
          totalRooms: { $sum: 1 },
          totalBedCapacity: { $sum: '$capacity' },
          occupiedSeats: { $sum: '$occupiedSeats' },
          fullyOccupiedRooms: { $sum: { $cond: [{ $gte: ['$occupiedSeats', '$capacity'] }, 1, 0] } },
        } },
      ]),
      Student.countDocuments({ isActive: true, applicationStatus: 'approved', $or: [{ roomId: { $exists: false } }, { roomId: null }] }),
    ]);

    const summary = roomSummary[0] || { totalRooms: 0, totalBedCapacity: 0, occupiedSeats: 0, fullyOccupiedRooms: 0 };
    const awaitingApplications = await StudentApplication.countDocuments({ status: 'approved', studentId: { $exists: false } });

    return {
      totalStudents,
      totalParents,
      totalDepartments,
      totalHostels,
      totalRooms: summary.totalRooms,
      totalBedCapacity: summary.totalBedCapacity,
      occupiedSeats: summary.occupiedSeats,
      availableSeats: Math.max(summary.totalBedCapacity - summary.occupiedSeats, 0),
      fullyOccupiedRooms: summary.fullyOccupiedRooms,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      allocatedStudents,
      studentsAwaitingAllocation: awaitingStudents + awaitingApplications,
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
    data: { action: 'approve' | 'reject'; reviewNotes?: string; rejectionReason?: string },
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
      // Approval and allocation are deliberately separate operations. Create
      // the student profile now, but do not reserve a bed until an allocator
      // confirms a room through the allocation endpoint.
      await this.ensureStudentProfile(application);
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

  // ─── Hostel and Room Allocation ─────────────────────────────────────────

  private async ensureStudentProfile(application: IStudentApplicationDocument) {
    if (application.studentId) {
      return Student.findById(application.studentId);
    }

    let user = await User.findOne({ email: application.email });
    if (user && user.role !== UserRole.STUDENT) {
      throw AppError.conflict('An account with the application email already exists');
    }
    if (!user) {
      user = await User.create({
        email: application.email,
        password: `Temp@${generateRandomString(12)}`,
        role: UserRole.STUDENT,
        name: application.fullName,
        phone: application.phoneNumber,
        isActive: true,
      });
    }

    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      student = await Student.create({
        userId: user._id,
        rollNumber: application.studentNumber,
        studentNumber: application.studentNumber,
        name: application.fullName,
        phone: application.phoneNumber,
        gender: application.gender,
        dateOfBirth: application.dateOfBirth,
        address: application.residentialAddress,
        city: application.city,
        state: application.guardianState || application.city,
        pincode: application.guardianPincode || '000000',
        departmentId: application.departmentId,
        courseId: application.courseId,
        year: application.yearOfStudy,
        semester: application.semester,
        admissionYear: application.admissionYear,
        admissionNumber: application.admissionNumber,
        academicSession: application.academicSession,
        bloodGroup: application.bloodGroup,
        fatherName: application.fatherName,
        fatherEmail: application.fatherEmail,
        fatherPhone: application.fatherPhone,
        motherName: application.motherName,
        motherEmail: application.motherEmail,
        motherPhone: application.motherPhone,
        guardianAddressLine1: application.guardianAddressLine1,
        guardianAddressLine2: application.guardianAddressLine2,
        guardianCity: application.guardianCity,
        guardianState: application.guardianState,
        guardianPincode: application.guardianPincode,
        guardianCountry: application.guardianCountry,
        applicationStatus: 'approved',
        allocationStatus: 'none',
        isActive: true,
      });
    } else if (!student.roomId) {
      student.applicationStatus = 'approved';
      student.allocationStatus = 'none';
      await student.save();
    }
    application.userId = user._id;
    application.studentId = student._id;
    return student;
  }

  private async reconcileOccupancy(roomId?: mongoose.Types.ObjectId, hostelId?: mongoose.Types.ObjectId) {
    if (roomId) {
      const occupied = await Student.countDocuments({ isActive: true, roomId });
      await Room.updateOne({ _id: roomId }, { $set: { occupied } });
    }
    if (hostelId) {
      const occupancy = await Student.countDocuments({ isActive: true, hostelId, roomId: { $exists: true, $ne: null } });
      await Hostel.updateOne({ _id: hostelId }, { $set: { occupancy } });
    }
  }

  private async assertAllocationTarget(
    data: { hostelId: string; roomId: string },
    actorId: string,
    actorRole: UserRole,
    gender: string,
  ) {
    if (!mongoose.isValidObjectId(data.hostelId) || !mongoose.isValidObjectId(data.roomId)) {
      throw AppError.badRequest('Invalid hostel or room');
    }
    const hostel = await Hostel.findById(data.hostelId);
    if (!hostel) throw AppError.notFound('Hostel not found');
    if (!hostel.isActive) throw AppError.badRequest('Hostel is not active');
    await this.assertHostelScope(hostel, actorId, actorRole);
    const room = await Room.findOne({ _id: data.roomId, hostelId: hostel._id, isActive: true });
    if (!room) throw AppError.badRequest('Room is not active or does not belong to this hostel');
    if (hostel.type === 'boys' && gender !== 'male') throw AppError.badRequest(`${hostel.name} is a boys' hostel`);
    if (hostel.type === 'girls' && gender !== 'female') throw AppError.badRequest(`${hostel.name} is a girls' hostel`);
    return { hostel, room };
  }

  private async allocateWithoutTransaction(
    student: IStudentDocument,
    application: IStudentApplicationDocument | null,
    data: { hostelId: string; roomId: string; reason: string },
    actorId: string,
  ) {
    const previousHostelId = student.hostelId;
    const previousRoomId = student.roomId;
    const now = new Date();
    const reserved = await Room.findOneAndUpdate(
      { _id: data.roomId, isActive: true, $expr: { $lt: ['$occupied', '$capacity'] } },
      { $inc: { occupied: 1 } },
      { new: true },
    );
    if (!reserved) throw AppError.badRequest('The selected room has no seats remaining');

    let studentUpdated = false;
    let previousRoomReleased = false;
    let previousHostelReleased = false;
    let newHostelIncremented = false;
    const previousApplication = application ? {
      status: application.status,
      hostelId: application.hostelId,
      roomId: application.roomId,
      allocatedAt: application.allocatedAt,
      allocatedBy: application.allocatedBy,
    } : null;
    try {
      const currentStudentFilter: Record<string, unknown> = { _id: student._id, applicationStatus: { $in: ['approved', 'allocated'] } };
      currentStudentFilter.roomId = previousRoomId || { $exists: false };
      const updatedStudent = await Student.findOneAndUpdate(currentStudentFilter, {
        $set: { hostelId: data.hostelId, roomId: data.roomId, applicationStatus: 'allocated', allocationStatus: 'active', allocatedAt: now, allocatedBy: actorId },
      }, { new: true, runValidators: true });
      if (!updatedStudent) throw AppError.conflict('The student allocation changed. Refresh and try again');
      studentUpdated = true;
      if (previousRoomId) {
        await Room.updateOne({ _id: previousRoomId, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } });
        previousRoomReleased = true;
      }
      if (previousHostelId) {
        await Hostel.updateOne({ _id: previousHostelId, occupancy: { $gt: 0 } }, { $inc: { occupancy: -1 } });
        previousHostelReleased = true;
      }
      await Hostel.updateOne({ _id: data.hostelId }, { $inc: { occupancy: 1 } });
      newHostelIncremented = true;
      if (application) {
        const applicationResult = await StudentApplication.updateOne({ _id: application._id, status: { $in: ['approved', 'allocated'] } }, { $set: { hostelId: data.hostelId, roomId: data.roomId, status: 'allocated', allocatedAt: now, allocatedBy: actorId } });
        if (application.status === 'approved' && applicationResult.matchedCount === 0) throw AppError.conflict('The application allocation changed. Refresh and try again');
      }
      await AllocationHistory.updateMany({ studentId: student._id, status: 'active' }, { $set: { status: 'transferred' } });
      await AllocationHistory.create({ studentId: student._id, studentNumber: student.rollNumber, studentName: student.name, action: previousRoomId ? 'transfer' : 'allocate', previousHostelId, previousRoomId, hostelId: data.hostelId, roomId: data.roomId, reason: data.reason, allocatedBy: actorId, allocatedAt: now, status: 'active' });
    } catch (error) {
      await Room.updateOne({ _id: data.roomId, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } });
      if (previousRoomReleased && previousRoomId) await Room.updateOne({ _id: previousRoomId }, { $inc: { occupied: 1 } });
      if (previousHostelReleased && previousHostelId) await Hostel.updateOne({ _id: previousHostelId }, { $inc: { occupancy: 1 } });
      if (newHostelIncremented) await Hostel.updateOne({ _id: data.hostelId, occupancy: { $gt: 0 } }, { $inc: { occupancy: -1 } });
      if (studentUpdated) {
        const rollback: Record<string, Record<string, unknown>> = {
          $set: { applicationStatus: previousRoomId ? 'allocated' : 'approved', allocationStatus: previousRoomId ? 'active' : 'none' },
        };
        if (previousRoomId) {
          rollback.$set.hostelId = previousHostelId;
          rollback.$set.roomId = previousRoomId;
        } else {
          rollback.$unset = { roomId: 1, hostelId: 1 };
        }
        await Student.updateOne({ _id: student._id, roomId: data.roomId }, rollback);
      }
      if (application && previousApplication) {
        const applicationRollback: Record<string, Record<string, unknown>> = { $set: { status: previousApplication.status } };
        const unset: Record<string, number> = {};
        if (previousApplication.hostelId) applicationRollback.$set.hostelId = previousApplication.hostelId;
        else unset.hostelId = 1;
        if (previousApplication.roomId) applicationRollback.$set.roomId = previousApplication.roomId;
        else unset.roomId = 1;
        if (previousApplication.allocatedAt) applicationRollback.$set.allocatedAt = previousApplication.allocatedAt;
        else unset.allocatedAt = 1;
        if (previousApplication.allocatedBy) applicationRollback.$set.allocatedBy = previousApplication.allocatedBy;
        else unset.allocatedBy = 1;
        if (Object.keys(unset).length) applicationRollback.$unset = unset;
        await StudentApplication.updateOne({ _id: application._id, roomId: data.roomId }, applicationRollback);
      }
      throw error;
    }
    return Student.findById(student._id).populate('hostelId', 'name type').populate('roomId', 'roomNumber floor type capacity').lean();
  }

  private async allocateWithTransaction(
    student: IStudentDocument,
    application: IStudentApplicationDocument | null,
    data: { hostelId: string; roomId: string; reason: string },
    actorId: string,
  ) {
    const previousHostelId = student.hostelId;
    const previousRoomId = student.roomId;
    const now = new Date();
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const reserved = await Room.findOneAndUpdate(
        { _id: data.roomId, isActive: true, $expr: { $lt: ['$occupied', '$capacity'] } },
        { $inc: { occupied: 1 } },
        { new: true, session },
      );
      if (!reserved) throw AppError.badRequest('The selected room has no seats remaining');
      if (previousRoomId) await Room.updateOne({ _id: previousRoomId, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } }, { session });
      if (previousHostelId) await Hostel.updateOne({ _id: previousHostelId, occupancy: { $gt: 0 } }, { $inc: { occupancy: -1 } }, { session });
      await Hostel.updateOne({ _id: data.hostelId }, { $inc: { occupancy: 1 } }, { session });

      const currentStudentFilter: Record<string, unknown> = { _id: student._id, applicationStatus: { $in: ['approved', 'allocated'] } };
      currentStudentFilter.roomId = previousRoomId || { $exists: false };
      const updatedStudent = await Student.findOneAndUpdate(currentStudentFilter, {
        $set: { hostelId: data.hostelId, roomId: data.roomId, applicationStatus: 'allocated', allocationStatus: 'active', allocatedAt: now, allocatedBy: actorId },
      }, { new: true, runValidators: true, session });
      if (!updatedStudent) throw AppError.conflict('The student allocation changed. Refresh and try again');

      if (application) {
        const applicationResult = await StudentApplication.updateOne(
          { _id: application._id, status: { $in: ['approved', 'allocated'] } },
          { $set: { hostelId: data.hostelId, roomId: data.roomId, status: 'allocated', allocatedAt: now, allocatedBy: actorId } },
          { session },
        );
        if (application.status === 'approved' && applicationResult.matchedCount === 0) throw AppError.conflict('The application allocation changed. Refresh and try again');
      }
      await AllocationHistory.updateMany({ studentId: student._id, status: 'active' }, { $set: { status: 'transferred' } }, { session });
      await AllocationHistory.create([{ studentId: student._id, studentNumber: student.rollNumber, studentName: student.name, action: previousRoomId ? 'transfer' : 'allocate', previousHostelId, previousRoomId, hostelId: data.hostelId, roomId: data.roomId, reason: data.reason, allocatedBy: actorId, allocatedAt: now, status: 'active' }], { session });
      await session.commitTransaction();
    } catch (error) {
      try { await session.abortTransaction(); } catch { /* standalone MongoDB deployments may not support transactions */ }
      if (isTransactionUnsupported(error)) return this.allocateWithoutTransaction(student, application, data, actorId);
      throw error;
    } finally {
      await session.endSession();
    }
    return Student.findById(student._id).populate('hostelId', 'name type').populate('roomId', 'roomNumber floor type capacity').lean();
  }

  private async allocateStudent(
    student: IStudentDocument,
    application: IStudentApplicationDocument | null,
    data: { hostelId: string; roomId: string; reason: string },
    actorId: string,
    actorRole: UserRole,
  ) {
    if (!['approved', 'allocated'].includes(student.applicationStatus) && !student.roomId) throw AppError.badRequest('Only approved students can be allocated');
    await this.assertAllocationTarget(data, actorId, actorRole, student.gender);
    if (student.roomId && String(student.roomId) === data.roomId) throw AppError.badRequest('Student is already allocated to this room');
    await this.reconcileOccupancy(student.roomId, student.hostelId);
    await this.reconcileOccupancy(new mongoose.Types.ObjectId(data.roomId), new mongoose.Types.ObjectId(data.hostelId));
    return this.allocateWithTransaction(student, application, data, actorId);
  }

  async allocateRoom(studentId: string, data: { hostelId: string; roomId: string; reason: string }, actorId: string, actorRole: UserRole) {
    const student = await Student.findById(studentId);
    if (!student) throw AppError.notFound('Student not found');
    const application = await StudentApplication.findOne({ studentId: student._id, status: { $in: ['approved', 'allocated'] } });
    return this.allocateStudent(student, application, data, actorId, actorRole);
  }

  async allocateApplication(applicationId: string, data: { hostelId: string; roomId: string; reason: string }, actorId: string, actorRole: UserRole) {
    const application = await StudentApplication.findById(applicationId);
    if (!application) throw AppError.notFound('Application not found');
    if (application.status !== 'approved') throw AppError.badRequest('Only approved applications can be allocated');
    const student = await this.ensureStudentProfile(application);
    if (!student) throw AppError.badRequest('Student profile could not be created');
    return this.allocateStudent(student, application, data, actorId, actorRole);
  }

  async getStudentAllocation(studentId: string) {
    const student = await Student.findById(studentId)
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floor type capacity')
      .populate('allocatedBy', 'name email role')
      .lean();
    if (!student) throw AppError.notFound('Student not found');
    const history = await AllocationHistory.find({ studentId }).sort({ allocatedAt: -1 }).populate('allocatedBy', 'name email role').lean();
    return { student, history };
  }

  async removeStudentFromRoom(studentId: string, actorId: string) {
    const student = await Student.findById(studentId);
    if (!student) throw AppError.notFound('Student not found');
    if (!student.roomId) throw AppError.badRequest('Student is not assigned to a room');

    const roomId = student.roomId;
    const hostelId = student.hostelId;
    const application = await StudentApplication.findOne({ studentId: student._id, status: 'allocated' });
    const previousRoomId = roomId;
    const previousHostelId = hostelId;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const currentStudent = await Student.findOneAndUpdate(
        { _id: student._id, roomId },
        { $unset: { hostelId: 1, roomId: 1, allocatedAt: 1, allocatedBy: 1 }, $set: { applicationStatus: 'approved', allocationStatus: 'none' } },
        { new: true, session },
      );
      if (!currentStudent) throw AppError.conflict('Student allocation changed. Refresh and try again');
      await Room.updateOne({ _id: roomId, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } }, { session });
      if (hostelId) await Hostel.updateOne({ _id: hostelId, occupancy: { $gt: 0 } }, { $inc: { occupancy: -1 } }, { session });
      if (application) {
        await StudentApplication.updateOne(
          { _id: application._id, status: 'allocated' },
          { $unset: { hostelId: 1, roomId: 1, allocatedAt: 1, allocatedBy: 1 }, $set: { status: 'approved' } },
          { session },
        );
      }
      await AllocationHistory.updateMany({ studentId: student._id, status: 'active' }, { $set: { status: 'ended' } }, { session });
      await AllocationHistory.create([{
        studentId: student._id,
        studentNumber: student.rollNumber,
        studentName: student.name,
        action: 'deallocate',
        previousHostelId,
        previousRoomId,
        hostelId: previousHostelId || new mongoose.Types.ObjectId(),
        roomId: previousRoomId,
        reason: 'Student removed from room',
        allocatedBy: actorId,
        allocatedAt: new Date(),
        status: 'ended',
      }], { session });
      await session.commitTransaction();
    } catch (error) {
      try { await session.abortTransaction(); } catch { /* standalone MongoDB deployments may not support transactions */ }
      if (!isTransactionUnsupported(error)) throw error;

      const cleared = await Student.findOneAndUpdate(
        { _id: student._id, roomId },
        { $unset: { hostelId: 1, roomId: 1, allocatedAt: 1, allocatedBy: 1 }, $set: { applicationStatus: 'approved', allocationStatus: 'none' } },
        { new: true },
      );
      if (!cleared) throw AppError.conflict('Student allocation changed. Refresh and try again');
      try {
        await Room.updateOne({ _id: roomId, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } });
        if (hostelId) await Hostel.updateOne({ _id: hostelId, occupancy: { $gt: 0 } }, { $inc: { occupancy: -1 } });
        if (application) await StudentApplication.updateOne({ _id: application._id, status: 'allocated' }, { $unset: { hostelId: 1, roomId: 1, allocatedAt: 1, allocatedBy: 1 }, $set: { status: 'approved' } });
        await AllocationHistory.updateMany({ studentId: student._id, status: 'active' }, { $set: { status: 'ended' } });
        await AllocationHistory.create({ studentId: student._id, studentNumber: student.rollNumber, studentName: student.name, action: 'deallocate', previousHostelId, previousRoomId, hostelId: previousHostelId || new mongoose.Types.ObjectId(), roomId: previousRoomId, reason: 'Student removed from room', allocatedBy: actorId, allocatedAt: new Date(), status: 'ended' });
      } catch (fallbackError) {
        await Student.updateOne({ _id: student._id }, { $set: { hostelId: previousHostelId, roomId: previousRoomId, allocationStatus: 'active', applicationStatus: 'allocated' } });
        throw fallbackError;
      }
    } finally {
      await session.endSession();
    }
    await createAuditLog({ userId: actorId, action: 'update', entity: 'Student', entityId: studentId, description: `Student ${student.name} removed from room` });
    return Student.findById(studentId).populate('hostelId', 'name type').populate('roomId', 'roomNumber floor type capacity').lean();
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
