const mongoose = require('mongoose');

// A single line in an accounting voucher (debit/credit entry)
const entrySchema = new mongoose.Schema({
  ledger:     { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  type:       { type: String, enum: ['Dr', 'Cr'], required: true },
  amount:     { type: Number, required: true, min: 0 },
  narration:  { type: String },
  costCentre: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCentre' },
  project:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  billRef:    { type: String },
  billAmount: { type: Number },
}, { _id: false });

// Stock line in a sales/purchase invoice
const stockLineSchema = new mongoose.Schema({
  item:       { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  godown:     { type: mongoose.Schema.Types.ObjectId, ref: 'Godown' },
  qty:        { type: Number, required: true },
  unit:       { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  rate:       { type: Number, required: true },
  amount:     { type: Number, required: true },
  discount:   { type: Number, default: 0 },
  discountPct:{ type: Number, default: 0 },
  hsnCode:    { type: String },
  gstRate:    { type: Number, default: 0 },
  cgst:       { type: Number, default: 0 },
  sgst:       { type: Number, default: 0 },
  igst:       { type: Number, default: 0 },
  cess:       { type: Number, default: 0 },
  batchNo:    { type: String },
  expiry:     { type: Date },
  serialNumbers:{ type: [String], default: [] },
}, { _id: false });

const voucherSchema = new mongoose.Schema({
  company:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  voucherType:  {
    type: String,
    enum: ['Sales', 'Purchase', 'Payment', 'Receipt', 'Journal', 'Contra',
           'CreditNote', 'DebitNote', 'StockJournal', 'DeliveryNote', 'ReceiptNote'],
    required: true,
  },
  voucherNo:    { type: String, required: true },
  date:         { type: Date, required: true },
  reference:    { type: String },
  narration:    { type: String },
  branch:       { type: String },
  currency:     { type: String, default: 'INR' },
  exchangeRate: { type: Number, default: 1 },
  // Accounting entries
  entries:      [entrySchema],
  // Stock items (for Sales/Purchase/StockJournal)
  items:        [stockLineSchema],
  // Party details (for Sales/Purchase)
  party:        { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  partyGstin:   { type: String },
  // GST
  placeOfSupply:{ type: String },
  isIGST:       { type: Boolean, default: false },
  reverseCharge:{ type: Boolean, default: false },
  // Invoice totals
  subtotal:     { type: Number, default: 0 },
  totalDiscount:{ type: Number, default: 0 },
  totalCGST:    { type: Number, default: 0 },
  totalSGST:    { type: Number, default: 0 },
  totalIGST:    { type: Number, default: 0 },
  totalCess:    { type: Number, default: 0 },
  tdsAmount:    { type: Number, default: 0 },
  tcsAmount:    { type: Number, default: 0 },
  roundOff:     { type: Number, default: 0 },
  total:        { type: Number, default: 0 },
  baseTotal:    { type: Number, default: 0 },
  // e-Invoice
  irn:          { type: String },
  ackNo:        { type: String },
  ackDate:      { type: Date },
  eInvoiceStatus:{ type: String, enum: ['NotGenerated', 'Generated', 'Cancelled', ''], default: '' },
  signedInvoice:{ type: String },
  signedQRCode: { type: String },
  ewaybill:     { type: String },
  ewayBillNo:   { type: String },
  ewayBillDate: { type: Date },
  ewayBillValidUntil:{ type: Date },
  // E-way bill transport readiness
  transportMode:{ type: String, enum: ['Road', 'Rail', 'Air', 'Ship', ''], default: '' },
  transporterName:{ type: String },
  transporterId:{ type: String },
  transporterDocNo:{ type: String },
  transporterDocDate:{ type: Date },
  vehicleNo:    { type: String },
  vehicleType:  { type: String, enum: ['Regular', 'Over Dimensional Cargo', ''], default: '' },
  distance:     { type: Number, default: 0 },
  // Flags
  status:       { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Submitted' },
  submittedAt:  { type: Date },
  submittedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:   { type: Date },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt:   { type: Date },
  rejectedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason:{ type: String },
  isCancelled:  { type: Boolean, default: false },
  cancelReason: { type: String },
  isAmended:    { type: Boolean, default: false },
  amendedFrom:  { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  isRecurringGenerated: { type: Boolean, default: false },
  recurringTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringVoucher' },
}, { timestamps: true });

voucherSchema.index({ company: 1, voucherType: 1, voucherNo: 1 }, { unique: true });
voucherSchema.index({ company: 1, date: -1 });
voucherSchema.index({ company: 1, status: 1, date: -1 });
voucherSchema.index({ company: 1, 'entries.project': 1, date: -1 });

module.exports = mongoose.model('Voucher', voucherSchema);
