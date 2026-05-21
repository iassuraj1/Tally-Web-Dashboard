const mongoose = require('../lib/postgresMongoose');

const reconSchema = new mongoose.Schema({
  company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  bankLedger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  voucher:    { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  date:       { type: Date, required: true },
  bankDate:   { type: Date },        // date as per bank statement
  amount:     { type: Number, required: true },
  type:       { type: String, enum: ['Dr', 'Cr'] },
  narration:  { type: String },
  chequeNo:   { type: String },
  isReconciled:{ type: Boolean, default: false },
  reconDate:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('BankReconciliation', reconSchema);
