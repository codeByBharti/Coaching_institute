const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const LiveClass = require('../models/LiveClass');
const { Exam, ExamResult } = require('../models/Exam');
const Attendance = require('../models/Attendance');
const { uploadBuffer } = require('../services/storage');
const ExamAttempt = require('../models/ExamAttempt');

const router = express.Router();
const upload = multer();

router.use(auth(), requireRole('TEACHER'));

// Create a live class (Zoom / Google Meet link managed manually for now)
router.post(
  '/live-classes',
  asyncHandler(async (req, res) => {
    const { title, subject, scheduledAt, durationMinutes, provider, joinUrl, hostUrl } =
      req.body;
    const liveClass = await LiveClass.create({
      title,
      subject,
      teacher: req.user.id,
      scheduledAt,
      durationMinutes,
      provider,
      joinUrl,
      hostUrl,
    });
    res.status(201).json(liveClass);
  })
);

router.get(
  '/live-classes',
  asyncHandler(async (req, res) => {
    const classes = await LiveClass.find({ teacher: req.user.id }).sort({ scheduledAt: -1 });
    res.json(classes);
  })
);

// Cancel a live class
router.patch(
  '/live-classes/:id/cancel',
  asyncHandler(async (req, res) => {
    const cls = await LiveClass.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      { status: 'CANCELLED' },
      { new: true }
    );
    if (!cls) return res.status(404).json({ message: 'Class not found' });
    res.json(cls);
  })
);

// Exams
router.post(
  '/exams',
  asyncHandler(async (req, res) => {
    const { title, subject, totalMarks, date, type, durationMinutes, questions } = req.body;

    const examType = type || 'MCQ';

    let normalizedQuestions = [];
    if (Array.isArray(questions)) {
      normalizedQuestions = questions.map((q) => ({
        questionType: q.questionType || 'MCQ',
        text: q.text,
        options: q.options || [],
        correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : undefined,
        maxMarks: q.maxMarks,
      }));
    }

    const exam = await Exam.create({
      title,
      subject,
      totalMarks,
      date,
      durationMinutes: durationMinutes || 60,
      type: examType,
      questions: normalizedQuestions,
      createdBy: req.user.id,
    });
    res.status(201).json(exam);
  })
);

// Create exam with uploaded question paper
router.post(
  '/exams/upload-paper',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Question paper file is required' });
    }
    const { title, subject, totalMarks, date, durationMinutes } = req.body;
    const { buffer, mimetype, originalname } = req.file;
    const uploaded = await uploadBuffer(buffer, mimetype, originalname, 'exam-papers');

    const exam = await Exam.create({
      title,
      subject,
      totalMarks,
      date,
      durationMinutes: durationMinutes || 60,
      type: 'UPLOAD_PAPER',
      questionPaperUrl: uploaded.url,
      createdBy: req.user.id,
    });

    res.status(201).json(exam);
  })
);

router.get(
  '/exams',
  asyncHandler(async (req, res) => {
    const exams = await Exam.find({ createdBy: req.user.id }).sort({ date: -1 });
    res.json(exams);
  })
);

// Delete exam (removes from teacher and student dashboards)
router.delete(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    await ExamResult.deleteMany({ exam: exam._id });
    await ExamAttempt.deleteMany({ exam: exam._id });
    await Exam.deleteOne({ _id: exam._id });
    res.status(204).send();
  })
);

// Attempts (for exams created by this teacher)
router.get(
  '/exam-attempts',
  asyncHandler(async (req, res) => {
    const myExams = await Exam.find({ createdBy: req.user.id }).select('_id');
    const examIds = myExams.map((e) => e._id);
    if (examIds.length === 0) return res.json([]);

    const attempts = await ExamAttempt.find({ exam: { $in: examIds } })
      .populate('exam', 'title subject type')
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    res.json(attempts);
  })
);

router.post(
  '/exams/:examId/results',
  asyncHandler(async (req, res) => {
    const { student, studentId, marksObtained, grade } = req.body;
    const examId = req.params.examId;
    let studentRef = student;
    if (studentId && !studentRef) {
      const StudentProfile = require('../models/StudentProfile');
      const profile = await StudentProfile.findOne({ studentId });
      if (!profile) {
        return res.status(400).json({ message: 'Invalid student ID' });
      }
      studentRef = profile.user;
    }
    const result = await ExamResult.findOneAndUpdate(
      { exam: examId, student: studentRef },
      { marksObtained, grade },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(result);
  })
);

// Attendance marking for a given date
router.post(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { records, date, classId } = req.body;
    const attendanceDate = date ? new Date(date) : new Date();

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Attendance records required' });
    }

    const StudentProfile = require('../models/StudentProfile');
    const ops = records.map(async (r) => {
      let studentRef = r.student;
      let profile = null;
      if (r.studentId && !studentRef) {
        profile = await StudentProfile.findOne({ studentId: r.studentId });
        if (!profile) {
          throw new Error(`Invalid student ID: ${r.studentId}`);
        }
        studentRef = profile.user;
      } else if (studentRef) {
        profile = await StudentProfile.findOne({ user: studentRef });
      }
      return Attendance.findOneAndUpdate(
        { student: studentRef, date: attendanceDate },
        {
          student: studentRef,
          date: attendanceDate,
          status: r.status || 'PRESENT',
          batch: profile?.batch || null,
          classId: classId || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    const results = await Promise.all(ops);
    res.status(201).json(results);
  })
);

module.exports = router;

