import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true },
  phone:     { type: String, default: '' },
  type:      { type: String, default: '' },
  location:  { type: String, default: '' },
  date:      { type: String, default: '' },
  time:      { type: String, default: '' },
  dressRefs: [String],
  budget:    { type: String, default: '' },
  notes:     { type: String, default: '' },
  status:    { type: String, enum: ['new', 'confirmed', 'cancelled'], default: 'new' },
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
