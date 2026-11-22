/**
 * Absence Monitoring Service
 *
 * Computes student hostel presence and absence metrics for a selected date.
 * Uses gate movement data (exit/entry timestamps) to determine which students
 * were physically absent at any point during the selected date.
 *
 * Key Concepts:
 *   - dayStart = selected date at 00:00:00 UTC
 *   - dayEnd = following date at 00:00:00 UTC
 *   - A student is "physically absent" if their movement interval overlaps the selected date:
 *     actualExitTime < dayEnd AND (actualReturnTime IS NULL OR actualReturnTime > dayStart)
 *
 * Distinctions:
 *   - Currently Outside: Not returned as of now
 *   - Overdue: Expected return passed, still not returned
 *   - Returned Today: Both exit and return during selected date
 *   - Daily Absent: Physically outside at any point during selected date (whether returned or not)
 *   - Approved Leave, Not Exited: Has approved leave but no exit record
 */

import { GatePassStatus, LeaveStatus, UserRole, type UserRole as UserRoleType } from '@hostel/shared-types';
import { GatePass } from '../../models/gatePass.model';
import { GateMovement } from '../../models/gateMovement.model';
import { LeaveRequest } from '../../models/leaveRequest.model';
import { Student } from '../../models/student.model';
import { Hostel } from '../../models/hostel.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export interface AbsenceMetrics {
  totalRegisteredStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueReturns: number;
  dailyAbsentAtAnyPoint: number;
  approvedLeaveNotExited: number;
}

export interface StudentAbsenceRecord {
  _id: string;
  studentId: string;
  name: string;
  rollNumber: string;
  enrollmentNumber?: string;
  hostelName?: string;
  roomNumber?: string;
  phone?: string;
  exitTime?: Date;
  exitTimestamp?: string;
  expectedReturnTime?: Date;
  expectedReturnTimestamp?: string;
  returnTime?: Date;
  returnTimestamp?: string;
  gatePassNumber?: string;
  leaveStatus?: string;
  presenceStatus: 'in_hostel' | 'out_of_hostel' | 'overdue' | 'approved_not_exited';
  overdueDuration?: string;
  departmentId?: string;
  courseId?: string;
}

export interface HostelAbsenceStatistics {
  hostelId: string;
  hostelName: string;
  totalAssignedStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  dailyAbsentAtAnyPoint: number;
  absencePercentage: number;
}

export interface AbsenceDashboardData {
  selectedDate: string;
  metrics: AbsenceMetrics;
  hostelStats: HostelAbsenceStatistics[];
  studentRecords: {
    currentlyOutside: StudentAbsenceRecord[];
    overdueStudents: StudentAbsenceRecord[];
    returnedToday: StudentAbsenceRecord[];
    dailyAbsentHistory: StudentAbsenceRecord[];
    approvedNotExited: StudentAbsenceRecord[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AbsenceService {
  /**
   * Get hostel IDs accessible by a user based on their role.
   * - Admin/Director/Chief Warden: all hostels
   * - Warden: only assigned hostels
   * - Others: throw unauthorized
   */
  private async getAccessibleHostels(userId: string, userRole: UserRoleType): Promise<string[]> {
    if (userRole === UserRole.ADMIN || userRole === UserRole.DIRECTOR || userRole === UserRole.CHIEF_WARDEN) {
      // Admin, Director, Chief Warden can access all hostels
      const hostels = await Hostel.find({ isActive: true }).select('_id').lean();
      return hostels.map(h => h._id.toString());
    }

    if (userRole === UserRole.WARDEN) {
      // Warden can access only their assigned hostels
      const user = await User.findById(userId).lean();
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      const hostels = await Hostel.find({ wardenId: userId, isActive: true }).select('_id').lean();
      if (hostels.length === 0) {
        throw AppError.forbidden('You are not assigned to any hostel');
      }
      return hostels.map(h => h._id.toString());
    }

    throw AppError.forbidden('Only Admin, Director, Chief Warden, and Warden can access absence monitoring');
  }

  /**
   * Parse date string (YYYY-MM-DD) to UTC boundaries.
   * Returns { dayStart, dayEnd } where dayEnd = next day at 00:00:00 UTC
   */
  private parseDateBoundaries(dateStr: string): { dayStart: Date; dayEnd: Date } {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    return { dayStart, dayEnd };
  }

  /**
   * Calculate effective presence status of a student for a given date.
   * Uses gate movement data to determine if student was physically absent.
   */
  private async getStudentPresenceStatus(
    studentId: string,
    dateStr: string,
    now: Date = new Date(),
  ): Promise<{ status: 'in_hostel' | 'out_of_hostel' | 'overdue' | 'approved_not_exited'; gatePass?: any; leave?: any }> {
    const { dayStart, dayEnd } = this.parseDateBoundaries(dateStr);

    // Check for gate pass with movements during the selected date
    const movements = await GateMovement.find({
      studentId,
      actualTimestamp: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ actualTimestamp: 1 })
      .lean();

    if (movements.length === 0) {
      // Check for approved leave without exit
      const approvedLeave = await LeaveRequest.findOne({
        studentId,
        status: LeaveStatus.APPROVED,
        fromDate: { $lte: dayEnd },
        toDate: { $gte: dayStart },
      })
        .select('_id')
        .lean();

      if (approvedLeave) {
        return { status: 'approved_not_exited', leave: approvedLeave };
      }

      return { status: 'in_hostel' };
    }

    // Check for corresponding gate pass
    const lastMovement = movements[movements.length - 1];
    const gatePass = await GatePass.findOne({
      studentId,
      gatePassId: lastMovement.gatePassId,
    }).lean();

    // Determine if student has returned
    const hasReturn = movements.some(m => m.movementType === 'entry' && m.actualTimestamp >= lastMovement.actualTimestamp);

    if (!hasReturn && gatePass) {
      // Check if overdue
      const expectedReturn = new Date(gatePass.expectedReturn);
      expectedReturn.setUTCHours(23, 59, 59, 999);

      if (now > expectedReturn) {
        return { status: 'overdue', gatePass };
      }

      return { status: 'out_of_hostel', gatePass };
    }

    return { status: 'in_hostel', gatePass };
  }

  /**
   * Compute absence metrics for a selected date and hostel(s).
   */
  async getAbsenceMetrics(
    dateStr: string,
    hostelIds: string[],
  ): Promise<AbsenceMetrics> {
    const { dayStart, dayEnd } = this.parseDateBoundaries(dateStr);
    const now = new Date();

    // Total registered students in accessible hostels
    const totalRegisteredStudents = await Student.countDocuments({
      hostelId: { $in: hostelIds },
      isActive: true,
    });

    // Students with movements during the selected date
    const movements = await GateMovement.find({
      hostelId: { $in: hostelIds },
      actualTimestamp: { $gte: dayStart, $lt: dayEnd },
    })
      .select('studentId movementType actualTimestamp')
      .lean();

    const studentMovementMap = new Map<string, any[]>();
    for (const mov of movements) {
      const studId = mov.studentId.toString();
      if (!studentMovementMap.has(studId)) {
        studentMovementMap.set(studId, []);
      }
      studentMovementMap.get(studId)!.push(mov);
    }

    let currentlyOutside = 0;
    let returnedToday = 0;
    let overdueReturns = 0;
    const dailyAbsentStudents = new Set<string>();
    let approvedLeaveNotExited = 0;

    for (const [studId, movs] of studentMovementMap.entries()) {
      dailyAbsentStudents.add(studId);

      // Check if student has returned
      const hasExit = movs.some(m => m.movementType === 'exit');
      const hasReturn = movs.some(m => m.movementType === 'entry' && m.actualTimestamp > movs.find(x => x.movementType === 'exit')?.actualTimestamp);

      if (hasReturn) {
        returnedToday += 1;
      } else if (hasExit) {
        // Student exited but hasn't returned yet during this date
        currentlyOutside += 1;

        // Check if overdue
        const gatePass = await GatePass.findOne({
          studentId: studId,
          leaveRequestId: { $exists: true },
        })
          .sort({ createdAt: -1 })
          .lean();

        if (gatePass) {
          const expectedReturn = new Date(gatePass.expectedReturn);
          expectedReturn.setUTCHours(23, 59, 59, 999);
          if (now > expectedReturn) {
            overdueReturns += 1;
          }
        }
      }
    }

    // Check for approved leaves without exits during this date
    const approvedLeavesNoExit = await LeaveRequest.find({
      status: LeaveStatus.APPROVED,
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart },
      studentId: { $nin: Array.from(dailyAbsentStudents) },
      _id: {
        $nin: await GatePass.find({
          actualExitTime: { $gte: dayStart, $lt: dayEnd },
        })
          .distinct('leaveRequestId'),
      },
    })
      .select('_id')
      .lean();

    approvedLeaveNotExited = approvedLeavesNoExit.length;

    return {
      totalRegisteredStudents,
      currentlyOutside,
      returnedToday,
      overdueReturns,
      dailyAbsentAtAnyPoint: dailyAbsentStudents.size,
      approvedLeaveNotExited,
    };
  }

  /**
   * Get hostel-wise absence statistics for a selected date.
   */
  async getHostelAbsenceStats(
    dateStr: string,
    hostelIds: string[],
  ): Promise<HostelAbsenceStatistics[]> {
    const { dayStart, dayEnd } = this.parseDateBoundaries(dateStr);
    const now = new Date();

    const hostels = await Hostel.find({
      _id: { $in: hostelIds },
      isActive: true,
    })
      .select('_id name')
      .lean();

    const stats: HostelAbsenceStatistics[] = [];

    for (const hostel of hostels) {
      const hostelId = hostel._id.toString();

      const totalAssignedStudents = await Student.countDocuments({
        hostelId: hostel._id,
        isActive: true,
      });

      const movements = await GateMovement.find({
        hostelId: hostel._id,
        actualTimestamp: { $gte: dayStart, $lt: dayEnd },
      })
        .select('studentId movementType actualTimestamp')
        .lean();

      const studentMovementMap = new Map<string, any[]>();
      for (const mov of movements) {
        const studId = mov.studentId.toString();
        if (!studentMovementMap.has(studId)) {
          studentMovementMap.set(studId, []);
        }
        studentMovementMap.get(studId)!.push(mov);
      }

      let currentlyOutside = 0;
      let returnedToday = 0;
      let overdueStudents = 0;
      const dailyAbsentSet = new Set<string>();

      for (const [studId, movs] of studentMovementMap.entries()) {
        dailyAbsentSet.add(studId);

        const hasExit = movs.some(m => m.movementType === 'exit');
        const hasReturn = movs.some(m => m.movementType === 'entry');

        if (hasReturn) {
          returnedToday += 1;
        } else if (hasExit) {
          currentlyOutside += 1;

          const gatePass = await GatePass.findOne({
            studentId: studId,
            hostelId: hostel._id,
          })
            .sort({ createdAt: -1 })
            .lean();

          if (gatePass) {
            const expectedReturn = new Date(gatePass.expectedReturn);
            expectedReturn.setUTCHours(23, 59, 59, 999);
            if (now > expectedReturn) {
              overdueStudents += 1;
            }
          }
        }
      }

      const absencePercentage = totalAssignedStudents > 0
        ? Math.round((dailyAbsentSet.size / totalAssignedStudents) * 100)
        : 0;

      stats.push({
        hostelId,
        hostelName: hostel.name,
        totalAssignedStudents,
        currentlyOutside,
        returnedToday,
        overdueStudents,
        dailyAbsentAtAnyPoint: dailyAbsentSet.size,
        absencePercentage,
      });
    }

    return stats;
  }

  /**
   * Get detailed student absence records for a selected date.
   */
  async getStudentAbsenceRecords(
    dateStr: string,
    hostelIds: string[],
    tab: 'currently_outside' | 'overdue' | 'returned_today' | 'daily_absent' | 'approved_not_exited',
    page: number = 1,
    limit: number = 20,
    filters?: {
      studentId?: string;
      departmentId?: string;
      courseId?: string;
      search?: string;
    },
  ): Promise<{ records: StudentAbsenceRecord[]; total: number }> {
    const { dayStart, dayEnd } = this.parseDateBoundaries(dateStr);
    const now = new Date();
    const skip = (page - 1) * limit;

    let studentIds: string[] = [];

    switch (tab) {
      case 'currently_outside': {
        // Students who exited but haven't returned yet
        const movements = await GateMovement.find({
          hostelId: { $in: hostelIds },
          movementType: 'exit',
          actualTimestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .select('studentId')
          .lean();

        const exitedStudents = new Set(movements.map(m => m.studentId.toString()));

        // Filter out those who returned
        const returnMovements = await GateMovement.find({
          hostelId: { $in: hostelIds },
          movementType: 'entry',
          actualTimestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .select('studentId')
          .lean();

        const returnedSet = new Set(returnMovements.map(m => m.studentId.toString()));

        for (const sid of exitedStudents) {
          if (!returnedSet.has(sid)) {
            studentIds.push(sid);
          }
        }
        break;
      }

      case 'overdue': {
        // Students currently outside and past expected return time
        const passes = await GatePass.find({
          hostelId: { $in: hostelIds },
          status: GatePassStatus.OUT_OF_HOSTEL,
          actualReturnTime: null,
          expectedReturn: { $lt: now },
        })
          .select('studentId')
          .lean();

        studentIds = passes.map(p => p.studentId.toString());
        break;
      }

      case 'returned_today': {
        // Students who exited and returned during the selected date
        const movements = await GateMovement.find({
          hostelId: { $in: hostelIds },
          actualTimestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .select('studentId movementType')
          .lean();

        const studentMovementMap = new Map<string, any[]>();
        for (const mov of movements) {
          const studId = mov.studentId.toString();
          if (!studentMovementMap.has(studId)) {
            studentMovementMap.set(studId, []);
          }
          studentMovementMap.get(studId)!.push(mov);
        }

        for (const [studId, movs] of studentMovementMap.entries()) {
          const hasExit = movs.some(m => m.movementType === 'exit');
          const hasReturn = movs.some(m => m.movementType === 'entry');
          if (hasExit && hasReturn) {
            studentIds.push(studId);
          }
        }
        break;
      }

      case 'daily_absent': {
        // All students who were physically absent at any point during the date
        const movements = await GateMovement.find({
          hostelId: { $in: hostelIds },
          actualTimestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .select('studentId')
          .lean();

        const uniqueStudents = new Set(movements.map(m => m.studentId.toString()));
        studentIds = Array.from(uniqueStudents);
        break;
      }

      case 'approved_not_exited': {
        // Students with approved leave but no exit record during the date
        const leavesApproved = await LeaveRequest.find({
          status: LeaveStatus.APPROVED,
          fromDate: { $lte: dayEnd },
          toDate: { $gte: dayStart },
        })
          .select('studentId')
          .lean();

        const approvedStudents = leavesApproved.map(l => l.studentId.toString());

        // Exclude those who exited
        const exitedMovements = await GateMovement.find({
          hostelId: { $in: hostelIds },
          movementType: 'exit',
          actualTimestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .select('studentId')
          .lean();

        const exitedSet = new Set(exitedMovements.map(m => m.studentId.toString()));

        studentIds = approvedStudents.filter(sid => !exitedSet.has(sid));
        break;
      }
    }

    // Apply additional filters
    const query: any = { _id: { $in: studentIds.map(id => new (require('mongoose')).Types.ObjectId(id)) } };
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { rollNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters?.departmentId) {
      query.departmentId = filters.departmentId;
    }
    if (filters?.courseId) {
      query.courseId = filters.courseId;
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .select('_id userId name rollNumber phone hostelId roomId departmentId courseId')
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber')
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch gate pass and movement data for each student
    const records: StudentAbsenceRecord[] = [];

    for (const student of students) {
      const movements = await GateMovement.find({
        studentId: student._id,
        actualTimestamp: { $gte: dayStart, $lt: dayEnd },
      })
        .sort({ actualTimestamp: 1 })
        .lean();

      const latestExit = movements.find(m => m.movementType === 'exit');
      const latestReturn = movements.find(m => m.movementType === 'entry');

      const gatePass = await GatePass.findOne({
        studentId: student._id,
        leaveRequestId: { $exists: true },
      })
        .sort({ createdAt: -1 })
        .lean();

      let presenceStatus: 'in_hostel' | 'out_of_hostel' | 'overdue' | 'approved_not_exited' = 'in_hostel';
      let overdueDuration: string | undefined;

      if (!latestExit) {
        // Check for approved leave
        const leave = await LeaveRequest.findOne({
          studentId: student._id,
          status: LeaveStatus.APPROVED,
        })
          .select('_id')
          .lean();

        presenceStatus = leave ? 'approved_not_exited' : 'in_hostel';
      } else if (latestReturn) {
        presenceStatus = 'in_hostel';
      } else {
        presenceStatus = 'out_of_hostel';
        if (gatePass) {
          const expectedReturn = new Date(gatePass.expectedReturn);
          expectedReturn.setUTCHours(23, 59, 59, 999);
          if (now > expectedReturn) {
            presenceStatus = 'overdue';
            const diffMs = now.getTime() - expectedReturn.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            overdueDuration = `${hours}h ${minutes}m overdue`;
          }
        }
      }

      records.push({
        _id: student._id.toString(),
        studentId: student._id.toString(),
        name: student.name,
        rollNumber: student.rollNumber,
        hostelName: (student.hostelId as any)?.name,
        roomNumber: (student.roomId as any)?.roomNumber,
        phone: student.phone,
        exitTime: latestExit?.actualTimestamp,
        exitTimestamp: latestExit?.actualTimestamp?.toISOString(),
        expectedReturnTime: gatePass?.expectedReturn,
        expectedReturnTimestamp: gatePass?.expectedReturn?.toISOString(),
        returnTime: latestReturn?.actualTimestamp,
        returnTimestamp: latestReturn?.actualTimestamp?.toISOString(),
        gatePassNumber: gatePass?.gatePassNumber,
        leaveStatus: gatePass?.status,
        presenceStatus,
        overdueDuration,
      });
    }

    return { records, total };
  }

  /**
   * Main dashboard endpoint: returns all metrics, hostel stats, and student records.
   */
  async getDashboard(
    userId: string,
    userRole: UserRoleType,
    dateStr: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      hostelId?: string;
      tab?: 'currently_outside' | 'overdue' | 'returned_today' | 'daily_absent' | 'approved_not_exited';
      search?: string;
      departmentId?: string;
      courseId?: string;
    },
  ): Promise<AbsenceDashboardData> {
    // Get accessible hostels
    const accessibleHostelIds = await this.getAccessibleHostels(userId, userRole);

    // Filter by specific hostel if requested
    let hostelIdsToUse = accessibleHostelIds;
    if (filters?.hostelId) {
      if (!accessibleHostelIds.includes(filters.hostelId)) {
        throw AppError.forbidden('You do not have access to this hostel');
      }
      hostelIdsToUse = [filters.hostelId];
    }

    // Get metrics
    const metrics = await this.getAbsenceMetrics(dateStr, hostelIdsToUse);

    // Get hostel-wise stats
    const hostelStats = await this.getHostelAbsenceStats(dateStr, hostelIdsToUse);

    // Get student records
    const tab = filters?.tab || 'currently_outside';
    const { records, total } = await this.getStudentAbsenceRecords(
      dateStr,
      hostelIdsToUse,
      tab,
      page,
      limit,
      filters,
    );

    return {
      selectedDate: dateStr,
      metrics,
      hostelStats,
      studentRecords: {
        currentlyOutside: tab === 'currently_outside' ? records : [],
        overdueStudents: tab === 'overdue' ? records : [],
        returnedToday: tab === 'returned_today' ? records : [],
        dailyAbsentHistory: tab === 'daily_absent' ? records : [],
        approvedNotExited: tab === 'approved_not_exited' ? records : [],
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const absenceService = new AbsenceService();
