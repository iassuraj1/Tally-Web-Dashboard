const mongoose = require('../lib/postgresMongoose');

const auditLogSchema = new mongoose.Schema({
  company:    { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:     { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  before:     { type: mongoose.Schema.Types.Mixed },
  after:      { type: mongoose.Schema.Types.Mixed },
  metadata:   { type: mongoose.Schema.Types.Mixed },
  ip:         { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ company: 1, createdAt: -1 });
auditLogSchema.index({ company: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
