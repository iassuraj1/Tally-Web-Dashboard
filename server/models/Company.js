const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'accountant' },
    permissions:{ type: [String], default: [] },
    status:   { type: String, enum: ['active', 'disabled'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  }],
  name:           { type: String, required: true, trim: true },
  legalName:      { type: String, trim: true },
  gstin:          { type: String, trim: true },
  pan:            { type: String, trim: true },
  cin:            { type: String, trim: true },
  address:        { type: String },
  city:           { type: String },
  state:          { type: String },
  pincode:        { type: String },
  country:        { type: String, default: 'India' },
  phone:          { type: String },
  email:          { type: String },
  website:        { type: String },
  currency:       { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  branches: [{
    name: { type: String, trim: true },
    code: { type: String, trim: true },
    address: { type: String },
    gstin: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  }],
  currencies: [{
    code: { type: String, trim: true },
    symbol: { type: String, trim: true },
    exchangeRate: { type: Number, default: 1 },
    isBase: { type: Boolean, default: false },
  }],
  tdsTcsEnabled: { type: Boolean, default: false },
  defaultTdsRate: { type: Number, default: 0 },
  defaultTcsRate: { type: Number, default: 0 },
  cloudStorageProvider: { type: String, enum: ['local', 's3', 'gcs', 'azure', ''], default: '' },
  cloudStorageBucket: { type: String },
  financialYearStart: { type: Number, default: 4 }, // month (1-12), April = 4
  activeFinancialYear: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear' },
  financialYearLockingEnabled: { type: Boolean, default: false },
  bookBeginning:  { type: Date },
  logo:           { type: String },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

companySchema.index({ owner: 1, name: 1 });
companySchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Company', companySchema);
