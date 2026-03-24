const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    // Production schema (preferred)
    type: { type: String, enum: ['link', 'file'], default: 'file' },
    url: { type: String },
    cloudinaryPublicId: { type: String },
    // Preserve original filename/extension for correct OS "Open with" behavior.
    originalFileName: { type: String },
    contentType: { type: String },

    // Legacy fields (kept for backward compatibility with existing DB rows)
    s3Key: { type: String },
    s3Url: { type: String },
    materialType: { type: String, enum: ['link', 'file'], default: 'file' },
    dueDate: { type: Date },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Homework', homeworkSchema);
