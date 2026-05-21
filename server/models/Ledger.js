const mongoose = require('../lib/postgresMongoose');

const ledgerSchema = new mongoose.Schema({
  company:      { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:         { type: String, required: true, trim: true },
  group:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  openingBalance:   { type: Number, default: 0 },
  openingBalanceType:{ type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  // GST details
  gstApplicable:{ type: Boolean, default: false },
  gstin:        { type: String },
  gstType:      { type: String, enum: ['Regular', 'Composition', 'Unregistered', 'Consumer', 'Overseas', ''], default: '' },
  // Banking
  bankName:     { type: String },
  accountNo:    { type: String },
  ifscCode:     { type: String },
  // Contact (for party ledgers)
  partyType:     { type: String, enum: ['customer', 'vendor', 'both', ''], default: '' },
  customerType:  { type: String, enum: ['business', 'individual', ''], default: 'business' },
  partyCode:     { type: String, trim: true },
  salutation:    { type: String },
  firstName:     { type: String, trim: true },
  lastName:      { type: String, trim: true },
  companyName:   { type: String, trim: true },
  address:      { type: String },
  billingAddress:{ type: String },
  shippingAddress:{ type: String },
  city:         { type: String },
  state:        { type: String },
  pincode:      { type: String },
  country:      { type: String, default: 'India' },
  workPhoneCountryCode: { type: String, default: '+91' },
  mobileCountryCode: { type: String, default: '+91' },
  phone:        { type: String },
  mobile:       { type: String },
  email:        { type: String },
  website:      { type: String },
  language:     { type: String, default: 'English' },
  pan:          { type: String, trim: true, uppercase: true },
  currency:     { type: String, default: 'INR' },
  receivableAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  payableAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  gstTreatment: { type: String, enum: ['registered', 'composition', 'unregistered', 'consumer', 'overseas', ''], default: '' },
  contactPersons: [{
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  }],
  customFields: [{
    label: { type: String, trim: true },
    value: { type: String },
  }],
  reportingTags: [{
    label: { type: String, trim: true },
    value: { type: String },
  }],
  remarks:       { type: String },
  creditLimit:  { type: Number, default: 0 },
  creditDays:   { type: Number, default: 0 },
  paymentTerms: { type: String },
  portalAccess: { type: Boolean, default: false },
  billByBill:   { type: Boolean, default: false },
  // Tax
  taxRate:      { type: Number, default: 0 },
  isDefault:    { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

ledgerSchema.index({ company: 1, name: 1 }, { unique: true });
ledgerSchema.index({ company: 1, partyType: 1, partyCode: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
