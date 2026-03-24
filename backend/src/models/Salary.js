const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    amount: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Allow multiple salary records for same staff/month/year when admin needs duplicates.
salarySchema.index({ staff: 1, month: 1, year: 1 });

module.exports = mongoose.model('Salary', salarySchema);
