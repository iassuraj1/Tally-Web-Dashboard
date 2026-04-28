const mongoose = require('mongoose');

const payrollLineSchema = new mongoose.Schema({
  payHead: { type: mongoose.Schema.Types.ObjectId, ref: 'PayHead', required: true },
  type:    { type: String, enum: ['Earning', 'Deduction', 'Employer Contribution', 'Employee Contribution'] },
  amount:  { type: Number, default: 0 },
}, { _id: false });

const payrollVoucherSchema = new mongoose.Schema({
  company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month:      { type: Number, required: true },
  year:       { type: Number, required: true },
  fromDate:   { type: Date },
  toDate:     { type: Date },
  payDays:    { type: Number, default: 30 },
  lopDays:    { type: Number, default: 0 },
  lines:      [payrollLineSchema],
  grossPay:   { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay:     { type: Number, default: 0 },
  // Statutory
  pfEmployee: { type: Number, default: 0 },
  pfEmployer: { type: Number, default: 0 },
  esicEmployee:{ type: Number, default: 0 },
  esicEmployer:{ type: Number, default: 0 },
  pt:         { type: Number, default: 0 },
  tds:        { type: Number, default: 0 },
  status:     { type: String, enum: ['Draft', 'Processed', 'Paid'], default: 'Draft' },
}, { timestamps: true });

payrollVoucherSchema.index({ company: 1, employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PayrollVoucher', payrollVoucherSchema);
