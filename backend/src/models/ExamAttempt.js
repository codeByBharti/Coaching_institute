const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, default: Date.now },
    // For MCQ/THEORY attempts
    answers: { type: mongoose.Schema.Types.Mixed },
    // For upload-paper attempts
    answerSheetKey: { type: String },
    answerSheetUrl: { type: String },
    answerSheetOriginalFileName: { type: String },
    answerSheetContentType: { type: String },
  },
  { timestamps: true }
);

examAttemptSchema.index({ exam: 1, student: 1, submittedAt: -1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

