const express = require('express');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const { User, ROLES } = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const Salary = require('../models/Salary');

const router = express.Router();

router.use(auth(), requireRole('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : { role: { $in: ['TEACHER', 'ACCOUNTANT'] } };
  const users = await User.find(filter).select('-password');
  const profiles = await StaffProfile.find({ user: { $in: users.map((u) => u._id) } }).populate('branch');
  const map = {};
  profiles.forEach((p) => { map[p.user.toString()] = p; });
  const result = users.map((u) => ({ ...u.toObject(), staffProfile: map[u._id.toString()] || null }));
  res.json(result);
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role, branch, designation, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!['TEACHER', 'ACCOUNTANT'].includes(role)) {
    return res.status(400).json({ message: 'Role must be TEACHER or ACCOUNTANT' });
  }
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role });
  await StaffProfile.create({
    user: user._id,
    branch: branch || null,
    designation: designation || role,
    phone: phone || null,
    joiningDate: new Date(),
  });
  res.status(201).json({ id: user._id });
}));

router.get('/attendance', asyncHandler(async (req, res) => {
  const { staff, from, to } = req.query;
  const filter = {};
  if (staff) filter.staff = staff;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const records = await StaffAttendance.find(filter)
    .populate('staff', 'name email')
    .sort({ date: -1 });
  res.json(records);
}));

router.post('/attendance', asyncHandler(async (req, res) => {
  const { staff, date, status, checkIn, checkOut } = req.body;
  const record = await StaffAttendance.findOneAndUpdate(
    { staff, date: new Date(date) },
    { staff, date: new Date(date), status: status || 'PRESENT', checkIn, checkOut },
    { upsert: true, new: true }
  );
  res.status(201).json(record);
}));

router.get('/salaries', asyncHandler(async (req, res) => {
  const { staff, month, year } = req.query;
  const filter = {};
  if (staff) filter.staff = staff;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  const salaries = await Salary.find(filter)
    .populate('staff', 'name email')
    .populate('branch', 'name')
    .sort({ year: -1, month: -1 });
  res.json(salaries);
}));

router.post('/salaries', asyncHandler(async (req, res) => {
  const salary = await Salary.create(req.body);
  res.status(201).json(await salary.populate(['staff', 'branch']));
}));

router.patch('/salaries/:id', asyncHandler(async (req, res) => {
  const salary = await Salary.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('staff', 'name email')
    .populate('branch', 'name');
  if (!salary) return res.status(404).json({ message: 'Salary record not found' });
  res.json(salary);
}));

module.exports = router;
