const mongoose = require('mongoose');

const staffProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    designation: { type: String },
    phone: { type: String },
    joiningDate: { type: Date },
    subjects: [{ type: String }], // for teachers
    specialization: { type: String }, // for teachers
    department: { type: String }, // for accountants
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffProfile', staffProfileSchema);
