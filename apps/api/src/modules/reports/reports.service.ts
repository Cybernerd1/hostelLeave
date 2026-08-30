/**
 * Reports Service
 *
 * Analytics and aggregation pipelines for reporting.
 */

import { LeaveRequest } from '../../models/leaveRequest.model';
import { GuardLog } from '../../models/guardLog.model';
import { Student } from '../../models/student.model';
import { LeaveStatus } from '@hostel/shared-types';
import { startOfDay, endOfDay } from '@hostel/shared-utils';

export class ReportsService {
  /**
   * Leave counts grouped by type.
   */
  async getLeavesByType(fromDate?: string, toDate?: string) {
    const match: Record<string, unknown> = {};
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) { (match.createdAt as Record<string, unknown>).$gte = new Date(fromDate); }
      if (toDate) { (match.createdAt as Record<string, unknown>).$lte = new Date(toDate); }
    }

    return LeaveRequest.aggregate([
      { $match: match },
      { $group: { _id: '$leaveType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);
  }

  /**
   * Leave counts grouped by month.
   */
  async getLeavesByMonth(year?: number) {
    const currentYear = year || new Date().getFullYear();

    return LeaveRequest.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);
  }

  /**
   * Leave counts grouped by department.
   */
  async getLeavesByDepartment() {
    const students = await Student.find().select('_id departmentId').populate('departmentId', 'name code').lean();
    const studentDeptMap = new Map<string, { deptName: string; deptCode: string }>();
    students.forEach((s) => {
      const dept = s.departmentId as unknown as { name: string; code: string };
      if (dept) {
        studentDeptMap.set(s._id.toString(), { deptName: dept.name, deptCode: dept.code });
      }
    });

    const leaves = await LeaveRequest.aggregate([
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
    ]);

    const deptCounts = new Map<string, { name: string; code: string; count: number }>();
    leaves.forEach((l) => {
      const dept = studentDeptMap.get(l._id.toString());
      if (dept) {
        const key = dept.deptName;
        const existing = deptCounts.get(key) || { name: dept.deptName, code: dept.deptCode, count: 0 };
        existing.count += l.count;
        deptCounts.set(key, existing);
      }
    });

    return Array.from(deptCounts.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Leave counts grouped by hostel.
   */
  async getLeavesByHostel() {
    const students = await Student.find().select('_id hostelId').populate('hostelId', 'name type').lean();
    const studentHostelMap = new Map<string, { hostelName: string }>();
    students.forEach((s) => {
      const hostel = s.hostelId as unknown as { name: string };
      if (hostel) {
        studentHostelMap.set(s._id.toString(), { hostelName: hostel.name });
      }
    });

    const leaves = await LeaveRequest.aggregate([
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
    ]);

    const hostelCounts = new Map<string, { name: string; count: number }>();
    leaves.forEach((l) => {
      const hostel = studentHostelMap.get(l._id.toString());
      if (hostel) {
        const existing = hostelCounts.get(hostel.hostelName) || { name: hostel.hostelName, count: 0 };
        existing.count += l.count;
        hostelCounts.set(hostel.hostelName, existing);
      }
    });

    return Array.from(hostelCounts.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * Today's gate activity.
   */
  async getTodayGateActivity() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [exits, entries] = await Promise.all([
      GuardLog.countDocuments({
        action: 'exit',
        timestamp: { $gte: todayStart, $lte: todayEnd },
      }),
      GuardLog.countDocuments({
        action: 'entry',
        timestamp: { $gte: todayStart, $lte: todayEnd },
      }),
    ]);

    return { exits, entries, currentlyOut: exits - entries };
  }

  /**
   * Leave status breakdown.
   */
  async getLeaveStatusBreakdown() {
    return LeaveRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }

  /**
   * Average approval time (from application to final approval).
   */
  async getAverageApprovalTime() {
    const result = await LeaveRequest.aggregate([
      {
        $match: {
          status: { $in: [LeaveStatus.APPROVED, LeaveStatus.COMPLETED] },
        },
      },
      {
        $project: {
          approvalTime: {
            $subtract: ['$updatedAt', '$createdAt'],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$approvalTime' },
          minTime: { $min: '$approvalTime' },
          maxTime: { $max: '$approvalTime' },
        },
      },
    ]);

    if (result.length === 0) {
      return { avgHours: 0, minHours: 0, maxHours: 0 };
    }

    return {
      avgHours: Math.round(result[0].avgTime / (1000 * 60 * 60) * 10) / 10,
      minHours: Math.round(result[0].minTime / (1000 * 60 * 60) * 10) / 10,
      maxHours: Math.round(result[0].maxTime / (1000 * 60 * 60) * 10) / 10,
    };
  }
}

export const reportsService = new ReportsService();
