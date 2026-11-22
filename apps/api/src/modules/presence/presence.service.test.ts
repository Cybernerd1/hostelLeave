/**
 * Presence Service Tests
 *
 * Tests for role-based access control and hostel scope resolution.
 * Verifies that Wardens can only access their hostels, and Admins see all.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { UserRole } from '@hostel/shared-types';
import { presenceService } from './presence.service';
import { User } from '../../models/user.model';
import { Hostel } from '../../models/hostel.model';
import { Student } from '../../models/student.model';
import { Department } from '../../models/department.model';
import { Course } from '../../models/course.model';
import { GateMovement } from '../../models/gateMovement.model';
import { GatePass } from '../../models/gatePass.model';
import { AppError } from '../../utils/AppError';

describe('Presence Service - Permission Control', () => {
  let adminUserId: string;
  let wardenUserId: string;
  let otherWardenUserId: string;
  let chiefWardenUserId: string;
  let directorUserId: string;
  let hostel1Id: string;
  let hostel2Id: string;
  let studentId1: string;
  let departmentId: string;
  let courseId: string;

  beforeEach(async () => {
    // Create users
    const adminUser = await User.create({
      email: `admin-${Date.now()}@test.edu`,
      password: 'Admin@123456',
      role: UserRole.ADMIN,
      isActive: true,
    });
    adminUserId = adminUser._id.toString();

    const wardenUser = await User.create({
      email: `warden-${Date.now()}@test.edu`,
      password: 'Warden@123456',
      role: UserRole.WARDEN,
      isActive: true,
    });
    wardenUserId = wardenUser._id.toString();

    const otherWardenUser = await User.create({
      email: `warden2-${Date.now()}@test.edu`,
      password: 'Warden@123456',
      role: UserRole.WARDEN,
      isActive: true,
    });
    otherWardenUserId = otherWardenUser._id.toString();

    const chiefWardenUser = await User.create({
      email: `chiefwarden-${Date.now()}@test.edu`,
      password: 'ChiefWarden@123456',
      role: UserRole.CHIEF_WARDEN,
      isActive: true,
    });
    chiefWardenUserId = chiefWardenUser._id.toString();

    const directorUser = await User.create({
      email: `director-${Date.now()}@test.edu`,
      password: 'Director@123456',
      role: UserRole.DIRECTOR,
      isActive: true,
    });
    directorUserId = directorUser._id.toString();

    // Create hostels
    const hostel1 = await Hostel.create({
      name: 'Hostel 1',
      type: 'BOYS',
      wardenId: new mongoose.Types.ObjectId(wardenUserId),
      totalRooms: 10,
      studentsPerRoom: 2,
      capacity: 20,
      isActive: true,
    });
    hostel1Id = hostel1._id.toString();

    const hostel2 = await Hostel.create({
      name: 'Hostel 2',
      type: 'GIRLS',
      wardenId: new mongoose.Types.ObjectId(otherWardenUserId),
      totalRooms: 10,
      studentsPerRoom: 2,
      capacity: 20,
      isActive: true,
    });
    hostel2Id = hostel2._id.toString();

    // Create department and course
    const dept = await Department.create({
      name: 'CS',
      code: 'CS',
    });
    departmentId = dept._id.toString();

    const course = await Course.create({
      name: 'B.Tech',
      code: 'BTECH',
      departmentId: dept._id,
    });
    courseId = course._id.toString();

    // Create student
    const parentUser = await User.create({
      email: `parent-${Date.now()}@test.edu`,
      password: 'Parent@123456',
      role: UserRole.PARENT,
      isActive: true,
    });

    const student = await Student.create({
      userId: parentUser._id,
      rollNumber: `STU${Date.now()}`,
      name: 'Test Student',
      phone: '9999999999',
      gender: 'male',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      departmentId,
      courseId,
      hostelId: hostel1._id,
      year: 1,
      semester: 'I',
      admissionYear: 2023,
      parentId: parentUser._id as any,
      applicationStatus: 'allocated',
      allocationStatus: 'active',
      isActive: true,
      presenceStatus: 'IN_HOSTEL',
    });
    studentId1 = student._id.toString();
  });

  afterEach(async () => {
    await GatePass.deleteMany({});
    await GateMovement.deleteMany({});
    await Student.deleteMany({});
    await Hostel.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
  });

  // ─── Hostel Scope Resolution Tests ──────────────────────────────────────────

  describe('resolveHostelScope', () => {
    it('Admin should have access to all hostels', async () => {
      const scope = await presenceService.resolveHostelScope(adminUserId, UserRole.ADMIN);
      expect(scope).toBeNull(); // null means all hostels
    });

    it('Chief Warden should have access to all hostels', async () => {
      const scope = await presenceService.resolveHostelScope(
        chiefWardenUserId,
        UserRole.CHIEF_WARDEN,
      );
      expect(scope).toBeNull();
    });

    it('Director should have access to all hostels', async () => {
      const scope = await presenceService.resolveHostelScope(directorUserId, UserRole.DIRECTOR);
      expect(scope).toBeNull();
    });

    it('Warden should only have access to assigned hostels', async () => {
      const scope = await presenceService.resolveHostelScope(wardenUserId, UserRole.WARDEN);
      expect(scope).not.toBeNull();
      expect(Array.isArray(scope)).toBe(true);
      expect((scope as any[]).length).toBe(1);
      expect((scope as any[])[0].toString()).toBe(hostel1Id);
    });

    it('Warden accessing unauthorized hostel should throw error', async () => {
      expect(async () => {
        await presenceService.resolveHostelScope(wardenUserId, UserRole.WARDEN, hostel2Id);
      }).rejects.toThrow();
    });

    it('Other roles should have no hostel access', async () => {
      const scope = await presenceService.resolveHostelScope(adminUserId, UserRole.STUDENT);
      expect(scope).toEqual([]);
    });
  });

  // ─── Permission Verification Tests ─────────────────────────────────────────

  describe('canViewHostel', () => {
    it('Admin can view any hostel', async () => {
      const canView = await presenceService.canViewHostel(adminUserId, UserRole.ADMIN, hostel1Id);
      expect(canView).toBe(true);

      const canViewOther = await presenceService.canViewHostel(
        adminUserId,
        UserRole.ADMIN,
        hostel2Id,
      );
      expect(canViewOther).toBe(true);
    });

    it('Warden can view only assigned hostel', async () => {
      const canView = await presenceService.canViewHostel(
        wardenUserId,
        UserRole.WARDEN,
        hostel1Id,
      );
      expect(canView).toBe(true);
    });

    it('Warden cannot view other hostel', async () => {
      const canView = await presenceService.canViewHostel(
        wardenUserId,
        UserRole.WARDEN,
        hostel2Id,
      );
      expect(canView).toBe(false);
    });

    it('Chief Warden can view all hostels', async () => {
      const canView1 = await presenceService.canViewHostel(
        chiefWardenUserId,
        UserRole.CHIEF_WARDEN,
        hostel1Id,
      );
      expect(canView1).toBe(true);

      const canView2 = await presenceService.canViewHostel(
        chiefWardenUserId,
        UserRole.CHIEF_WARDEN,
        hostel2Id,
      );
      expect(canView2).toBe(true);
    });
  });

  // ─── Dashboard Metrics Permission Tests ─────────────────────────────────────

  describe('getDashboardMetrics', () => {
    it('Admin can retrieve metrics for all hostels', async () => {
      const metrics = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.ADMIN,
        adminUserId,
      );

      expect(metrics).toHaveProperty('totalRegisteredStudents');
      expect(metrics).toHaveProperty('currentlyOutside');
    });

    it('Warden can retrieve metrics for their hostel only', async () => {
      const metrics = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.WARDEN,
        wardenUserId,
      );

      expect(metrics).toHaveProperty('totalRegisteredStudents');
      // Should include student from hostel1
      expect(metrics.totalRegisteredStudents).toBeGreaterThanOrEqual(1);
    });

    it('Warden cannot retrieve metrics for another hostel', async () => {
      expect(async () => {
        await presenceService.getDashboardMetrics(
          '2024-01-15',
          UserRole.WARDEN,
          wardenUserId,
          hostel2Id, // Not warden's hostel
        );
      }).rejects.toThrow();
    });

    it('Invalid role gets no hostel access', async () => {
      expect(async () => {
        await presenceService.getDashboardMetrics(
          '2024-01-15',
          UserRole.STUDENT,
          adminUserId,
        );
      }).rejects.toThrow();
    });
  });

  // ─── Hostel Statistics Permission Tests ────────────────────────────────────

  describe('getHostelStatistics', () => {
    it('Chief Warden can retrieve statistics for all hostels', async () => {
      const stats = await presenceService.getHostelStatistics(
        '2024-01-15',
        UserRole.CHIEF_WARDEN,
        chiefWardenUserId,
      );

      expect(Array.isArray(stats)).toBe(true);
      // Should have at least 1 hostel (might have both)
      expect(stats.length).toBeGreaterThan(0);
    });

    it('Warden sees only their hostels in statistics', async () => {
      const stats = await presenceService.getHostelStatistics(
        '2024-01-15',
        UserRole.WARDEN,
        wardenUserId,
      );

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(1);
      expect(stats[0].hostelId).toBe(hostel1Id);
    });

    it('Director can retrieve statistics for all hostels', async () => {
      const stats = await presenceService.getHostelStatistics(
        '2024-01-15',
        UserRole.DIRECTOR,
        directorUserId,
      );

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });
  });

  // ─── Currently Outside Permission Tests ────────────────────────────────────

  describe('getCurrentlyOutside', () => {
    it('Warden can retrieve currently outside students for their hostel', async () => {
      const result = await presenceService.getCurrentlyOutside(
        UserRole.WARDEN,
        wardenUserId,
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('Admin can retrieve currently outside students for all hostels', async () => {
      const result = await presenceService.getCurrentlyOutside(UserRole.ADMIN, adminUserId);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('Invalid role cannot retrieve data', async () => {
      expect(async () => {
        await presenceService.getCurrentlyOutside(UserRole.STUDENT, adminUserId);
      }).rejects.toThrow();
    });
  });

  // ─── Overdue Students Permission Tests ──────────────────────────────────────

  describe('getOverdueStudents', () => {
    it('Warden can retrieve overdue students', async () => {
      const result = await presenceService.getOverdueStudents(
        UserRole.WARDEN,
        wardenUserId,
      );

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('Chief Warden can retrieve overdue students for all hostels', async () => {
      const result = await presenceService.getOverdueStudents(
        UserRole.CHIEF_WARDEN,
        chiefWardenUserId,
      );

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // ─── Student Absence Detail Permission Tests ───────────────────────────────

  describe('getStudentAbsenceDetail', () => {
    it('Warden can retrieve absence detail for student in their hostel', async () => {
      const detail = await presenceService.getStudentAbsenceDetail(
        studentId1,
        '2024-01-15',
        UserRole.WARDEN,
        wardenUserId,
      );

      expect(detail).toHaveProperty('studentId');
      expect(detail?.studentId.toString()).toBe(studentId1);
    });

    it('Warden cannot retrieve absence detail for student in another hostel', async () => {
      expect(async () => {
        await presenceService.getStudentAbsenceDetail(
          studentId1,
          '2024-01-15',
          UserRole.WARDEN,
          otherWardenUserId, // Different warden
        );
      }).rejects.toThrow();
    });

    it('Admin can retrieve absence detail for any student', async () => {
      const detail = await presenceService.getStudentAbsenceDetail(
        studentId1,
        '2024-01-15',
        UserRole.ADMIN,
        adminUserId,
      );

      expect(detail).toHaveProperty('studentId');
      expect(detail?.studentId.toString()).toBe(studentId1);
    });
  });

  // ─── Hostel Filter Tests ───────────────────────────────────────────────────

  describe('Hostel Filtering with Request Parameter', () => {
    it('Admin can filter by hostel', async () => {
      const metrics1 = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.ADMIN,
        adminUserId,
        hostel1Id,
      );

      const metrics2 = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.ADMIN,
        adminUserId,
        hostel2Id,
      );

      // Both should return valid metrics (might be 0, but not error)
      expect(metrics1).toHaveProperty('totalRegisteredStudents');
      expect(metrics2).toHaveProperty('totalRegisteredStudents');
    });

    it('Warden cannot filter to access unauthorized hostel', async () => {
      expect(async () => {
        await presenceService.getDashboardMetrics(
          '2024-01-15',
          UserRole.WARDEN,
          wardenUserId,
          hostel2Id, // Not their hostel
        );
      }).rejects.toThrow();
    });

    it('Chief Warden can filter to any hostel', async () => {
      const metrics1 = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.CHIEF_WARDEN,
        chiefWardenUserId,
        hostel1Id,
      );

      const metrics2 = await presenceService.getDashboardMetrics(
        '2024-01-15',
        UserRole.CHIEF_WARDEN,
        chiefWardenUserId,
        hostel2Id,
      );

      expect(metrics1).toHaveProperty('totalRegisteredStudents');
      expect(metrics2).toHaveProperty('totalRegisteredStudents');
    });
  });
});
