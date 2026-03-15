const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Course = require('../models/Course');

const router = express.Router();

router.use(auth(), requireRole('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const filter = branch ? { branch } : {};
  const courses = await Course.find(filter).populate('branch', 'name code').sort({ name: 1 });
  res.json(courses);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, code, branch, durationMonths, feeAmount } = req.body;
  if (!name || !code || !branch) return res.status(400).json({ message: 'Course name, code and branch are required' });
  const course = await Course.create({
    name: name.trim(),
    code: code.trim(),
    branch,
    durationMonths: durationMonths ? Number(durationMonths) : undefined,
    feeAmount: feeAmount ? Number(feeAmount) : 0,
  });
  res.status(201).json(await course.populate('branch', 'name code'));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.status(204).send();
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, code, branch, durationMonths, feeAmount } = req.body;
  const update = {};
  if (name !== undefined) update.name = String(name).trim();
  if (code !== undefined) update.code = String(code).trim();
  if (branch !== undefined) update.branch = branch || null;
  if (durationMonths !== undefined) update.durationMonths = Number(durationMonths) || undefined;
  if (feeAmount !== undefined) update.feeAmount = Number(feeAmount) || 0;
  const course = await Course.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).populate('branch', 'name code');
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

module.exports = router;
