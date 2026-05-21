const mongoose = require('../lib/postgresMongoose');

const counterSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  scope:   { type: String, required: true },
  seq:     { type: Number, default: 0 },
}, { timestamps: true });

counterSchema.index({ company: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
