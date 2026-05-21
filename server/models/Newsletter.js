const mongoose = require('../lib/postgresMongoose');

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  subscribed: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', newsletterSchema);
