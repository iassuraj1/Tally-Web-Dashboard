const mongoose = require('mongoose');

const webhookEndpointSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  events: { type: [String], default: ['voucher.created'] },
  secret: { type: String },
  isActive: { type: Boolean, default: true },
  lastDeliveryStatus: { type: String },
  lastDeliveredAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

webhookEndpointSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
