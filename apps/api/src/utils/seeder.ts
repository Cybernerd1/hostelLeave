/**
 * Database Seeder
 *
 * Seeds the database with initial Admin user, sample data, and demo users.
 * Run with: npm run seed -w apps/api
 */

import mongoose from 'mongoose';

import { config } from '../config';
import { connectDatabase } from '../config/database';
import { User } from '../models/user.model';
import { Student } from '../models/student.model';
import { Parent } from '../models/parent.model';
import { Department } from '../models/department.model';
import { Course } from '../models/course.model';
import { Hostel } from '../models/hostel.model';
import { Room } from '../models/room.model';
import { UserRole, HostelType, RoomType, ParentRelation, Gender } from '@hostel/shared-types';
import { logger } from './logger';

async function seed(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('🌱 Starting database seeder...');

    // ─── Admin User ───────────────────────────────────────────────────────────

    const existingAdmin = await User.findOne({ role: UserRole.ADMIN });
    if (!existingAdmin) {
      await User.create({
        email: config.adminSeed.email,
        password: config.adminSeed.password,
        role: UserRole.ADMIN,
        name: config.adminSeed.name,
        isActive: true,
      });
      logger.info(`✅ Admin user created: ${config.adminSeed.email}`);
    } else {
      logger.info('ℹ️  Admin user already exists, skipping...');
    }

    // ─── Sample Departments ───────────────────────────────────────────────────

    const departments = [
      { name: 'Computer Science and Engineering', code: 'CSE' },
      { name: 'Electronics and Communication Engineering', code: 'ECE' },
      { name: 'Mechanical Engineering', code: 'ME' },
      { name: 'Civil Engineering', code: 'CE' },
      { name: 'Electrical Engineering', code: 'EE' },
      { name: 'Information Technology', code: 'IT' },
    ];

    for (const dept of departments) {
      const existing = await Department.findOne({ code: dept.code });
      if (!existing) {
        await Department.create(dept);
        logger.info(`✅ Department created: ${dept.name}`);
      }
    }

    // ─── Sample Courses ───────────────────────────────────────────────────────

    const deptDocs = await Department.find().lean();
    const deptMap = new Map(deptDocs.map((d) => [d.code, d._id]));

    const courses = [
      { name: 'B.Tech Computer Science', code: 'BTCS', deptCode: 'CSE', duration: 4, totalSemesters: 8 },
      { name: 'B.Tech Electronics', code: 'BTEC', deptCode: 'ECE', duration: 4, totalSemesters: 8 },
      { name: 'B.Tech Mechanical', code: 'BTME', deptCode: 'ME', duration: 4, totalSemesters: 8 },
      { name: 'B.Tech Civil', code: 'BTCE', deptCode: 'CE', duration: 4, totalSemesters: 8 },
      { name: 'B.Tech Electrical', code: 'BTEE', deptCode: 'EE', duration: 4, totalSemesters: 8 },
      { name: 'B.Tech Information Technology', code: 'BTIT', deptCode: 'IT', duration: 4, totalSemesters: 8 },
      { name: 'M.Tech Computer Science', code: 'MTCS', deptCode: 'CSE', duration: 2, totalSemesters: 4 },
    ];

    for (const course of courses) {
      const existing = await Course.findOne({ code: course.code });
      if (!existing) {
        const departmentId = deptMap.get(course.deptCode);
        if (departmentId) {
          await Course.create({
            name: course.name,
            code: course.code,
            departmentId,
            duration: course.duration,
            totalSemesters: course.totalSemesters,
          });
          logger.info(`✅ Course created: ${course.name}`);
        }
      }
    }

    // ─── Sample Hostels ───────────────────────────────────────────────────────

    const hostels = [
      { name: 'Hostel A (Boys)', type: HostelType.BOYS, totalRooms: 100, capacity: 400 },
      { name: 'Hostel B (Boys)', type: HostelType.BOYS, totalRooms: 100, capacity: 400 },
      { name: 'Hostel C (Boys)', type: HostelType.BOYS, totalRooms: 100, capacity: 400 },
      { name: 'Hostel D (Girls)', type: HostelType.GIRLS, totalRooms: 100, capacity: 400 },
      { name: 'Hostel E (Girls)', type: HostelType.GIRLS, totalRooms: 100, capacity: 400 },
    ];

    for (const hostel of hostels) {
      const existing = await Hostel.findOne({ name: hostel.name });
      if (!existing) {
        await Hostel.create(hostel);
        logger.info(`✅ Hostel created: ${hostel.name}`);
      }
    }

    // ─── Sample Rooms (10 per hostel) ─────────────────────────────────────────

    const hostelDocs = await Hostel.find().lean();

    for (const hostel of hostelDocs) {
      const existingRooms = await Room.countDocuments({ hostelId: hostel._id });
      if (existingRooms === 0) {
        const rooms = [];
        for (let floor = 1; floor <= 4; floor++) {
          for (let room = 1; room <= 10; room++) {
            rooms.push({
              roomNumber: `${floor}${room.toString().padStart(2, '0')}`,
              hostelId: hostel._id,
              floor: `Floor ${floor}`,
              capacity: floor <= 2 ? 2 : 4,
              type: floor <= 2 ? RoomType.DOUBLE : RoomType.DORMITORY,
              occupied: 0,
            });
          }
        }
        await Room.insertMany(rooms);
        logger.info(`✅ ${rooms.length} rooms created for ${hostel.name}`);
      }
    }

    // ─── Demo Users (one per role) ────────────────────────────────────────────

    const DEMO_PASSWORD = 'Demo@123';
    // ⚠️  Parent MUST come before Student so parentId is available when creating the student profile
    const demoUsers = [
      { email: 'parent@demo.edu',      name: 'Rajesh Sharma',    role: UserRole.PARENT,          phone: '9876543211' },
      { email: 'student@demo.edu',     name: 'Arjun Sharma',     role: UserRole.STUDENT,         phone: '9876543210' },
      { email: 'warden@demo.edu',      name: 'Dr. Meena Patel',  role: UserRole.WARDEN,          phone: '9876543212' },
      { email: 'chiefwarden@demo.edu', name: 'Dr. Vikram Singh', role: UserRole.CHIEF_WARDEN,    phone: '9876543213' },
      { email: 'hod@demo.edu',         name: 'Prof. Anita Rao',  role: UserRole.HOD,             phone: '9876543214' },
      { email: 'vc@demo.edu',          name: 'Dr. Suresh Kumar', role: UserRole.VICE_CHANCELLOR, phone: '9876543215' },
      { email: 'guard@demo.edu',       name: 'Ramesh Gupta',     role: UserRole.GUARD,           phone: '9876543216' },
      { email: 'admin@demo.edu',       name: 'Demo Admin',       role: UserRole.ADMIN,           phone: '9876543217' },
    ];

    // Get reference docs for Student profile
    const firstDept = await Department.findOne().lean();
    const firstCourse = await Course.findOne().lean();
    const firstHostel = await Hostel.findOne({ type: HostelType.BOYS }).lean();
    const firstRoom = firstHostel
      ? await Room.findOne({ hostelId: firstHostel._id }).lean()
      : null;

    let demoParentDoc: { _id: mongoose.Types.ObjectId } | null = null;

    for (const userData of demoUsers) {
      // Upsert: update password if exists, else create
      let userDoc = await User.findOne({ email: userData.email }).select('+password');
      if (userDoc) {
        userDoc.password = DEMO_PASSWORD;
        userDoc.name = userData.name;
        await userDoc.save();
        logger.info(`↺  Updated demo [${userData.role}] → ${userData.email}`);
      } else {
        userDoc = await User.create({
          email: userData.email,
          password: DEMO_PASSWORD,
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          isActive: true,
        });
        logger.info(`✅ Created demo [${userData.role}] → ${userData.email}`);
      }

      // Create Parent profile
      if (userData.role === UserRole.PARENT) {
        const existingParent = await Parent.findOne({ userId: userDoc._id });
        if (!existingParent) {
          const created = await Parent.create({
            userId: userDoc._id,
            name: userData.name,
            phone: userData.phone,
            email: userData.email,
            relation: ParentRelation.FATHER,
            address: '123 Demo Street, Andheri West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400058',
            isActive: true,
          });
          demoParentDoc = created;
          logger.info('   → Parent profile created');
        } else {
          demoParentDoc = existingParent;
          logger.info('   → Parent profile already exists');
        }
      }

      // Create Student profile
      if (userData.role === UserRole.STUDENT) {
        const existingStudent = await Student.findOne({ userId: userDoc._id });
        if (!existingStudent) {
          // Try to resolve parent if not yet created in this run
          if (!demoParentDoc) {
            const parentUser = await User.findOne({ email: 'parent@demo.edu' });
            if (parentUser) {
              demoParentDoc = await Parent.findOne({ userId: parentUser._id });
            }
          }

          if (firstDept && firstCourse && firstHostel && firstRoom) {
            await Student.create({
              userId: userDoc._id,
              rollNumber: 'CS2024001',
              name: userData.name,
              phone: userData.phone,
              gender: Gender.MALE,
              dateOfBirth: new Date('2003-06-15'),
              address: '456 Demo Colony, Borivali East',
              city: 'Mumbai',
              state: 'Maharashtra',
              pincode: '400066',
              departmentId: firstDept._id,
              courseId: firstCourse._id,
              hostelId: firstHostel._id,
              roomId: firstRoom._id,
              parentId: demoParentDoc?._id,
              year: 2,
              semester: '3rd',
              admissionYear: 2023,
              bloodGroup: 'O+',
              isActive: true,
            });
            logger.info('   → Student profile created (Roll: CS2024001)');
          } else {
            logger.warn('   ⚠ Skipped student profile — dept/course/hostel/room not found');
          }
        } else {
          logger.info('   → Student profile already exists');
        }
      }
    }

    logger.info('');
    logger.info('─────────────────────────────────────────────────');
    logger.info('  Demo Credentials  (password for all: Demo@123)');
    logger.info('─────────────────────────────────────────────────');
    demoUsers.forEach((u) => {
      logger.info(`  ${u.role.padEnd(18)} → ${u.email}`);
    });
    logger.info('─────────────────────────────────────────────────');

    // ─── Patch: ensure demo student has parentId linked ──────────────────────
    {
      const parentUser = await User.findOne({ email: 'parent@demo.edu' });
      const studentUser = await User.findOne({ email: 'student@demo.edu' });
      if (parentUser && studentUser) {
        const parentDoc = await Parent.findOne({ userId: parentUser._id });
        if (parentDoc) {
          const updated = await Student.findOneAndUpdate(
            { userId: studentUser._id, parentId: { $exists: false } },
            { $set: { parentId: parentDoc._id } },
          );
          if (updated) {
            logger.info('✅ Patched demo student: parentId linked to Rajesh Sharma');
          } else {
            // Already has a parentId — make sure it's the right one
            await Student.findOneAndUpdate(
              { userId: studentUser._id },
              { $set: { parentId: parentDoc._id } },
            );
            logger.info('✅ Ensured demo student parentId is correct');
          }
        }
      }
    }

    logger.info('🎉 Database seeding completed!');


  } catch (error) {
    logger.error('❌ Seeder error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
