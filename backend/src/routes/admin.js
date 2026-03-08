const express = require('express');
const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const FeePayment = require('../models/FeePayment');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const LiveClass = require('../models/LiveClass');
const Notification = require('../models/Notification');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const Salary = require('../models/Salary');
const { Exam, ExamResult } = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const { generateStudentId } = require('../utils/studentId');

const router = express.Router();

router.use(auth(), requireRole('ADMIN'));

router.post('/users', asyncHandler(async (req, res) => {
  const { name, email, password, role, branch, course, batch, phone, guardianName, guardianContact, studentId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role });
  if (role === 'STUDENT') {
    const finalStudentId = studentId || (branch ? await generateStudentId(branch) : `STU${Date.now().toString().slice(-6)}`);
    await StudentProfile.create({
      user: user._id,
      studentId: finalStudentId,
      branch: branch || null,
      course: course || null,
      batch: batch || null,
      rollNumber: `R${user._id.toString().slice(-4)}`,
      phone: phone || null,
      guardianName: guardianName || null,
      guardianContact: guardianContact || null,
      status: 'ACTIVE',
    });
  }
  res.status(201).json({ id: user._id });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).select('-password');
  const studentIds = users.filter((u) => u.role === 'STUDENT').map((u) => u._id);
  const profiles = await StudentProfile.find({ user: { $in: studentIds } })
    .populate('branch', 'name code')
    .populate('course', 'name code')
    .populate('batch', 'name code');
  const profileMap = {};
  profiles.forEach((p) => { profileMap[p.user.toString()] = p; });

  // Fee status per student (latest)
  const feeStatusMap = {};
  if (studentIds.length > 0) {
    const latestFees = await FeePayment.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { dueDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$student',
          status: { $first: '$status' },
        },
      },
    ]);
    latestFees.forEach((f) => {
      feeStatusMap[f._id.toString()] = f.status || 'NONE';
    });
  }

  const result = users.map((u) => ({
    ...u.toObject(),
    studentProfile: u.role === 'STUDENT' ? profileMap[u._id.toString()] || null : null,
    feeStatus: u.role === 'STUDENT' ? feeStatusMap[u._id.toString()] || 'NONE' : undefined,
  }));
  res.json(result);
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  let profile = null;
  if (user.role === 'STUDENT') {
    profile = await StudentProfile.findOne({ user: user._id })
      .populate('branch', 'name code address')
      .populate('course', 'name code')
      .populate('batch', 'name code');
  }
  res.json({ user, profile });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!isActive }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

router.patch('/students/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'INACTIVE', 'DROPPED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.params.id },
    { status },
    { new: true }
  ).populate(['branch', 'course', 'batch']);
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });
  res.json(profile);
}));

// Update student academic profile (studentId, branch, course, batch)
router.patch('/students/:id/profile', asyncHandler(async (req, res) => {
  const { studentId, branch, course, batch } = req.body;
  const update = {};
  if (studentId) update.studentId = studentId;
  if (branch !== undefined) update.branch = branch || null;
  if (course !== undefined) update.course = course || null;
  if (batch !== undefined) update.batch = batch || null;

  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.params.id },
    { $set: update },
    { new: true }
  ).populate(['branch', 'course', 'batch']);

  if (!profile) return res.status(404).json({ message: 'Student profile not found' });
  res.json(profile);
}));

// Update a user's basic details and role profile
router.patch('/users/:id', asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  await user.save();

  if (user.role === 'STUDENT') {
    const { studentId, branch, course, batch, phone, guardianName, guardianContact, status } = req.body;
    const update = {};
    if (studentId) update.studentId = studentId;
    if (branch !== undefined) update.branch = branch || null;
    if (course !== undefined) update.course = course || null;
    if (batch !== undefined) update.batch = batch || null;
    if (phone !== undefined) update.phone = phone || null;
    if (guardianName !== undefined) update.guardianName = guardianName || null;
    if (guardianContact !== undefined) update.guardianContact = guardianContact || null;
    if (status !== undefined) update.status = status;
    await StudentProfile.findOneAndUpdate({ user: user._id }, { $set: update }, { new: true });
  } else if (['TEACHER', 'ACCOUNTANT'].includes(user.role)) {
    const { branch, phone, designation, subjects, specialization, department } = req.body;
    const update = { user: user._id };
    if (branch !== undefined) update.branch = branch || null;
    if (phone !== undefined) update.phone = phone || null;
    if (designation !== undefined) update.designation = designation || user.role;
    if (subjects !== undefined) update.subjects = subjects;
    if (specialization !== undefined) update.specialization = specialization;
    if (department !== undefined) update.department = department;
    await StaffProfile.findOneAndUpdate(
      { user: user._id },
      { $set: update },
      { upsert: true, new: true }
    );
  }

  res.json({ success: true });
}));

// Hard delete a user (and student profile if any)
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.role === 'STUDENT') {
    await StudentProfile.deleteOne({ user: user._id });
    await Attendance.deleteMany({ student: user._id });
    await FeePayment.deleteMany({ student: user._id });
    await ExamResult.deleteMany({ student: user._id });
    await ExamAttempt.deleteMany({ student: user._id });
    await Notification.deleteMany({ user: user._id });
  } else if (user.role === 'TEACHER') {
    await StaffProfile.deleteOne({ user: user._id });
    await StaffAttendance.deleteMany({ staff: user._id });
    await Salary.deleteMany({ staff: user._id });
    await LiveClass.deleteMany({ teacher: user._id });
    await Homework.deleteMany({ teacher: user._id });

    const exams = await Exam.find({ createdBy: user._id }).select('_id');
    const examIds = exams.map((e) => e._id);
    await Exam.deleteMany({ createdBy: user._id });
    if (examIds.length) {
      await ExamResult.deleteMany({ exam: { $in: examIds } });
      await ExamAttempt.deleteMany({ exam: { $in: examIds } });
    }
    await Notification.deleteMany({ user: user._id });
  } else if (user.role === 'ACCOUNTANT') {
    await StaffProfile.deleteOne({ user: user._id });
    await StaffAttendance.deleteMany({ staff: user._id });
    await Salary.deleteMany({ staff: user._id });
    await Notification.deleteMany({ user: user._id });
  }

  await User.deleteOne({ _id: user._id });
  res.json({ success: true });
}));

router.get('/dashboard-summary', asyncHandler(async (req, res) => {
  const countsByRole = {};
  for (const role of ROLES) {
    countsByRole[role] = await User.countDocuments({ role });
  }
  const totalUsers =
    (countsByRole.STUDENT || 0) +
    (countsByRole.TEACHER || 0) +
    (countsByRole.ACCOUNTANT || 0);
  res.json({ totalUsers, countsByRole });
}));

module.exports = router;
