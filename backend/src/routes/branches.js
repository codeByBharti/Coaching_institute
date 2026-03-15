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
  const { name, code, address, phone } = req.body;
  if (!name || !code) return res.status(400).json({ message: 'Branch name and code are required' });
  const codeNorm = String(code || '').trim();
  const existing = await Branch.findOne({ code: codeNorm });
  if (existing) return res.status(409).json({ message: 'Branch code already exists' });
  const branch = await Branch.create({ name: name.trim(), code: codeNorm, address: address || '', phone: phone || '' });
  res.status(201).json(branch);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  res.status(204).send();
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, code, address, phone } = req.body;
  const update = {};
  if (name !== undefined) update.name = String(name).trim();
  if (code !== undefined) update.code = String(code).trim();
  if (address !== undefined) update.address = String(address || '');
  if (phone !== undefined) update.phone = String(phone || '');
  const branch = await Branch.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  res.json(branch);
}));

module.exports = router;
