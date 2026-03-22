const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    receiptNo: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'OVERDUE', 'PARTIAL'], default: 'PENDING' },
    paymentDate: { type: Date },
    method: { type: String, enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'], default: 'CASH' },
    reference: { type: String },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeePayment', feePaymentSchema);
