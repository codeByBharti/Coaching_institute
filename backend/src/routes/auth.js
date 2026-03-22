const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const StaffProfile = require('../models/StaffProfile');
const asyncHandler = require('../utils/asyncHandler');
const { auth } = require('../middleware/auth');
const { generateStudentId } = require('../utils/studentId');

const router = express.Router();

function signToken(user) {
  const payload = { id: user._id, role: user.role };
  const secret = process.env.JWT_SECRET || 'changeme';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

// Strict registration with role-specific profiles
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      password,
      role,
      // student
      branch,
      batch,
      course,
      courses,
      // teacher
      subjects,
      specialization,
      // accountant
      department,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      const match = await bcrypt.compare(password, existing.password);
      if (match) {
        const token = signToken(existing);
        return res.json({
          token,
          user: {
            id: existing._id,
            name: existing.name,
            email: existing.email,
            role: existing.role,
          },
        });
      }
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Role-specific required fields (only Student needs branch, batch, course)
    if (role === 'STUDENT') {
      if (!branch || !batch || (!course && !Array.isArray(courses))) {
        return res
          .status(400)
          .json({ message: 'Student must have branch, batch and at least one course' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
    });

    // Create role-specific profile
    if (role === 'STUDENT') {
      const selectedCourse = course || (Array.isArray(courses) ? courses[0] : null);
      await StudentProfile.create({
        user: user._id,
        studentId: await generateStudentId(branch),
        branch,
        batch,
        course: selectedCourse,
        status: 'ACTIVE',
      });
    } else if (role === 'TEACHER') {
      await StaffProfile.create({
        user: user._id,
        branch: branch || null,
        designation: 'TEACHER',
        subjects: Array.isArray(subjects) ? subjects : subjects ? [subjects] : [],
        specialization: specialization || null,
      });
    } else if (role === 'ACCOUNTANT') {
      await StaffProfile.create({
        user: user._id,
        branch: branch || null,
        designation: 'ACCOUNTANT',
        department: department || null,
      });
    } else if (role === 'ADMIN') {
      // No extra profile required; admin is determined solely by role
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message:
          'Your account has been deactivated by the institute. Please contact the administration.',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

router.get(
  '/me',
  auth(),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    let studentProfile = null;
    let staffProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await StudentProfile.findOne({ user: user._id })
        .populate('branch', 'name code address')
        .populate('course', 'name code')
        .populate('batch', 'name code');
    }
    if (user.role === 'TEACHER' || user.role === 'ACCOUNTANT') {
      staffProfile = await StaffProfile.findOne({ user: user._id })
        .populate('branch', 'name code')
        .populate('batch', 'name code');
    }
    res.json({ user, studentProfile, staffProfile });
  })
);

module.exports = router;

