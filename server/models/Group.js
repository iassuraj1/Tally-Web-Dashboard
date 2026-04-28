const mongoose = require('mongoose');

// Mirror of Tally's Account Groups hierarchy
const groupSchema = new mongoose.Schema({
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:        { type: String, required: true, trim: true },
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  nature:      { type: String, enum: ['Assets', 'Liabilities', 'Income', 'Expenses'], required: true },
  affectsGross:{ type: Boolean, default: false }, // used for Gross Profit computation
  isDefault:   { type: Boolean, default: false }, // pre-loaded Tally groups
  isPrimary:   { type: Boolean, default: false }, // top-level group
}, { timestamps: true });

groupSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);
