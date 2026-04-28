const mongoose = require('mongoose');

const costCentreSchema = new mongoose.Schema({
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:     { type: String, required: true, trim: true },
  parent:   { type: mongoose.Schema.Types.ObjectId, ref: 'CostCentre', default: null },
  category: { type: String },
}, { timestamps: true });

costCentreSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CostCentre', costCentreSchema);
