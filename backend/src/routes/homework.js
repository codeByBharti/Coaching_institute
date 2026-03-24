const express = require('express');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Homework = require('../models/Homework');
const { deleteKey } = require('../services/storage');
const { mapHomework } = require('../utils/publicUrl');
const { uploadBufferToCloudinary, destroyCloudinaryAsset } = require('../services/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth(), asyncHandler(async (req, res) => {
  const { batch, subject } = req.query;
  const filter = {};
  if (batch) filter.batch = batch;
  if (subject) filter.subject = subject;
  if (req.user.role === 'TEACHER') filter.teacher = req.user.id;
  filter.$or = [{ isPublic: true }, { batch: { $exists: true } }];
  const items = await Homework.find(filter)
    .populate('teacher', 'name')
    .sort({ createdAt: -1 });

  // Map to a consistent shape ({ type, url } etc.) for frontend.
  res.json(items.map((d) => mapHomework(d)));
}));

router.post('/', auth(), requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const url = (req.body.url || req.body.s3Url || '').toString().trim();
  const typeRaw = (req.body.type || req.body.materialType || 'link').toString();
  const type = typeRaw === 'file' ? 'file' : 'link';

  if (!url) return res.status(400).json({ message: 'URL is required' });

  const homework = await Homework.create({
    title: req.body.title,
    subject: req.body.subject,
    description: req.body.description,
    batch: req.body.batch || null,
    teacher: req.user.id,
    // New schema
    type,
    url,
    // Legacy compatibility
    s3Url: url,
    materialType: type,
    isPublic: true,
  });

  res.status(201).json(mapHomework(homework));
}));

router.post('/upload', auth(), requireRole('TEACHER'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File is required' });
  }

  const { title, subject, description, batch } = req.body;
  const { buffer, mimetype, originalname } = req.file;

  let uploaded;
  try {
    uploaded = await uploadBufferToCloudinary(buffer, mimetype, originalname, 'homework');
  } catch (e) {
    console.error('Cloudinary upload failed:', e.message);
    return res.status(500).json({ message: 'File upload failed' });
  }

  console.log('[homework/upload] secure_url:', uploaded?.secure_url);

  // Quick sanity check for stability/debugging:
  // If Cloudinary URL is wrong/private, students will fail to open.
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(uploaded?.secure_url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(t);
    console.log('[homework/upload] url HEAD-ish status:', resp.status);
  } catch (e) {
    // Do not fail upload if sanity check fails; just log.
    console.error('[homework/upload] sanity check failed:', e.message);
  }

  const homework = await Homework.create({
    title,
    subject,
    description,
    batch: batch || null,
    teacher: req.user.id,
    // New schema
    type: 'file',
    url: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
    originalFileName: originalname,
    contentType: mimetype,
    // Legacy compatibility
    s3Url: uploaded.secure_url,
    materialType: 'file',
    isPublic: true,
  });

  res.status(201).json(mapHomework(homework));
}));

// Teacher can delete their uploaded material
router.delete('/:id', auth(), requireRole('TEACHER'), asyncHandler(async (req, res) => {
  const item = await Homework.findOne({ _id: req.params.id, teacher: req.user.id });
  if (!item) return res.status(404).json({ message: 'Study material not found' });
  await Homework.deleteOne({ _id: item._id });

  // Cloudinary deletion (optional - doesn't affect student flow)
  if (item.cloudinaryPublicId) {
    await destroyCloudinaryAsset(item.cloudinaryPublicId);
  } else if (item.s3Key) {
    // Legacy rows (pre-Cloudinary)
    await deleteKey(item.s3Key);
  }
  res.json({ success: true });
}));

module.exports = router;
