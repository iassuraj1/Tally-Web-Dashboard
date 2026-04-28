const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  company:        { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:           { type: String, required: true, trim: true },
  group:          { type: mongoose.Schema.Types.ObjectId, ref: 'StockGroup' },
  unit:           { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  alternateUnit:  { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  // GST
  hsnCode:        { type: String, trim: true },
  gstRate:        { type: Number, default: 0 },
  cessRate:       { type: Number, default: 0 },
  taxability:     { type: String, enum: ['Taxable', 'Exempt', 'Nil Rated', 'Non-GST'], default: 'Taxable' },
  // Pricing
  costPrice:      { type: Number, default: 0 },
  sellingPrice:   { type: Number, default: 0 },
  mrp:            { type: Number, default: 0 },
  // Opening stock
  openingQty:     { type: Number, default: 0 },
  openingRate:    { type: Number, default: 0 },
  openingGodown:  { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
  // Settings
  maintainBatch:  { type: Boolean, default: false },
  trackExpiry:    { type: Boolean, default: false },
  reorderLevel:   { type: Number, default: 0 },
  reorderQty:     { type: Number, default: 0 },
  description:    { type: String },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

stockItemSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StockItem', stockItemSchema);
