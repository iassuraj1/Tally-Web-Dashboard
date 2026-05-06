const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  manager: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  budgetAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Planned', 'Active', 'Completed', 'On Hold'], default: 'Active' },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
}, { timestamps: true });

projectSchema.index({ company: 1, name: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
projectSchema.index({ company: 1, status: 1, isActive: 1 });

module.exports = mongoose.model('Project', projectSchema);
