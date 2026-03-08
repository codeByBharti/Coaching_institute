const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Homework = require('../models/Homework');
const { uploadBuffer, deleteKey } = require('../services/storage');

const router = express.Router();
const upload = multer();

router.get('/', auth(), asyncHandler(async (req, res) => {
  const { batch, subject } = req.query;
  const filter = {};
  if (batch) filter.batch = batch;
  if (subject) filter.subject = subject;
  if (req.user.role === 'TEACHER') filter.teacher = req.user.id;
  filter.$or = [{ isPublic: true }, { batch: { $exists: true } }];
  const items = await Homework.find(filter).populate('teacher', 'name').sort({ createdAt: -1 });
  res.json(items);
}));

router.post('/', auth(), requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const homework = await Homework.create({ ...req.body, teacher: req.user.id });
  res.status(201).json(homework);
}));

router.post('/upload', auth(), requireRole('TEACHER'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }
  const { title, subject, description, batch } = req.body;
  const { buffer, mimetype, originalname } = req.file;
  const uploaded = await uploadBuffer(buffer, mimetype, originalname, 'homework');

  const homework = await Homework.create({
    title,
    subject,
    description,
    batch: batch || null,
    teacher: req.user.id,
    s3Key: uploaded.key,
    s3Url: uploaded.url,
    isPublic: true,
  });

  res.status(201).json(homework);
}));

// Teacher can delete their uploaded material
router.delete('/:id', auth(), requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const item = await Homework.findOne({ _id: req.params.id, teacher: req.user.id });
  if (!item) return res.status(404).json({ message: 'Study material not found' });
  await Homework.deleteOne({ _id: item._id });
  if (item.s3Key) {
    await deleteKey(item.s3Key);
  }
  res.json({ success: true });
}));

module.exports = router;
