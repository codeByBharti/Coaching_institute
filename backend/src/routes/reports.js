const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const { Exam, ExamResult } = require('../models/Exam');
const FeePayment = require('../models/FeePayment');
const Batch = require('../models/Batch');

const router = express.Router();

router.use(auth(), requireRole('ADMIN', 'TEACHER', 'ACCOUNTANT', 'STUDENT'));

router.get('/attendance-summary', asyncHandler(async (req, res) => {
  const { from, to, batch } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (batch) filter.batch = batch;
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$student',
        totalDays: { $sum: 1 },
        presentDays: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
      },
    },
    {
      $project: {
        student: '$_id',
        _id: 0,
        totalDays: 1,
        presentDays: 1,
        attendancePercent: {
          $cond: [
            { $eq: ['$totalDays', 0] },
            0,
            { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] },
          ],
        },
      },
    },
  ];
  const summary = await Attendance.aggregate(pipeline);
  res.json(summary);
}));

router.get('/attendance-batch-wise', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$batch',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'batches', localField: '_id', foreignField: '_id', as: 'batchDoc' } },
    {
      $project: {
        batch: { $ifNull: [{ $arrayElemAt: ['$batchDoc.name', 0] }, 'Unassigned'] },
        _id: 0,
        total: 1,
        present: 1,
        percent: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
          ],
        },
      },
    },
  ];
  const result = await Attendance.aggregate(pipeline);
  res.json(result);
}));

router.get('/attendance-monthly', asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const m = month ? Number(month) : new Date().getMonth() + 1;
  const y = year ? Number(year) : new Date().getFullYear();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const pipeline = [
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, present: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ];
  const result = await Attendance.aggregate(pipeline);
  res.json(result);
}));

router.get('/exam-performance', asyncHandler(async (req, res) => {
  const pipeline = [
    { $group: { _id: '$exam', avgMarks: { $avg: '$marksObtained' }, maxMarks: { $max: '$marksObtained' }, count: { $sum: 1 } } },
  ];
  const stats = await ExamResult.aggregate(pipeline);
  res.json(stats);
}));

router.get('/ranks', asyncHandler(async (req, res) => {
  const { exam } = req.query;
  const filter = exam ? { exam } : {};
  const results = await ExamResult.find(filter)
    .populate('exam', 'title subject totalMarks')
    .populate('student', 'name email')
    .sort({ marksObtained: -1 });
  const withRank = results.map((r, i) => ({ ...r.toObject(), rank: i + 1 }));
  res.json(withRank);
}));

router.get('/fee-status', asyncHandler(async (req, res) => {
  const pipeline = [
    { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
  ];
  const stats = await FeePayment.aggregate(pipeline);
  res.json(stats);
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const totalStudents = await require('../models/User').User.countDocuments({ role: 'STUDENT' });
  const totalStaff = await require('../models/User').User.countDocuments({ role: { $in: ['TEACHER', 'ACCOUNTANT'] } });
  const totalBatches = await Batch.countDocuments();
  const pendingFees = await FeePayment.aggregate([
    { $match: { status: 'PENDING' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const paidThisMonth = await FeePayment.aggregate([
    { $match: { status: 'PAID', paymentDate: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  res.json({
    totalStudents,
    totalStaff,
    totalBatches,
    pendingFeeAmount: pendingFees[0]?.total || 0,
    paidThisMonth: paidThisMonth[0]?.total || 0,
  });
}));

module.exports = router;
