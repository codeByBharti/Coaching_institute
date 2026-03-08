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
  const course = await Course.create(req.body);
  res.status(201).json(await course.populate('branch', 'name code'));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('branch', 'name code');
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

module.exports = router;
