const mongoose = require('../lib/postgresMongoose');

const commentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  entityType: { type: String, enum: ['Voucher', 'Ledger'], required: true },
  entity: { type: mongoose.Schema.Types.ObjectId, required: true },
  body: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

commentSchema.index({ company: 1, entityType: 1, entity: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
