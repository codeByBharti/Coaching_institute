const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const LiveClass = require('../models/LiveClass');
const RecordedLecture = require('../models/RecordedLecture');
const { uploadBuffer } = require('../services/storage');
const { mapRecordedLecture } = require('../utils/publicUrl');

const router = express.Router();
const upload = multer();

// Public listings with optional auth
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const classes = await LiveClass.find({ scheduledAt: { $gte: now } })
      .populate('teacher', 'name')
      .sort({ scheduledAt: 1 });
    res.json(classes);
  })
);

router.get(
  '/recorded',
  asyncHandler(async (req, res) => {
    const lectures = await RecordedLecture.find({}).populate('teacher', 'name').sort({
      createdAt: -1,
    });
    res.json(lectures.map((d) => mapRecordedLecture(d)));
  })
);

// Allow teachers to add recorded lectures (metadata, when S3 URL already known)
router.post(
  '/recorded',
  auth(),
  requireRole('TEACHER'),
  asyncHandler(async (req, res) => {
    const { title, subject, s3Key, s3Url, durationMinutes, isPublic } = req.body;
    const lecture = await RecordedLecture.create({
      title,
      subject,
      s3Key,
      s3Url,
      durationMinutes,
      isPublic,
      teacher: req.user.id,
    });
    res.status(201).json(mapRecordedLecture(lecture));
  })
);

// Upload video file to S3 and create recorded lecture
router.post(
  '/recorded/upload',
  auth(),
  requireRole('TEACHER'),
  upload.single('video'),
  asyncHandler(async (req, res) => {
    const { title, subject, durationMinutes, isPublic } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const uploaded = await uploadBuffer(buffer, mimetype, originalname, 'lectures', req);

    const lecture = await RecordedLecture.create({
      title,
      subject,
      s3Key: uploaded.key,
      s3Url: uploaded.url,
      durationMinutes,
      isPublic,
      teacher: req.user.id,
    });

    res.status(201).json(mapRecordedLecture(lecture));
  })
);

module.exports = router;

