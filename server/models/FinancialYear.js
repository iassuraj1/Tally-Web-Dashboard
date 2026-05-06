const mongoose = require('mongoose');

const financialYearSchema = new mongoose.Schema({
  company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:       { type: String, required: true, trim: true },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  isActive:   { type: Boolean, default: false },
  isLocked:   { type: Boolean, default: false },
  lockReason: { type: String, trim: true },
  lockedAt:   { type: Date },
  lockedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

financialYearSchema.pre('validate', function validateDateRange(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'Financial year end date must be after start date');
  }
  next();
});

financialYearSchema.index({ company: 1, startDate: 1, endDate: 1 });
financialYearSchema.index({ company: 1, isActive: 1 });
financialYearSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FinancialYear', financialYearSchema);
