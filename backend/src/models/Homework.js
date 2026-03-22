const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    s3Key: { type: String },
    /** Canonical URL for link or uploaded file (same as API responses' `url`) */
    s3Url: { type: String },
    materialType: { type: String, enum: ['link', 'file'], default: 'file' },
    dueDate: { type: Date },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Homework', homeworkSchema);
