const mongoose = require('mongoose');

const payHeadSchema = new mongoose.Schema({
  company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:       { type: String, required: true, trim: true },
  type:       { type: String, enum: ['Earning', 'Deduction', 'Employer Contribution', 'Employee Contribution'], required: true },
  calcType:   { type: String, enum: ['Fixed', 'Percentage of Basic', 'Percentage of Gross', 'Percentage of CTC', 'As Computed Value'], default: 'Fixed' },
  calcValue:  { type: Number, default: 0 },
  affectsPF:  { type: Boolean, default: false },
  affectsESIC:{ type: Boolean, default: false },
  ledger:     { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  isDefault:  { type: Boolean, default: false },
}, { timestamps: true });

payHeadSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('PayHead', payHeadSchema);
