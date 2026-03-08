const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Branch = require('../models/Branch');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const FeePayment = require('../models/FeePayment');
const { Exam, ExamResult } = require('../models/Exam');
const LiveClass = require('../models/LiveClass');
const RecordedLecture = require('../models/RecordedLecture');
const Notification = require('../models/Notification');
const Homework = require('../models/Homework');
const { generateStudentId } = require('./studentId');

async function ensureDemoBranch() {
  let branch = await Branch.findOne({ code: 'MAIN' });
  if (!branch) {
    branch = await Branch.create({ name: 'Main Branch', code: 'MAIN', address: 'Demo Address', phone: '1234567890' });
  }
  return branch;
}

async function ensureDemoCourse(branch) {
  let course = await Course.findOne({ code: 'JEE', branch: branch._id });
  if (!course) {
    course = await Course.create({
      name: 'JEE Preparation',
      code: 'JEE',
      branch: branch._id,
      durationMonths: 24,
      feeAmount: 50000,
    });
  }
  return course;
}

async function ensureDemoBatch(course, branch) {
  let batch = await Batch.findOne({ code: 'B1', course: course._id });
  if (!batch) {
    batch = await Batch.create({
      name: 'Batch A',
      code: 'B1',
      course: course._id,
      branch: branch._id,
      startDate: new Date(),
      isActive: true,
    });
  }
  return batch;
}

async function ensureDemoTeacher() {
  let teacher = await User.findOne({ email: 'demo-teacher@example.com' });
  if (!teacher) {
    const hashed = await bcrypt.hash('password', 10);
    teacher = await User.create({
      name: 'Demo Teacher',
      email: 'demo-teacher@example.com',
      password: hashed,
      role: 'TEACHER',
    });
  }
  return teacher;
}

async function seedGlobalDemoContent() {
  const branch = await ensureDemoBranch();
  const course = await ensureDemoCourse(branch);
  const batch = await ensureDemoBatch(course, branch);
  const teacher = await ensureDemoTeacher();

  if ((await LiveClass.countDocuments()) === 0) {
    const now = new Date();
    await LiveClass.create([
      { title: 'Live Math Revision', subject: 'Mathematics', teacher: teacher._id, scheduledAt: new Date(now.getTime() + 60 * 60 * 1000), durationMinutes: 60, provider: 'ZOOM', joinUrl: 'https://zoom.us/j/demo-math' },
      { title: 'Physics Numericals', subject: 'Physics', teacher: teacher._id, scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), durationMinutes: 90, provider: 'GOOGLE_MEET', joinUrl: 'https://meet.google.com/demo-physics' },
    ]);
  }

  if ((await RecordedLecture.countDocuments()) === 0) {
    await RecordedLecture.create([
      { title: 'Algebra Basics', subject: 'Mathematics', teacher: teacher._id, s3Key: 'demo/algebra.mp4', s3Url: 'https://www.w3schools.com/html/mov_bbb.mp4', durationMinutes: 45, isPublic: true },
      { title: 'Newton Laws', subject: 'Physics', teacher: teacher._id, s3Key: 'demo/newton.mp4', s3Url: 'https://www.w3schools.com/html/movie.mp4', durationMinutes: 35, isPublic: true },
      { title: 'Organic Chemistry Intro', subject: 'Chemistry', teacher: teacher._id, s3Key: 'demo/chem.mp4', s3Url: 'https://www.w3schools.com/html/mov_bbb.mp4', durationMinutes: 40, isPublic: true },
    ]);
  }

  if ((await Homework.countDocuments()) === 0) {
    await Homework.create([
      { title: 'Math Assignment 1', subject: 'Mathematics', description: 'Solve problems 1-20', teacher: teacher._id, batch: batch._id, isPublic: true },
      { title: 'Physics Notes', subject: 'Physics', description: 'Chapter 3 summary', teacher: teacher._id, s3Url: 'https://example.com/notes.pdf', isPublic: true },
    ]);
  }

  return { branch, course, batch, teacher };
}

async function createDemoDataForUser(user) {
  const { branch, course, batch, teacher } = await seedGlobalDemoContent();

  if (!user || !ROLES.includes(user.role)) return;

  if (user.role === 'STUDENT') {
    let profile = await StudentProfile.findOne({ user: user._id });
    if (!profile) {
      const studentId = await generateStudentId(branch._id);
      profile = await StudentProfile.create({
        user: user._id,
        studentId,
        branch: branch._id,
        course: course._id,
        batch: batch._id,
        rollNumber: `R${user._id.toString().slice(-4)}`,
        status: 'ACTIVE',
      });
    }

    if ((await Attendance.countDocuments({ student: user._id })) === 0) {
      const today = new Date();
      const docs = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        docs.push({ student: user._id, batch: batch._id, branch: branch._id, date: d, status: i === 1 ? 'ABSENT' : 'PRESENT' });
      }
      await Attendance.insertMany(docs);
    }

    if ((await FeePayment.countDocuments({ student: user._id })) === 0) {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      await FeePayment.create([
        { student: user._id, branch: branch._id, amount: 5000, dueDate: due, status: 'PENDING', method: 'UPI' },
        { student: user._id, branch: branch._id, amount: 5000, dueDate: new Date(due.getTime() - 30 * 24 * 60 * 60 * 1000), status: 'PAID', paymentDate: new Date(), method: 'CASH', receiptNo: `RCP${Date.now().toString().slice(-8)}` },
      ]);
    }

    if ((await ExamResult.countDocuments({ student: user._id })) === 0) {
      const exam = await Exam.create({
        title: 'Demo Math Test',
        subject: 'Mathematics',
        totalMarks: 100,
        date: new Date(),
        branch: branch._id,
        batch: batch._id,
        createdBy: teacher._id,
      });
      await ExamResult.create({ exam: exam._id, student: user._id, marksObtained: 82, grade: 'A', rank: 1 });
    }

    if ((await Notification.countDocuments({ user: user._id })) === 0) {
      await Notification.create([
        { user: user._id, title: 'Welcome', message: 'Sample data for dashboard demo.', type: 'GENERAL' },
        { user: user._id, title: 'Fee Due Soon', message: 'Your next installment is due next week.', type: 'FEE' },
      ]);
    }
  }
}

module.exports = { createDemoDataForUser };
