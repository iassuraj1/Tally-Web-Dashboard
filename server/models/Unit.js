const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:     { type: String, required: true, trim: true },
  symbol:   { type: String, required: true, trim: true },
  type:     { type: String, enum: ['Simple', 'Compound'], default: 'Simple' },
  // For compound units: e.g. 1 Box = 12 Pcs
  baseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  conversion:{ type: Number },
  decimalPlaces: { type: Number, default: 2 },
  isDefault:{ type: Boolean, default: false },
}, { timestamps: true });

unitSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Unit', unitSchema);
