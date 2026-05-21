const mongoose = require('../lib/postgresMongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tagline: { type: String },
  description: { type: String, required: true },
  features: [String],
  price: { type: String },
  category: { type: String, enum: ['accounting', 'payroll', 'inventory', 'gst', 'banking'] },
  image: { type: String },
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
