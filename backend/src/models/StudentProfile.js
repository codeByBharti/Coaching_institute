const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentId: { type: String, unique: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    rollNumber: { type: String },
    photo: { type: String },
    phone: { type: String },
    address: { type: String },
    guardianName: { type: String },
    guardianContact: { type: String },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DROPPED', 'COMPLETED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
