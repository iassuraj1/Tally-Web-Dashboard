const mongoose = require('../lib/postgresMongoose');

const attachmentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  entityType: { type: String, enum: ['Voucher', 'Ledger'], required: true },
  entity: { type: mongoose.Schema.Types.ObjectId, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number, default: 0 },
  storage: { type: String, enum: ['local', 'url'], default: 'local' },
  path: { type: String },
  url: { type: String },
  note: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

attachmentSchema.index({ company: 1, entityType: 1, entity: 1, createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
