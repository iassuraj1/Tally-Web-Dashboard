const mongoose = require('../lib/postgresMongoose');

const bankStatementLineSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  bankLedger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  statementDate: { type: Date, required: true },
  narration: { type: String },
  chequeNo: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  statementType: { type: String, enum: ['Dr', 'Cr'] },
  type: { type: String, enum: ['Dr', 'Cr'], required: true },
  balance: { type: Number },
  matchedVoucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
  matchScore: { type: Number, default: 0 },
  matchType: { type: String, enum: ['auto', 'manual', ''], default: '' },
  status: { type: String, enum: ['imported', 'matched', 'reconciled', 'ignored'], default: 'imported' },
  sourceFile: { type: String },
  importBatchId: { type: String },
  fingerprint: { type: String },
  raw: { type: Object },
}, { timestamps: true });

bankStatementLineSchema.index({ company: 1, bankLedger: 1, statementDate: 1 });
bankStatementLineSchema.index({ company: 1, matchedVoucher: 1 });
bankStatementLineSchema.index({ company: 1, bankLedger: 1, fingerprint: 1 });

module.exports = mongoose.model('BankStatementLine', bankStatementLineSchema);
