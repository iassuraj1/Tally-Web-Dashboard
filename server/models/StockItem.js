const mongoose = require('../lib/postgresMongoose');

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
  valuationMethod:{ type: String, enum: ['FIFO', 'Weighted Average', 'Standard Cost'], default: 'Weighted Average' },
  standardCost:   { type: Number, default: 0 },
  costPrice:      { type: Number, default: 0 },
  sellingPrice:   { type: Number, default: 0 },
  mrp:            { type: Number, default: 0 },
  // Opening stock
  openingQty:     { type: Number, default: 0 },
  openingRate:    { type: Number, default: 0 },
  openingGodown:  { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
  // Live stock balance. Opening stock is preserved; this is updated by stock-posting vouchers.
  currentQty:      { type: Number, default: 0 },
  currentRate:     { type: Number, default: 0 },
  currentValue:    { type: Number, default: 0 },
  lastStockMovementAt:{ type: Date },
  stockSyncedAt:   { type: Date },
  // Settings
  maintainBatch:  { type: Boolean, default: false },
  trackExpiry:    { type: Boolean, default: false },
  reorderLevel:   { type: Number, default: 0 },
  minimumStock:   { type: Number, default: 0 },
  maximumStock:   { type: Number, default: 0 },
  reorderQty:     { type: Number, default: 0 },
  description:    { type: String },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

stockItemSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StockItem', stockItemSchema);
