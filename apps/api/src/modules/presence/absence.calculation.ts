/**
 * Absence Calculation Service
 *
 * Core logic for computing physical absence from gate movement records.
 * Uses actual gate movement timestamps to determine absence periods.
 *
 * Key Principle:
 * A student is considered physically absent at some point during a selected date when
 * their verified movement interval overlaps the selected date boundaries.
 *
 * For a selected date in the institution's timezone:
 *   dayStart = selected date at 00:00:00
 *   dayEnd = the following date at 00:00:00
 *
 * Absence criteria using GateMovement records:
 *   actualExitAt < dayEnd AND (actualReturnAt IS NULL OR actualReturnAt > dayStart)
 */

import { GatePass } from '../../models/gatePass.model';
import { GateMovement } from '../../models/gateMovement.model';
import { Student } from '../../models/student.model';
import { LeaveRequest } from '../../models/leaveRequest.model';
import { Hostel } from '../../models/hostel.model';
import { config } from '../../config';
import mongoose from 'mongoose';

export interface StudentAbsenceData {
  studentId: mongoose.Types.ObjectId;
  name: string;
  rollNumber: string;
  hostelId?: mongoose.Types.ObjectId;
  hostelName?: string;
  roomId?: mongoose.Types.ObjectId;
  roomNumber?: string;
  departmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  phone?: string;
  currentPresenceStatus: string;
  actualExitTime?: Date;
  actualReturnTime?: Date;
  expectedReturnTime?: Date;
  gatePassNumber?: string;
  leaveRequestStatus?: string;
}

export interface AbsenceMetrics {
  totalRegisteredStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  absentAtAnyPoint: number;
  approvedButNotExited: number;
}

export interface HostelStatistics {
  hostelId: mongoose.Types.ObjectId;
  hostelName: string;
  totalAssignedStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  absentAtAnyPoint: number;
  absencePercentage: number;
}

/**
 * Converts a date string (YYYY-MM-DD) to day boundaries in the institution's timezone.
 * Returns both Date and Unix timestamp for database queries.
 * 
 * Note: This is a simplified implementation that assumes the server and database
 * use the same timezone. For multi-timezone support, use a library like luxon or date-fns.
 */
export function getDateBoundaries(dateString: string, timezone: string = config.institution.timezone) {
  // Parse the date string (expected format: YYYY-MM-DD)
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date string format. Expected YYYY-MM-DD, got: ${dateString}`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  // Create dates at UTC 00:00:00 to represent the day boundaries
  // In a real production system with timezone awareness, you would use luxon/date-fns
  const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));

  return { dayStart, dayEnd, dateISO: dateString };
}

/**
 * Check if a student has any gate movements that indicate they were outside during the selected date.
 *
 * A student is considered absent at some point during a date when:
 *   - They have an EXIT movement before dayEnd AND
 *   - Either they have no ENTRY movement yet OR their ENTRY movement is after dayStart
 *
 * This captures:
 *   1. Students who exited before the date and haven't returned (across date boundary)
 *   2. Students who exited and returned within the date
 *   3. Students who exited before the date and returned after the date
 */
export async function isStudentAbsentOnDate(
  studentId: mongoose.Types.ObjectId,
  dayStart: Date,
  dayEnd: Date,
): Promise<boolean> {
  const exitMovement = await GateMovement.findOne({
    studentId,
    movementType: 'exit',
    actualTimestamp: { $lt: dayEnd },
  }).sort({ actualTimestamp: -1 });

  if (!exitMovement) {
    return false; // No exit recorded, not absent
  }

  // Check if there's a return movement after dayStart (meaning they returned during/after this date)
  const returnMovement = await GateMovement.findOne({
    studentId,
    movementType: 'entry',
    actualTimestamp: { $gt: dayStart },
  }).sort({ actualTimestamp: 1 });

  // Student is absent if:
  // - Exit occurred before dayEnd AND
  // - (No return yet OR return was after dayStart)
  return exitMovement.actualTimestamp < dayEnd && (!returnMovement || returnMovement.actualTimestamp > dayStart);
}

/**
 * Get detailed absence data for a student on a specific date.
 */
export async function getStudentAbsenceOnDate(
  studentId: mongoose.Types.ObjectId,
  dayStart: Date,
  dayEnd: Date,
): Promise<StudentAbsenceData | null> {
  const student = await Student.findById(studentId)
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .lean();

  if (!student) {
    return null;
  }

  // Get the most recent exit before dayEnd
  const exitMovement = await GateMovement.findOne({
    studentId,
    movementType: 'exit',
    actualTimestamp: { $lt: dayEnd },
  }).sort({ actualTimestamp: -1 });

  // Get the most recent return after dayStart
  const returnMovement = await GateMovement.findOne({
    studentId,
    movementType: 'entry',
    actualTimestamp: { $gt: dayStart },
  }).sort({ actualTimestamp: 1 });

  // Get associated gate pass for more context
  let gatePass = null;
  let leaveRequestStatus = undefined;

  if (exitMovement?.gatePassId) {
    gatePass = await GatePass.findById(exitMovement.gatePassId).lean();
  }

  if (exitMovement?.leaveRequestId) {
    const leaveRequest = await LeaveRequest.findById(exitMovement.leaveRequestId).lean();
    leaveRequestStatus = leaveRequest?.status;
  }

  return {
    studentId,
    name: student.name,
    rollNumber: student.rollNumber,
    hostelId: student.hostelId,
    hostelName: (student.hostelId as any)?.name,
    roomId: student.roomId,
    roomNumber: (student.roomId as any)?.roomNumber,
    departmentId: student.departmentId,
    courseId: student.courseId,
    phone: student.phone,
    currentPresenceStatus: student.presenceStatus,
    actualExitTime: exitMovement?.actualTimestamp,
    actualReturnTime: returnMovement?.actualTimestamp,
    expectedReturnTime: gatePass?.expectedReturn,
    gatePassNumber: gatePass?.gatePassNumber,
    leaveRequestStatus,
  };
}

/**
 * Get all students who were absent on a selected date.
 * Returns paginated results with optional filtering by hostel.
 */
export async function getAbsentStudentsOnDate(
  dayStart: Date,
  dayEnd: Date,
  hostelIds?: mongoose.Types.ObjectId[],
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<{ data: StudentAbsenceData[]; total: number; page: number; limit: number }> {
  // Find all exit movements before dayEnd
  const exitMovements = await GateMovement.find({
    movementType: 'exit',
    actualTimestamp: { $lt: dayEnd },
  })
    .sort({ actualTimestamp: -1 })
    .lean();

  // Get unique student IDs from exits
  const studentIds = [...new Set(exitMovements.map((m) => m.studentId.toString()))].map(
    (id) => id,
  );

  // Filter movements to only those absent on this date
  const absentStudentIds: string[] = [];

  for (const exit of exitMovements) {
    // Check if there's a return movement after dayStart
    const returnMovement = await GateMovement.findOne({
      studentId: exit.studentId,
      movementType: 'entry',
      actualTimestamp: { $gt: dayStart },
    }).lean();

    // Student is absent if no return or return is after this date
    if (!returnMovement || returnMovement.actualTimestamp > dayStart) {
      absentStudentIds.push(exit.studentId.toString());
    }
  }

  // Build query for students
  const query: any = {
    _id: { $in: absentStudentIds },
    isActive: true,
  };

  if (hostelIds && hostelIds.length > 0) {
    query.hostelId = { $in: hostelIds };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { studentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Enrich each student with absence details
  const data: StudentAbsenceData[] = [];
  for (const student of students) {
    const absenceData = await getStudentAbsenceOnDate(student._id, dayStart, dayEnd);
    if (absenceData) {
      data.push(absenceData);
    }
  }

  return { data, total, page, limit };
}

/**
 * Get students currently outside (no return movement yet).
 */
export async function getCurrentlyOutsideStudents(
  hostelIds?: mongoose.Types.ObjectId[],
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<{ data: StudentAbsenceData[]; total: number; page: number; limit: number }> {
  // Find students with an exit but no corresponding entry
  const exitMovements = await GateMovement.find({
    movementType: 'exit',
  })
    .sort({ actualTimestamp: -1 })
    .lean();

  const currentlyOutsideIds: string[] = [];

  for (const exit of exitMovements) {
    const returnMovement = await GateMovement.findOne({
      studentId: exit.studentId,
      movementType: 'entry',
      actualTimestamp: { $gt: exit.actualTimestamp },
    }).lean();

    if (!returnMovement) {
      currentlyOutsideIds.push(exit.studentId.toString());
    }
  }

  // Build query
  const query: any = {
    _id: { $in: currentlyOutsideIds },
    isActive: true,
  };

  if (hostelIds && hostelIds.length > 0) {
    query.hostelId = { $in: hostelIds };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { studentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data: StudentAbsenceData[] = [];
  for (const student of students) {
    const exit = exitMovements.find((m) => m.studentId.toString() === student._id.toString());
    if (exit) {
      const gatePass = await GatePass.findById(exit.gatePassId).lean();
      const leaveRequest = exit.leaveRequestId
        ? await LeaveRequest.findById(exit.leaveRequestId).lean()
        : null;

      data.push({
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        hostelId: student.hostelId,
        hostelName: (student.hostelId as any)?.name,
        roomId: student.roomId,
        roomNumber: (student.roomId as any)?.roomNumber,
        departmentId: student.departmentId,
        courseId: student.courseId,
        phone: student.phone,
        currentPresenceStatus: student.presenceStatus,
        actualExitTime: exit.actualTimestamp,
        expectedReturnTime: gatePass?.expectedReturn,
        gatePassNumber: gatePass?.gatePassNumber,
        leaveRequestStatus: leaveRequest?.status,
      });
    }
  }

  return { data, total, page, limit };
}

/**
 * Get students who are overdue (exit recorded, expected return passed, no return yet).
 */
export async function getOverdueStudents(
  hostelIds?: mongoose.Types.ObjectId[],
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<{ data: (StudentAbsenceData & { overdueBy: string })[]; total: number; page: number; limit: number }> {
  // Get currently outside students
  const { data: outsideStudents } = await getCurrentlyOutsideStudents(hostelIds, 1, 10000);

  const now = new Date();
  const overdueStudents = outsideStudents.filter((student) => {
    if (!student.expectedReturnTime) return false;
    return new Date(student.expectedReturnTime) < now;
  });

  // Apply search filter
  let filtered = overdueStudents;
  if (search) {
    filtered = overdueStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(search.toLowerCase()),
    );
  }

  const total = filtered.length;
  const paginatedData = filtered.slice((page - 1) * limit, page * limit);

  const data = paginatedData.map((student) => ({
    ...student,
    overdueBy: formatOverdueDuration(student.expectedReturnTime!),
  }));

  return { data, total, page, limit };
}

/**
 * Get students who exited and returned on the same date.
 */
export async function getReturnedTodayStudents(
  dayStart: Date,
  dayEnd: Date,
  hostelIds?: mongoose.Types.ObjectId[],
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<{ data: StudentAbsenceData[]; total: number; page: number; limit: number }> {
  // Find exits within the date
  const exitMovements = await GateMovement.find({
    movementType: 'exit',
    actualTimestamp: { $gte: dayStart, $lt: dayEnd },
  })
    .sort({ actualTimestamp: -1 })
    .lean();

  const returnedStudentIds: string[] = [];

  // Check which of these exits have a return movement on the same day
  for (const exit of exitMovements) {
    const returnMovement = await GateMovement.findOne({
      studentId: exit.studentId,
      movementType: 'entry',
      actualTimestamp: { $gte: dayStart, $lt: dayEnd, $gt: exit.actualTimestamp },
    }).lean();

    if (returnMovement) {
      returnedStudentIds.push(exit.studentId.toString());
    }
  }

  // Build query
  const query: any = {
    _id: { $in: returnedStudentIds },
    isActive: true,
  };

  if (hostelIds && hostelIds.length > 0) {
    query.hostelId = { $in: hostelIds };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { studentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data: StudentAbsenceData[] = [];
  for (const student of students) {
    const absenceData = await getStudentAbsenceOnDate(student._id, dayStart, dayEnd);
    if (absenceData) {
      data.push(absenceData);
    }
  }

  return { data, total, page, limit };
}

/**
 * Get students with approved leave but no recorded exit.
 */
export async function getApprovedNotExitedStudents(
  dayStart: Date,
  dayEnd: Date,
  hostelIds?: mongoose.Types.ObjectId[],
  page: number = 1,
  limit: number = 20,
  search?: string,
): Promise<{ data: StudentAbsenceData[]; total: number; page: number; limit: number }> {
  // Find gate passes that are APPROVED (no exit recorded yet) and within date range
  const approveds = await GatePass.find({
    status: 'APPROVED',
    approvedDeparture: { $gte: dayStart, $lt: dayEnd },
  })
    .populate('studentId')
    .lean();

  const studentIds = approveds.map((gp) => gp.studentId);

  const query: any = {
    _id: { $in: studentIds },
    isActive: true,
  };

  if (hostelIds && hostelIds.length > 0) {
    query.hostelId = { $in: hostelIds };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { studentNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate('hostelId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data: StudentAbsenceData[] = [];
  for (const student of students) {
    const gatePass = approveds.find((gp) => gp.studentId.toString() === student._id.toString());
    if (gatePass) {
      data.push({
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        hostelId: student.hostelId,
        hostelName: (student.hostelId as any)?.name,
        roomId: student.roomId,
        roomNumber: (student.roomId as any)?.roomNumber,
        departmentId: student.departmentId,
        courseId: student.courseId,
        phone: student.phone,
        currentPresenceStatus: student.presenceStatus,
        expectedReturnTime: gatePass.expectedReturn,
        gatePassNumber: gatePass.gatePassNumber,
        leaveRequestStatus: 'APPROVED',
      });
    }
  }

  return { data, total, page, limit };
}

/**
 * Calculate dashboard metrics for a selected date.
 */
export async function calculateAbsenceMetrics(
  dayStart: Date,
  dayEnd: Date,
  hostelIds?: mongoose.Types.ObjectId[],
): Promise<AbsenceMetrics> {
  // Count total registered students
  const totalQuery: any = { isActive: true, applicationStatus: 'allocated' };
  if (hostelIds && hostelIds.length > 0) {
    totalQuery.hostelId = { $in: hostelIds };
  }
  const totalRegisteredStudents = await Student.countDocuments(totalQuery);

  // Count currently outside
  const { total: currentlyOutside } = await getCurrentlyOutsideStudents(hostelIds, 1, 1);

  // Count returned today
  const { total: returnedToday } = await getReturnedTodayStudents(dayStart, dayEnd, hostelIds, 1, 1);

  // Count overdue
  const { total: overdueStudents } = await getOverdueStudents(hostelIds, 1, 1);

  // Count absent at any point during the date
  const { total: absentAtAnyPoint } = await getAbsentStudentsOnDate(dayStart, dayEnd, hostelIds, 1, 1);

  // Count approved but not exited
  const { total: approvedButNotExited } = await getApprovedNotExitedStudents(dayStart, dayEnd, hostelIds, 1, 1);

  return {
    totalRegisteredStudents,
    currentlyOutside,
    returnedToday,
    overdueStudents,
    absentAtAnyPoint,
    approvedButNotExited,
  };
}

/**
 * Get hostel-wise statistics for a selected date.
 */
export async function getHostelStatistics(
  dayStart: Date,
  dayEnd: Date,
  hostelIds?: mongoose.Types.ObjectId[],
): Promise<HostelStatistics[]> {
  // Get all hostels to query
  const hostelQuery: any = { isActive: true };
  if (hostelIds && hostelIds.length > 0) {
    hostelQuery._id = { $in: hostelIds };
  }

  const hostels = await Hostel.find(hostelQuery).lean();

  const stats: HostelStatistics[] = [];

  for (const hostel of hostels) {
    const metrics = await calculateAbsenceMetrics(dayStart, dayEnd, [hostel._id]);

    const absencePercentage =
      metrics.totalRegisteredStudents > 0
        ? (metrics.absentAtAnyPoint / metrics.totalRegisteredStudents) * 100
        : 0;

    stats.push({
      hostelId: hostel._id,
      hostelName: hostel.name,
      totalAssignedStudents: metrics.totalRegisteredStudents,
      currentlyOutside: metrics.currentlyOutside,
      returnedToday: metrics.returnedToday,
      overdueStudents: metrics.overdueStudents,
      absentAtAnyPoint: metrics.absentAtAnyPoint,
      absencePercentage: Math.round(absencePercentage * 100) / 100,
    });
  }

  return stats;
}

/**
 * Format overdue duration in human-readable format.
 */
function formatOverdueDuration(expectedReturnTime: Date): string {
  const now = new Date();
  const diff = now.getTime() - expectedReturnTime.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export const absenceCalculationService = {
  getDateBoundaries,
  isStudentAbsentOnDate,
  getStudentAbsenceOnDate,
  getAbsentStudentsOnDate,
  getCurrentlyOutsideStudents,
  getOverdueStudents,
  getReturnedTodayStudents,
  getApprovedNotExitedStudents,
  calculateAbsenceMetrics,
  getHostelStatistics,
};
