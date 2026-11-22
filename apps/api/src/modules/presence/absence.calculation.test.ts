/**
 * Absence Calculation Tests
 *
 * Comprehensive tests for absence calculation logic using gate movement records.
 * Tests all scenarios: students exiting/returning same day, across days, overdue, etc.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { GatePass } from '../../models/gatePass.model';
import { GateMovement } from '../../models/gateMovement.model';
import { Student } from '../../models/student.model';
import { Hostel } from '../../models/hostel.model';
import { LeaveRequest } from '../../models/leaveRequest.model';
import { User } from '../../models/user.model';
import { Department } from '../../models/department.model';
import { Course } from '../../models/course.model';
import {
  getDateBoundaries,
  isStudentAbsentOnDate,
  getCurrentlyOutsideStudents,
  getOverdueStudents,
  getReturnedTodayStudents,
  getApprovedNotExitedStudents,
  calculateAbsenceMetrics,
  absenceCalculationService,
} from './absence.calculation';

describe('Absence Calculation Service', () => {
  let hostelId: string;
  let studentId: string;
  let userId: string;
  let departmentId: string;
  let courseId: string;
  let guardId: string;

  beforeEach(async () => {
    // Create test data
    const user = await User.create({
      email: `guard-${Date.now()}@test.edu`,
      password: 'Guard@123456',
      role: 'GUARD',
      isActive: true,
    });
    guardId = user._id.toString();

    const dept = await Department.create({
      name: 'Computer Science',
      code: 'CS',
    });
    departmentId = dept._id.toString();

    const course = await Course.create({
      name: 'B.Tech',
      code: 'BTECH',
      departmentId,
    });
    courseId = course._id.toString();

    const hostel = await Hostel.create({
      name: 'Test Hostel',
      type: 'BOYS',
      totalRooms: 10,
      studentsPerRoom: 2,
      capacity: 20,
      isActive: true,
    });
    hostelId = hostel._id.toString();

    const parentUser = await User.create({
      email: `parent-${Date.now()}@test.edu`,
      password: 'Parent@123456',
      role: 'PARENT',
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
      hostelId,
      year: 1,
      semester: 'I',
      admissionYear: 2023,
      parentId: null as any,
      applicationStatus: 'allocated',
      allocationStatus: 'active',
      isActive: true,
      presenceStatus: 'IN_HOSTEL',
    });
    studentId = student._id.toString();
    userId = parentUser._id.toString();
  });

  afterEach(async () => {
    // Cleanup
    await GatePass.deleteMany({});
    await GateMovement.deleteMany({});
    await Student.deleteMany({});
    await Hostel.deleteMany({});
    await LeaveRequest.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
  });

  // ─── Date Boundary Tests ────────────────────────────────────────────────────

  describe('getDateBoundaries', () => {
    it('should correctly parse a date string to day boundaries', () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      expect(dayStart.getUTCDate()).toBe(15);
      expect(dayStart.getUTCMonth()).toBe(0); // January
      expect(dayStart.getUTCHours()).toBe(0);
      expect(dayStart.getUTCMinutes()).toBe(0);
      expect(dayStart.getUTCSeconds()).toBe(0);

      expect(dayEnd.getUTCDate()).toBe(16);
      expect(dayEnd.getUTCMonth()).toBe(0);
      expect(dayEnd.getUTCHours()).toBe(0);
    });

    it('should throw error for invalid date format', () => {
      expect(() => getDateBoundaries('invalid-date')).toThrow();
      expect(() => getDateBoundaries('2024/01/15')).toThrow();
    });

    it('should handle month boundaries correctly', () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-31');

      expect(dayStart.getUTCDate()).toBe(31);
      expect(dayStart.getUTCMonth()).toBe(0);

      expect(dayEnd.getUTCDate()).toBe(1);
      expect(dayEnd.getUTCMonth()).toBe(1); // February
    });
  });

  // ─── Absence Detection Tests ────────────────────────────────────────────────

  describe('isStudentAbsentOnDate', () => {
    it('should return false if student has no exit movement', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      const isAbsent = await isStudentAbsentOnDate(
        new mongoose.Types.ObjectId(studentId),
        dayStart,
        dayEnd,
      );

      expect(isAbsent).toBe(false);
    });

    it('should detect student absent when exited before dayEnd and no return', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Student exits before the day boundary
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      const isAbsent = await isStudentAbsentOnDate(
        new mongoose.Types.ObjectId(studentId),
        dayStart,
        dayEnd,
      );

      expect(isAbsent).toBe(true);
    });

    it('should detect student exited and returned same day', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Student exits
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      // Student returns on same day
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'entry',
        actualTimestamp: new Date('2024-01-15T14:00:00Z'),
      });

      const isAbsent = await isStudentAbsentOnDate(
        new mongoose.Types.ObjectId(studentId),
        dayStart,
        dayEnd,
      );

      // Should be true because they were absent at some point
      expect(isAbsent).toBe(true);
    });

    it('should detect absence across date boundaries', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Student exits before the date and hasn't returned yet
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-14T18:00:00Z'), // Yesterday
      });

      const isAbsent = await isStudentAbsentOnDate(
        new mongoose.Types.ObjectId(studentId),
        dayStart,
        dayEnd,
      );

      // Should be true - exit before date, no return yet
      expect(isAbsent).toBe(true);
    });

    it('should not count student absent if they returned before the date', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Student exits and returns before the selected date
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-14T10:00:00Z'),
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'entry',
        actualTimestamp: new Date('2024-01-14T14:00:00Z'),
      });

      const isAbsent = await isStudentAbsentOnDate(
        new mongoose.Types.ObjectId(studentId),
        dayStart,
        dayEnd,
      );

      expect(isAbsent).toBe(false);
    });
  });

  // ─── Currently Outside Tests ────────────────────────────────────────────────

  describe('getCurrentlyOutsideStudents', () => {
    it('should return student who exited but has not returned', async () => {
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      const result = await getCurrentlyOutsideStudents(
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBe(1);
      expect(result.data[0].studentId.toString()).toBe(studentId);
      expect(result.data[0].actualExitTime).toBeDefined();
      expect(result.data[0].actualReturnTime).toBeUndefined();
    });

    it('should not return student who has returned', async () => {
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'entry',
        actualTimestamp: new Date('2024-01-15T14:00:00Z'),
      });

      const result = await getCurrentlyOutsideStudents(
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBe(0);
    });

    it('should respect hostel filter', async () => {
      const otherHostel = await Hostel.create({
        name: 'Other Hostel',
        type: 'GIRLS',
        totalRooms: 10,
        studentsPerRoom: 2,
        capacity: 20,
        isActive: true,
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      // Query with different hostel should return empty
      const result = await getCurrentlyOutsideStudents(
        [otherHostel._id as any],
        1,
        20,
      );

      expect(result.total).toBe(0);
    });
  });

  // ─── Overdue Tests ──────────────────────────────────────────────────────────

  describe('getOverdueStudents', () => {
    it('should detect overdue student', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Create gate pass with expected return in the past
      await GatePass.create({
        gatePassNumber: `GP-${Date.now()}`,
        leaveRequestId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        status: 'OUT_OF_HOSTEL',
        approvedDeparture: new Date(),
        expectedReturn: pastTime,
        actualExitTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      });

      // Create exit movement
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      });

      const result = await getOverdueStudents(
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBeGreaterThanOrEqual(1);
      const overdueStudent = result.data.find((s) => s.studentId.toString() === studentId);
      expect(overdueStudent).toBeDefined();
      expect(overdueStudent?.overdueBy).toBeDefined();
    });

    it('should not include non-overdue students', async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      // Create gate pass with future expected return
      await GatePass.create({
        gatePassNumber: `GP-${Date.now()}`,
        leaveRequestId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        status: 'OUT_OF_HOSTEL',
        approvedDeparture: new Date(),
        expectedReturn: futureTime,
        actualExitTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      });

      // Create exit movement
      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      });

      const result = await getOverdueStudents(
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      const overdueStudent = result.data.find((s) => s.studentId.toString() === studentId);
      expect(overdueStudent).toBeUndefined();
    });
  });

  // ─── Returned Today Tests ───────────────────────────────────────────────────

  describe('getReturnedTodayStudents', () => {
    it('should return student who exited and returned on the same date', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'entry',
        actualTimestamp: new Date('2024-01-15T14:00:00Z'),
      });

      const result = await getReturnedTodayStudents(
        dayStart,
        dayEnd,
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBe(1);
      expect(result.data[0].studentId.toString()).toBe(studentId);
      expect(result.data[0].actualExitTime).toBeDefined();
      expect(result.data[0].actualReturnTime).toBeDefined();
    });

    it('should not include students who exited before the date', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-14T18:00:00Z'), // Previous day
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'entry',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      const result = await getReturnedTodayStudents(
        dayStart,
        dayEnd,
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBe(0);
    });
  });

  // ─── Approved Not Exited Tests ──────────────────────────────────────────────

  describe('getApprovedNotExitedStudents', () => {
    it('should return students with approved leave but no exit', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      await GatePass.create({
        gatePassNumber: `GP-${Date.now()}`,
        leaveRequestId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        status: 'APPROVED',
        approvedDeparture: new Date('2024-01-15T00:00:00Z'),
        expectedReturn: new Date('2024-01-16T00:00:00Z'),
      });

      const result = await getApprovedNotExitedStudents(
        dayStart,
        dayEnd,
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      expect(result.total).toBeGreaterThanOrEqual(1);
      const approvedStudent = result.data.find((s) => s.studentId.toString() === studentId);
      expect(approvedStudent).toBeDefined();
      expect(approvedStudent?.leaveRequestStatus).toBe('APPROVED');
    });

    it('should not return students who have already exited', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Create gate pass
      await GatePass.create({
        gatePassNumber: `GP-${Date.now()}`,
        leaveRequestId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        status: 'OUT_OF_HOSTEL',
        approvedDeparture: new Date('2024-01-15T00:00:00Z'),
        expectedReturn: new Date('2024-01-16T00:00:00Z'),
        actualExitTime: new Date('2024-01-15T10:00:00Z'),
      });

      const result = await getApprovedNotExitedStudents(
        dayStart,
        dayEnd,
        [new mongoose.Types.ObjectId(hostelId)],
        1,
        20,
      );

      const approvedStudent = result.data.find((s) => s.studentId.toString() === studentId);
      expect(approvedStudent).toBeUndefined();
    });
  });

  // ─── Metrics Calculation Tests ──────────────────────────────────────────────

  describe('calculateAbsenceMetrics', () => {
    it('should correctly calculate all metrics', async () => {
      const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

      // Create gate pass and movements
      await GatePass.create({
        gatePassNumber: `GP-${Date.now()}`,
        leaveRequestId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        status: 'OUT_OF_HOSTEL',
        approvedDeparture: new Date('2024-01-15T00:00:00Z'),
        expectedReturn: new Date('2024-01-15T14:00:00Z'),
        actualExitTime: new Date('2024-01-15T10:00:00Z'),
      });

      await GateMovement.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        hostelId: new mongoose.Types.ObjectId(hostelId),
        movementType: 'exit',
        actualTimestamp: new Date('2024-01-15T10:00:00Z'),
      });

      const metrics = await calculateAbsenceMetrics(
        dayStart,
        dayEnd,
        [new mongoose.Types.ObjectId(hostelId)],
      );

      expect(metrics).toHaveProperty('totalRegisteredStudents');
      expect(metrics).toHaveProperty('currentlyOutside');
      expect(metrics).toHaveProperty('returnedToday');
      expect(metrics).toHaveProperty('overdueStudents');
      expect(metrics).toHaveProperty('absentAtAnyPoint');
      expect(metrics).toHaveProperty('approvedButNotExited');

      // Student should count as outside and absent
      expect(metrics.currentlyOutside).toBeGreaterThanOrEqual(1);
      expect(metrics.absentAtAnyPoint).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── Scenario Tests ─────────────────────────────────────────────────────────────

describe('Absence Calculation - Real-world Scenarios', () => {
  let hostelId: string;
  let studentId1: string;
  let studentId2: string;
  let studentId3: string;
  let hostelObjId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const hostel = await Hostel.create({
      name: `Test Hostel ${Date.now()}`,
      type: 'BOYS',
      totalRooms: 10,
      studentsPerRoom: 2,
      capacity: 20,
      isActive: true,
    });
    hostelObjId = hostel._id as mongoose.Types.ObjectId;
    hostelId = hostel._id.toString();

    const dept = await Department.create({
      name: 'CS',
      code: 'CS',
    });

    const course = await Course.create({
      name: 'B.Tech',
      code: 'BTECH',
      departmentId: dept._id,
    });

    const parentUser1 = await User.create({
      email: `parent1-${Date.now()}@test.edu`,
      password: 'Parent@123456',
      role: 'PARENT',
      isActive: true,
    });

    const parentUser2 = await User.create({
      email: `parent2-${Date.now()}@test.edu`,
      password: 'Parent@123456',
      role: 'PARENT',
      isActive: true,
    });

    const parentUser3 = await User.create({
      email: `parent3-${Date.now()}@test.edu`,
      password: 'Parent@123456',
      role: 'PARENT',
      isActive: true,
    });

    const student1 = await Student.create({
      userId: parentUser1._id,
      rollNumber: `STU1-${Date.now()}`,
      name: 'Student 1',
      phone: '1111111111',
      gender: 'male',
      address: 'Address 1',
      city: 'City',
      state: 'State',
      pincode: '123456',
      departmentId: dept._id,
      courseId: course._id,
      hostelId: hostel._id,
      year: 1,
      semester: 'I',
      admissionYear: 2023,
      applicationStatus: 'allocated',
      allocationStatus: 'active',
      isActive: true,
      presenceStatus: 'IN_HOSTEL',
    });
    studentId1 = student1._id.toString();

    const student2 = await Student.create({
      userId: parentUser2._id,
      rollNumber: `STU2-${Date.now()}`,
      name: 'Student 2',
      phone: '2222222222',
      gender: 'male',
      address: 'Address 2',
      city: 'City',
      state: 'State',
      pincode: '123456',
      departmentId: dept._id,
      courseId: course._id,
      hostelId: hostel._id,
      year: 1,
      semester: 'I',
      admissionYear: 2023,
      applicationStatus: 'allocated',
      allocationStatus: 'active',
      isActive: true,
      presenceStatus: 'IN_HOSTEL',
    });
    studentId2 = student2._id.toString();

    const student3 = await Student.create({
      userId: parentUser3._id,
      rollNumber: `STU3-${Date.now()}`,
      name: 'Student 3',
      phone: '3333333333',
      gender: 'male',
      address: 'Address 3',
      city: 'City',
      state: 'State',
      pincode: '123456',
      departmentId: dept._id,
      courseId: course._id,
      hostelId: hostel._id,
      year: 1,
      semester: 'I',
      admissionYear: 2023,
      applicationStatus: 'allocated',
      allocationStatus: 'active',
      isActive: true,
      presenceStatus: 'IN_HOSTEL',
    });
    studentId3 = student3._id.toString();
  });

  afterEach(async () => {
    await GatePass.deleteMany({});
    await GateMovement.deleteMany({});
    await Student.deleteMany({});
    await Hostel.deleteMany({});
    await LeaveRequest.deleteMany({});
    await User.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
  });

  it('Scenario: Multiple students with different absence statuses on same date', async () => {
    const { dayStart, dayEnd } = getDateBoundaries('2024-01-15');

    // Student 1: Exits before midnight, returns after (crosses date boundary)
    await GateMovement.create({
      studentId: new mongoose.Types.ObjectId(studentId1),
      hostelId: hostelObjId,
      movementType: 'exit',
      actualTimestamp: new Date('2024-01-14T22:00:00Z'),
    });

    await GateMovement.create({
      studentId: new mongoose.Types.ObjectId(studentId1),
      hostelId: hostelObjId,
      movementType: 'entry',
      actualTimestamp: new Date('2024-01-15T10:00:00Z'),
    });

    // Student 2: Exits and returns same day
    await GateMovement.create({
      studentId: new mongoose.Types.ObjectId(studentId2),
      hostelId: hostelObjId,
      movementType: 'exit',
      actualTimestamp: new Date('2024-01-15T09:00:00Z'),
    });

    await GateMovement.create({
      studentId: new mongoose.Types.ObjectId(studentId2),
      hostelId: hostelObjId,
      movementType: 'entry',
      actualTimestamp: new Date('2024-01-15T16:00:00Z'),
    });

    // Student 3: Never leaves

    const metrics = await calculateAbsenceMetrics(dayStart, dayEnd, [hostelObjId]);

    // All 3 students should be counted: 1 and 2 were absent at some point, 3 is present
    expect(metrics.totalRegisteredStudents).toBe(3);
    expect(metrics.absentAtAnyPoint).toBe(2); // Students 1 and 2
    expect(metrics.returnedToday).toBe(2); // Both returned on this date
    expect(metrics.currentlyOutside).toBe(0); // Both have returned
  });
});
