const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const Branch = require('../models/Branch');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

const router = express.Router();

// Public metadata for registration and landing pages

router.get(
  '/branches',
  asyncHandler(async (req, res) => {
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  })
);

router.get(
  '/courses',
  asyncHandler(async (req, res) => {
    const { branch } = req.query;
    const filter = branch ? { branch } : {};
    const courses = await Course.find(filter).populate('branch', 'name code').sort({ name: 1 });
    res.json(courses);
  })
);

router.get(
  '/batches',
  asyncHandler(async (req, res) => {
    const { branch, course } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (course) filter.course = course;
    const batches = await Batch.find(filter)
      .populate('branch', 'name code')
      .populate('course', 'name code')
      .sort({ name: 1 });
    res.json(batches);
  })
);

module.exports = router;

