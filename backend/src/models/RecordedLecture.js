const mongoose = require('mongoose');

const recordedLectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    durationMinutes: { type: Number },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecordedLecture', recordedLectureSchema);

