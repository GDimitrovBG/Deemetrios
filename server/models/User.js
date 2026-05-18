import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:     { type: String, required: true, trim: true },
  role:     { type: String, enum: ['admin', 'editor'], default: 'editor' },
  active:   { type: Boolean, default: true },

  // OTP login via email
  otpHash:       { type: String, default: null },
  otpExpiresAt:  { type: Date,   default: null },
  otpAttempts:   { type: Number, default: 0 },
}, { timestamps: true });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otpHash;
  delete obj.otpExpiresAt;
  delete obj.otpAttempts;
  return obj;
};

export default mongoose.model('User', userSchema);
