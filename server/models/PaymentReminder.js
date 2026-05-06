const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  reminderType: { type: String, enum: ['receivable', 'payable'], default: 'receivable' },
  dueDate: { type: Date, required: true },
  nextReminderAt: { type: Date },
  amount: { type: Number, required: true },
  templateName: { type: String },
  subject: { type: String },
  message: { type: String },
  status: { type: String, enum: ['draft', 'scheduled', 'sent', 'failed', 'cancelled'], default: 'draft' },
  lastSentAt: { type: Date },
  sendCount: { type: Number, default: 0 },
  lastError: { type: String },
  history: [{
    sentAt: { type: Date, default: Date.now },
    channel: { type: String, default: 'email' },
    to: String,
    subject: String,
    status: String,
    error: String,
  }],
}, { timestamps: true });

paymentReminderSchema.index({ company: 1, dueDate: 1, status: 1 });
paymentReminderSchema.index({ company: 1, party: 1 });

module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);
