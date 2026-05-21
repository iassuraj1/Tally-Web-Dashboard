const mongoose = require('../lib/postgresMongoose');

const godownSchema = new mongoose.Schema({
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:     { type: String, required: true, trim: true },
  parent:   { type: mongoose.Schema.Types.ObjectId, ref: 'Godown', default: null },
  address:  { type: String },
  isDefault:{ type: Boolean, default: false },
}, { timestamps: true });

godownSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Godown', godownSchema);
