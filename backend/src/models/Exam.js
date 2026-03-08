const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionType: { type: String, enum: ['MCQ', 'THEORY'], required: true },
    text: { type: String, required: true },
    options: [{ type: String }], // for MCQ
    correctOptionIndex: { type: Number }, // for MCQ
    maxMarks: { type: Number }, // for THEORY
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    date: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    type: {
      type: String,
      enum: ['MCQ', 'UPLOAD_PAPER', 'MCQ_THEORY'],
      default: 'MCQ',
    },
    questions: [questionSchema],
    questionPaperUrl: { type: String },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const examResultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    marksObtained: { type: Number, required: true },
    grade: { type: String },
    rank: { type: Number },
  },
  { timestamps: true }
);

examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = {
  Exam: mongoose.model('Exam', examSchema),
  ExamResult: mongoose.model('ExamResult', examResultSchema),
};
