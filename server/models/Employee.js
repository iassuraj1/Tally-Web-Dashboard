const mongoose = require('../lib/postgresMongoose');

const employeeSchema = new mongoose.Schema({
  company:       { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  empCode:       { type: String, trim: true },
  name:          { type: String, required: true, trim: true },
  designation:   { type: String },
  department:    { type: String },
  dateOfJoining: { type: Date },
  dateOfLeaving: { type: Date },
  // Identity
  pan:           { type: String },
  aadhar:        { type: String },
  uan:           { type: String }, // PF
  esicNo:        { type: String },
  // Bank
  bankName:      { type: String },
  accountNo:     { type: String },
  ifsc:          { type: String },
  // Pay structure
  salaryMode:    { type: String, enum: ['Monthly', 'Daily', 'Weekly'], default: 'Monthly' },
  ctc:           { type: Number, default: 0 },
  basic:         { type: Number, default: 0 },
  hra:           { type: Number, default: 0 },
  // Statutory
  pfApplicable:  { type: Boolean, default: true },
  esicApplicable:{ type: Boolean, default: false },
  ptApplicable:  { type: Boolean, default: false },
  // Address
  address:       { type: String },
  phone:         { type: String },
  email:         { type: String },
  gender:        { type: String, enum: ['Male', 'Female', 'Other'] },
  dob:           { type: Date },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

employeeSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
