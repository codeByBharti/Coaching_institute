const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const LiveClass = require('../models/LiveClass');
const RecordedLecture = require('../models/RecordedLecture');
const Attendance = require('../models/Attendance');
const { Exam, ExamResult } = require('../models/Exam');
const Notification = require('../models/Notification');
const FeePayment = require('../models/FeePayment');
const Homework = require('../models/Homework');
const StudentProfile = require('../models/StudentProfile');
const { User } = require('../models/User');
const ExamAttempt = require('../models/ExamAttempt');
const multer = require('multer');
const { uploadBuffer } = require('../services/storage');
const {
  mapHomework,
  mapExam,
  mapExamAttempt,
  mapRecordedLecture,
} = require('../utils/publicUrl');

const router = express.Router();
const upload = multer();

router.use(auth(), requireRole('STUDENT'));

router.get(
  '/live-classes',
  asyncHandler(async (req, res) => {
    const classes = await LiveClass.find({})
      .populate('teacher', 'name')
      .sort({ scheduledAt: 1 });
    res.json(classes);
  })
);

router.get(
  '/recorded-lectures',
  asyncHandler(async (req, res) => {
    const lectures = await RecordedLecture.find({}).populate('teacher', 'name').sort({ createdAt: -1 });
    res.json(lectures.map((d) => mapRecordedLecture(d)));
  })
);

router.get(
  '/homework',
  asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    const or = [{ isPublic: true }];
    if (profile?.batch) {
      or.push({ batch: profile.batch });
    }
    const items = await Homework.find({ $or: or })
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });
    res.json(items.map((d) => mapHomework(d)));
  })
);

router.get(
  '/fee-history',
  asyncHandler(async (req, res) => {
    const fees = await FeePayment.find({ student: req.user.id }).sort({ dueDate: -1 });
    res.json(fees);
  })
);

router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const records = await Attendance.find({ student: req.user.id }).sort({ date: 1 });
    res.json(records);
  })
);

router.get(
  '/exam-results',
  asyncHandler(async (req, res) => {
    const results = await ExamResult.find({ student: req.user.id })
      .populate({
        path: 'exam',
        populate: { path: 'createdBy', select: 'name' },
      })
      .sort({ createdAt: -1 });
    res.json(results);
  })
);

router.get(
  '/exams',
  asyncHandler(async (req, res) => {
    const exams = await Exam.find({})
      .populate('createdBy', 'name')
      .sort({ date: 1 });
    res.json(exams.map((e) => mapExam(e)));
  })
);

// List exams the current student has already attempted
router.get(
  '/exams/attempts',
  asyncHandler(async (req, res) => {
    const attempts = await ExamAttempt.find({ student: req.user.id })
      .select('exam')
      .lean();
    res.json(attempts);
  })
);

// Submit an exam attempt (MCQ / MCQ+THEORY)
router.post(
  '/exams/:examId/attempts',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const existing = await ExamAttempt.findOne({ exam: exam._id, student: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already attempted this exam.' });
    }

    const attempt = await ExamAttempt.create({
      exam: exam._id,
      student: req.user.id,
      answers: req.body?.answers || {},
      submittedAt: new Date(),
    });
    res.status(201).json(attempt);
  })
);

// Submit upload-paper exam answer sheet
router.post(
  '/exams/:examId/attempts/upload-answer',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.type !== 'UPLOAD_PAPER') {
      return res.status(400).json({ message: 'This exam is not an upload-paper exam' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Answer sheet file is required' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const uploaded = await uploadBuffer(buffer, mimetype, originalname, 'exam-answers', req);

    const existing = await ExamAttempt.findOne({ exam: exam._id, student: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already attempted this exam.' });
    }

    const attempt = await ExamAttempt.create({
      exam: exam._id,
      student: req.user.id,
      submittedAt: new Date(),
      answerSheetKey: uploaded.key,
      answerSheetUrl: uploaded.url,
    });
    res.status(201).json(mapExamAttempt(attempt));
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(notifications);
  })
);

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  })
);

// Update own profile (basic fields)
router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const { name, phone, address, guardianName, guardianContact } = req.body;

    // Update User name if provided
    if (name) {
      await User.findByIdAndUpdate(req.user.id, { name });
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          phone: phone ?? undefined,
          address: address ?? undefined,
          guardianName: guardianName ?? undefined,
          guardianContact: guardianContact ?? undefined,
        },
      },
      { new: true, upsert: false }
    )
      .populate('branch', 'name code address')
      .populate('course', 'name code')
      .populate('batch', 'name code');

    const user = await User.findById(req.user.id).select('-password');

    res.json({ user, studentProfile: profile });
  })
);

module.exports = router;

