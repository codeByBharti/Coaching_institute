const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const FeePayment = require('../models/FeePayment');
const { User } = require('../models/User');
const StudentProfile = require('../models/StudentProfile');

const router = express.Router();

router.use(auth(), requireRole('ACCOUNTANT', 'ADMIN'));

function generateReceiptNo() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP${y}${m}${r}`;
}

router.post('/fees', asyncHandler(async (req, res) => {
  const { student, studentId, amount, dueDate, status, paymentDate, method, reference, branch } = req.body;

  let studentUser = null;
  if (studentId) {
    const profile = await StudentProfile.findOne({ studentId });
    if (!profile) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    studentUser = await User.findById(profile.user);
  } else {
    studentUser = await User.findById(student);
  }

  if (!studentUser || studentUser.role !== 'STUDENT') {
    return res.status(400).json({ message: 'Invalid student' });
  }

  const receiptNo = generateReceiptNo();
  const fee = await FeePayment.create({
    student: studentUser._id,
    branch: branch || null,
    receiptNo,
    amount,
    dueDate,
    status: status || 'PENDING',
    paymentDate,
    method: method || 'CASH',
    reference,
  });
  res.status(201).json(await fee.populate('student', 'name email'));
}));

router.patch('/fees/:id', asyncHandler(async (req, res) => {
  const update = { ...req.body };
  const existing = await FeePayment.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Fee record not found' });

  // If marking as PAID and no receipt yet, generate one
  if (update.status === 'PAID' && !existing.receiptNo) {
    update.receiptNo = generateReceiptNo();
    if (!update.paymentDate) {
      update.paymentDate = new Date();
    }
  }

  const fee = await FeePayment.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('student', 'name email');
  if (!fee) return res.status(404).json({ message: 'Fee record not found' });
  res.json(fee);
}));

router.get('/fees', asyncHandler(async (req, res) => {
  const { student } = req.query;
  const filter = student ? { student } : {};
  const fees = await FeePayment.find(filter)
    .populate('student', 'name email')
    .sort({ dueDate: -1 });
  res.json(fees);
}));

router.get('/fee-history/:studentId', asyncHandler(async (req, res) => {
  const fees = await FeePayment.find({ student: req.params.studentId })
    .sort({ dueDate: -1 });
  res.json(fees);
}));

module.exports = router;
