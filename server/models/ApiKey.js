const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  prefix: { type: String, required: true },
  keyHash: { type: String, required: true },
  last4: { type: String, required: true },
  scopes: { type: [String], default: ['read'] },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  lastUsedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revokedAt: { type: Date },
}, { timestamps: true });

apiKeySchema.index({ company: 1, prefix: 1 }, { unique: true });
apiKeySchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
