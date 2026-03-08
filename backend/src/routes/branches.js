const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { auth, requireRole } = require('../middleware/auth');
const Branch = require('../models/Branch');

const router = express.Router();

router.use(auth(), requireRole('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  const branches = await Branch.find().sort({ name: 1 });
  res.json(branches);
}));

router.post('/', asyncHandler(async (req, res) => {
  const branch = await Branch.create(req.body);
  res.status(201).json(branch);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  res.json(branch);
}));

module.exports = router;
