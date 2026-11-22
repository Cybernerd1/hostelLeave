/**
 * Presence Service
 *
 * High-level business logic for student hostel presence monitoring.
 * Wraps the absence calculation service with role-based access control.
 */

import { UserRole } from '@hostel/shared-types';
import { Hostel } from '../../models/hostel.model';
import { Student } from '../../models/student.model';
import { absenceCalculationService, type AbsenceMetrics, type HostelStatistics } from './absence.calculation';
import { AppError } from '../../utils/AppError';
import type { ObjectId } from 'mongoose';

export class PresenceService {
  /**
   * Resolve hostel access scope based on user role and hostel filter.
   * - Admin/Chief Warden/Director: Can access all hostels
   * - Warden: Can only access their assigned hostel(s)
   * - Other roles: No access
   */
  async resolveHostelScope(userId?: string, userRole?: string, requestedHostelId?: string): Promise<ObjectId[] | null> {
    if (!userRole) {
      return [];
    }

    // Admin, Chief Warden, Director can access all hostels
    if ([UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR].includes(userRole as UserRole)) {
      return null; // null means all hostels
    }

    // Warden can access only their assigned hostels
    if (userRole === UserRole.WARDEN && userId) {
      const hostels = await Hostel.find({ wardenId: userId }).lean();
      const hostelIds = hostels.map((h) => h._id);

      // If a specific hostel is requested, verify warden has access
      if (requestedHostelId) {
        if (!hostelIds.some((id) => id.toString() === requestedHostelId)) {
          throw new AppError('Access denied: You do not have access to this hostel', 403);
        }
      }

      return hostelIds;
    }

    // Other roles have no access
    return [];
  }

  /**
   * Check if user has permission to view given hostel's data.
   */
  async canViewHostel(userId: string, userRole: string, hostelId: string): Promise<boolean> {
    try {
      await this.resolveHostelScope(userId, userRole, hostelId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get dashboard overview metrics for a selected date.
   */
  async getDashboardMetrics(
    selectedDate: string,
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
  ): Promise<AbsenceMetrics> {
    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    // If user has no access, return empty metrics
    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.calculateAbsenceMetrics(dayStart, dayEnd, hostelIds || undefined);
  }

  /**
   * Get hostel-wise statistics.
   */
  async getHostelStatistics(
    selectedDate: string,
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
  ): Promise<HostelStatistics[]> {
    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    // If user has no access, return empty list
    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getHostelStatistics(dayStart, dayEnd, hostelIds || undefined);
  }

  /**
   * Get students currently outside.
   */
  async getCurrentlyOutside(
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getCurrentlyOutsideStudents(hostelIds || undefined, page, limit, search);
  }

  /**
   * Get overdue students.
   */
  async getOverdueStudents(
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getOverdueStudents(hostelIds || undefined, page, limit, search);
  }

  /**
   * Get students who returned on a specific date.
   */
  async getReturnedToday(
    selectedDate: string,
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getReturnedTodayStudents(dayStart, dayEnd, hostelIds || undefined, page, limit, search);
  }

  /**
   * Get students absent at any point during a date.
   */
  async getDailyAbsenceHistory(
    selectedDate: string,
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getAbsentStudentsOnDate(dayStart, dayEnd, hostelIds || undefined, page, limit, search);
  }

  /**
   * Get students with approved leave but not exited.
   */
  async getApprovedNotExited(
    selectedDate: string,
    userRole: string,
    userId?: string,
    hostelIdFilter?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    const hostelIds = await this.resolveHostelScope(userId, userRole, hostelIdFilter);

    if (hostelIds !== null && hostelIds.length === 0) {
      throw new AppError('Access denied: No hostels available for this user', 403);
    }

    return absenceCalculationService.getApprovedNotExitedStudents(dayStart, dayEnd, hostelIds || undefined, page, limit, search);
  }

  /**
   * Get detailed student absence record on a specific date.
   */
  async getStudentAbsenceDetail(
    studentId: string,
    selectedDate: string,
    userRole: string,
    userId?: string,
  ) {
    // First get the student to check hostel access
    const student = await Student.findById(studentId).lean();
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Check hostel access
    if (student.hostelId) {
      await this.resolveHostelScope(userId, userRole, student.hostelId.toString());
    }

    const { dayStart, dayEnd } = absenceCalculationService.getDateBoundaries(selectedDate);

    return absenceCalculationService.getStudentAbsenceOnDate(student._id, dayStart, dayEnd);
  }
}

export const presenceService = new PresenceService();
