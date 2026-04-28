const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  company:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:         { type: String, required: true, trim: true },
  group:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  openingBalance:   { type: Number, default: 0 },
  openingBalanceType:{ type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  // GST details
  gstApplicable:{ type: Boolean, default: false },
  gstin:        { type: String },
  gstType:      { type: String, enum: ['Regular', 'Composition', 'Unregistered', 'Consumer', 'Overseas', ''], default: '' },
  // Banking
  bankName:     { type: String },
  accountNo:    { type: String },
  ifscCode:     { type: String },
  // Contact (for party ledgers)
  address:      { type: String },
  phone:        { type: String },
  email:        { type: String },
  creditLimit:  { type: Number, default: 0 },
  creditDays:   { type: Number, default: 0 },
  // Tax
  taxRate:      { type: Number, default: 0 },
  isDefault:    { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

ledgerSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
