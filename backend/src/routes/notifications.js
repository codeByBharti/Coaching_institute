const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { User } = require('../models/User');

const router = express.Router();

// Admin can send notification to a single user
router.post(
  '/',
  auth(),
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { user, title, message, type } = req.body;
    const notif = await Notification.create({ user, title, message, type });
    res.status(201).json(notif);
  })
);

// Admin can broadcast to students/teachers/accountants
router.post(
  '/broadcast',
  auth(),
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { scope, title, message, type } = req.body; // scope: 'STUDENTS' | 'TEACHERS' | 'ACCOUNTANTS' | 'ALL'

    let roles = [];
    if (scope === 'STUDENTS') roles = ['STUDENT'];
    else if (scope === 'TEACHERS') roles = ['TEACHER'];
    else if (scope === 'ACCOUNTANTS') roles = ['ACCOUNTANT'];
    else roles = ['STUDENT', 'TEACHER', 'ACCOUNTANT'];

    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
    const docs = users.map((u) => ({
      user: u._id,
      title,
      message,
      type: type || 'GENERAL',
    }));

    const created = await Notification.insertMany(docs);
    res.status(201).json({ count: created.length });
  })
);

// Authenticated user can see their own notifications
router.get(
  '/',
  auth(),
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  })
);

module.exports = router;

