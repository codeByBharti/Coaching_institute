const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    provider: { type: String, enum: ['ZOOM', 'GOOGLE_MEET'], required: true },
    meetingId: { type: String },
    joinUrl: { type: String, required: true },
    hostUrl: { type: String },
    status: { type: String, enum: ['SCHEDULED', 'CANCELLED'], default: 'SCHEDULED' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveClass', liveClassSchema);

