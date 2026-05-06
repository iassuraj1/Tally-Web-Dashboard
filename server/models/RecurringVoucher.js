const mongoose = require('mongoose');

const recurringVoucherSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['recurring_invoice', 'subscription'], default: 'recurring_invoice' },
  voucherType: {
    type: String,
    enum: ['Sales', 'Purchase', 'Payment', 'Receipt', 'Journal', 'Contra', 'CreditNote', 'DebitNote'],
    default: 'Sales',
  },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  sourceVoucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  template: { type: mongoose.Schema.Types.Mixed, default: {} },
  frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
  nextRunDate: { type: Date, required: true },
  endDate: { type: Date },
  autoSubmit: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastGeneratedAt: { type: Date },
  lastGeneratedVoucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

recurringVoucherSchema.index({ company: 1, isActive: 1, nextRunDate: 1 });
recurringVoucherSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('RecurringVoucher', recurringVoucherSchema);
