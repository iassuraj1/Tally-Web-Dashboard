const mongoose = require('mongoose');

const documentLineSchema = new mongoose.Schema({
  item:        { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem' },
  description: { type: String },
  hsnCode:     { type: String },
  qty:         { type: Number, default: 1 },
  unit:        { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  rate:        { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  gstRate:     { type: Number, default: 0 },
  amount:      { type: Number, default: 0 },
  cgst:        { type: Number, default: 0 },
  sgst:        { type: Number, default: 0 },
  igst:        { type: Number, default: 0 },
  godown:      { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
}, { _id: false });

const workflowDocumentSchema = new mongoose.Schema({
  company:       { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  flow:          { type: String, enum: ['sales', 'purchase'], required: true },
  documentType:  {
    type: String,
    enum: ['Estimate', 'SalesOrder', 'DeliveryNote', 'PurchaseOrder', 'ReceiptNote'],
    required: true,
  },
  documentNo:    { type: String, required: true },
  date:          { type: Date, required: true },
  dueDate:       { type: Date },
  reference:     { type: String },
  party:         { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  billingAddress:{ type: String },
  shippingAddress:{ type: String },
  placeOfSupply: { type: String },
  isIGST:        { type: Boolean, default: false },
  status:        {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'invoiced', 'billed', 'cancelled', 'closed'],
    default: 'draft',
  },
  items:         [documentLineSchema],
  subtotal:      { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalCGST:     { type: Number, default: 0 },
  totalSGST:     { type: Number, default: 0 },
  totalIGST:     { type: Number, default: 0 },
  roundOff:      { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  terms:         { type: String },
  notes:         { type: String },
  convertedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDocument' },
  convertedToVoucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  convertedToDocument:{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDocument' },
}, { timestamps: true });

workflowDocumentSchema.index({ company: 1, documentType: 1, documentNo: 1 }, { unique: true });
workflowDocumentSchema.index({ company: 1, flow: 1, date: -1 });
workflowDocumentSchema.index({ company: 1, party: 1, status: 1 });

module.exports = mongoose.model('WorkflowDocument', workflowDocumentSchema);
