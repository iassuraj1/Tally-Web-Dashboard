const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  owner:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  financialYearStart: { type: Number, default: 4 }, // month (1-12), April = 4
  bookBeginning:  { type: Date },
  logo:           { type: String },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
