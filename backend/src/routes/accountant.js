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
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });
  if (!dueDate) return res.status(400).json({ message: 'Due date is required' });

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

  const feeStatus = status || 'PENDING';
  const fee = await FeePayment.create({
    student: studentUser._id,
    branch: branch || null,
    receiptNo: feeStatus === 'PAID' ? generateReceiptNo() : undefined,
    amount,
    dueDate: new Date(dueDate),
    status: feeStatus,
    paymentDate: feeStatus === 'PAID' ? (paymentDate ? new Date(paymentDate) : new Date()) : undefined,
    method: method || 'CASH',
    reference,
  });
  res.status(201).json(await fee.populate('student', 'name email'));
}));

router.patch('/fees/:id', asyncHandler(async (req, res) => {
  const { status, paymentDate, method, reference } = req.body;
  const update = {};
  if (status !== undefined) update.status = status;
  if (paymentDate !== undefined) update.paymentDate = paymentDate ? new Date(paymentDate) : null;
  if (method !== undefined) update.method = method;
  if (reference !== undefined) update.reference = reference;
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
