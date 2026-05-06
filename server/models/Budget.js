const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

budgetSchema.index({ company: 1, ledger: 1, periodStart: 1, periodEnd: 1 });
budgetSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
