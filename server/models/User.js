import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name:     { type: String, required: true, trim: true },
  role:     { type: String, enum: ['admin', 'editor'], default: 'editor' },
  active:   { type: Boolean, default: true },

  // 2FA via email
  twoFAEnabled:        { type: Boolean, default: false },
  twoFACodeHash:       { type: String, default: null },
  twoFACodeExpiresAt:  { type: Date,   default: null },
  twoFAAttempts:       { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFACodeHash;
  delete obj.twoFACodeExpiresAt;
  delete obj.twoFAAttempts;
  return obj;
};

export default mongoose.model('User', userSchema);
