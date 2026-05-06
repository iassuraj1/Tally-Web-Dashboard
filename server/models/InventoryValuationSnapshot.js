const mongoose = require('mongoose');

const inventoryValuationSnapshotSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  asOfDate: { type: Date, required: true },
  valuationMethod: { type: String, enum: ['FIFO', 'Weighted Average', 'Standard Cost'], required: true },
  closingQty: { type: Number, default: 0 },
  closingRate: { type: Number, default: 0 },
  closingValue: { type: Number, default: 0 },
  layers: [{
    qty: Number,
    rate: Number,
    source: String,
    date: Date,
  }],
}, { timestamps: true });

inventoryValuationSnapshotSchema.index({ company: 1, item: 1, asOfDate: -1, valuationMethod: 1 });

module.exports = mongoose.model('InventoryValuationSnapshot', inventoryValuationSnapshotSchema);
