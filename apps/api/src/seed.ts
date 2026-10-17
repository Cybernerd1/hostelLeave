/**
 * Seed Script — Dummy Users
 *
 * Creates one demo user per role for development and testing.
 * Credentials: {role}@demo.edu / Demo@123
 *
 * Run: npx ts-node src/seed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from './models/user.model';
import { Student } from './models/student.model';
import { Parent } from './models/parent.model';
import { Hostel } from './models/hostel.model';
import { Department } from './models/department.model';
import { Course } from './models/course.model';
import { Room } from './models/room.model';
import { UserRole, Gender, ParentRelation, HostelType, RoomType } from '@hostel/shared-types';

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_leave_mgmt';

const DEMO_PASSWORD = 'Demo@123';

const DEMO_USERS = [
  { email: 'parent@demo.edu',       name: 'Rajesh Sharma',     role: UserRole.PARENT,           phone: '9876543211' },
  { email: 'student@demo.edu',      name: 'Arjun Sharma',      role: UserRole.STUDENT,          phone: '9876543210' },
  { email: 'warden@demo.edu',       name: 'Dr. Meena Patel',   role: UserRole.WARDEN,           phone: '9876543212' },
  { email: 'chiefwarden@demo.edu',  name: 'Dr. Vikram Singh',  role: UserRole.CHIEF_WARDEN,     phone: '9876543213' },
  { email: 'hod@demo.edu',          name: 'Prof. Anita Rao',   role: UserRole.HOD,              phone: '9876543214' },
  { email: 'vc@demo.edu',           name: 'Dr. Suresh Kumar',  role: UserRole.DIRECTOR,  phone: '9876543215' },
  { email: 'guard@demo.edu',        name: 'Ramesh Gupta',      role: UserRole.GUARD,            phone: '9876543216' },
  { email: 'admin@demo.edu',        name: 'System Admin',      role: UserRole.ADMIN,            phone: '9876543217' },
];

async function getOrCreateDependencies() {
  let department = await Department.findOne();
  if (!department) {
    department = await Department.create({
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description: 'Demo department',
      isActive: true,
    });
    console.log('  ✓ Created demo Department: CSE');
  }

  let course = await Course.findOne();
  if (!course) {
    course = await Course.create({
      name: 'B.Tech Computer Science',
      code: 'BTECH-CSE',
      departmentId: (department as { _id: mongoose.Types.ObjectId })._id,
      duration: 4,
      totalSemesters: 8,
      isActive: true,
    });
    console.log('  ✓ Created demo Course: B.Tech CSE');
  }

  let hostel = await Hostel.findOne();
  if (!hostel) {
    hostel = await Hostel.create({
      name: 'Demo Boys Hostel',
      type: HostelType.BOYS,
      totalRooms: 100,
      capacity: 100,
      isActive: true,
    });
    console.log('  ✓ Created demo Hostel');
  }

  let room = await Room.findOne({ hostelId: (hostel as { _id: mongoose.Types.ObjectId })._id });
  if (!room) {
    room = await Room.create({
      hostelId: (hostel as { _id: mongoose.Types.ObjectId })._id,
      roomNumber: 'A-101',
      floor: '1',
      type: RoomType.SINGLE,
      capacity: 1,
      isActive: true,
    });
    console.log('  ✓ Created demo Room: A-101');
  }

  return { department, course, hostel, room };
}

async function seedUsers() {
  console.log('\n🌱 Starting seed...\n');
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB\n`);

  const deps = await getOrCreateDependencies();
  let parentDoc: { _id: mongoose.Types.ObjectId } | null = null;

  for (const userData of DEMO_USERS) {
    const existingUser = await User.findOne({ email: userData.email });
    let user: InstanceType<typeof User>;

    if (existingUser) {
      existingUser.password = DEMO_PASSWORD;
      existingUser.name = userData.name;
      await existingUser.save();
      user = existingUser;
      console.log(`  ↺  Updated  [${userData.role.padEnd(16)}] ${userData.email}`);
    } else {
      user = await User.create({
        email: userData.email,
        password: DEMO_PASSWORD,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        isActive: true,
      });
      console.log(`  ✓  Created  [${userData.role.padEnd(16)}] ${userData.email}`);
    }

    if (userData.role === UserRole.PARENT) {
      const existingParent = await Parent.findOne({ userId: user._id });
      if (!existingParent) {
        const created = await Parent.create({
          userId: user._id,
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
          relation: ParentRelation.FATHER,
          address: '123 Demo Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          isActive: true,
        });
        parentDoc = created;
        console.log(`         → Parent profile created`);
      } else {
        parentDoc = existingParent;
        console.log(`         → Parent profile already exists`);
      }
    }

    if (userData.role === UserRole.STUDENT) {
      const existingStudent = await Student.findOne({ userId: user._id });
      if (!existingStudent) {
        if (!parentDoc) {
          const parentUser = await User.findOne({ email: 'parent@demo.edu' });
          if (parentUser) {
            parentDoc = await Parent.findOne({ userId: parentUser._id }) as typeof parentDoc;
          }
        }
        await Student.create({
          userId: user._id,
          rollNumber: 'CS2024001',
          name: userData.name,
          phone: userData.phone,
          gender: Gender.MALE,
          dateOfBirth: new Date('2003-06-15'),
          address: '456 Demo Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          departmentId: (deps.department as { _id: mongoose.Types.ObjectId })._id,
          courseId: (deps.course as { _id: mongoose.Types.ObjectId })._id,
          hostelId: (deps.hostel as { _id: mongoose.Types.ObjectId })._id,
          roomId: (deps.room as { _id: mongoose.Types.ObjectId })._id,
          parentId: parentDoc?._id,
          year: 2,
          semester: '3rd',
          admissionYear: 2023,
          bloodGroup: 'O+',
          isActive: true,
        });
        console.log(`         → Student profile created (Roll: CS2024001)`);
      } else {
        console.log(`         → Student profile already exists`);
      }
    }
  }

  // ── Patch: link parentId on student if it was created without one ──
  if (parentDoc) {
    const studentUser = await User.findOne({ email: 'student@demo.edu' });
    if (studentUser) {
      const updated = await Student.findOneAndUpdate(
        { userId: studentUser._id, $or: [{ parentId: null }, { parentId: { $exists: false } }] },
        { $set: { parentId: parentDoc._id } },
        { new: true },
      );
      if (updated) {
        console.log(`  🔗 Patched student parentId → ${parentDoc._id}`);
      }
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('  Demo Credentials  (password for all: Demo@123)');
  console.log('─────────────────────────────────────────────────────');
  DEMO_USERS.forEach((u) => {
    console.log(`  ${u.role.padEnd(18)} → ${u.email}`);
  });
  console.log('─────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
