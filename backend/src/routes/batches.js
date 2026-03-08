const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Batch = require('../models/Batch');
const StudentProfile = require('../models/StudentProfile');

const router = express.Router();

router.use(auth(), requireRole('ADMIN', 'TEACHER'));

router.get('/', asyncHandler(async (req, res) => {
  const { branch, course } = req.query;
  const filter = {};
  if (branch) filter.branch = branch;
  if (course) filter.course = course;
  const batches = await Batch.find(filter)
    .populate('branch', 'name code')
    .populate('course', 'name code')
    .sort({ name: 1 });
  res.json(batches);
}));

router.post('/', asyncHandler(async (req, res) => {
  const batch = await Batch.create(req.body);
  res.status(201).json(await batch.populate(['branch', 'course']));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .populate('branch', 'name code')
    .populate('course', 'name code');
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  res.json(batch);
}));

router.post('/:id/allocate', asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ message: 'studentIds array required' });
  }
  const batch = await Batch.findById(req.params.id);
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  await StudentProfile.updateMany(
    { user: { $in: studentIds } },
    { $set: { batch: batch._id, course: batch.course, branch: batch.branch } }
  );
  res.json({ message: 'Students allocated', count: studentIds.length });
}));

module.exports = router;
