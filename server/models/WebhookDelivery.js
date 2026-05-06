const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  endpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookEndpoint', required: true },
  event: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['success', 'failed'], required: true },
  statusCode: { type: Number },
  responseBody: { type: String },
  error: { type: String },
  deliveredAt: { type: Date, default: Date.now },
}, { timestamps: true });

webhookDeliverySchema.index({ company: 1, endpoint: 1, deliveredAt: -1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
