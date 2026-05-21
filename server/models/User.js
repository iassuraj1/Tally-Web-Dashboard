const mongoose = require('../lib/postgresMongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'accountant', 'viewer'], default: 'admin' },
  companies:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  emailVerificationSentAt: { type: Date },
  lastLoginAt: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
