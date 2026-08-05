import mongoose from 'mongoose';

// One marketing touch — the UTM tags / ad-click ids / referrer captured at a
// visit. Strings are length-capped at the API layer; kept loose here so a new
// UTM field never rejects a booking.
const touchSchema = new mongoose.Schema({
  source:   { type: String, default: '' },
  medium:   { type: String, default: '' },
  campaign: { type: String, default: '' },
  content:  { type: String, default: '' },
  term:     { type: String, default: '' },
  gclid:    { type: String, default: '' },
  fbclid:   { type: String, default: '' },
  referrer: { type: String, default: '' },
  landing:  { type: String, default: '' },
  ts:       { type: String, default: '' },
}, { _id: false });

const attributionSchema = new mongoose.Schema({
  first:     { type: touchSchema, default: undefined }, // acquisition source
  last:      { type: touchSchema, default: undefined }, // source right before booking
  label:     { type: String, default: '' },             // human-readable first-touch
  lastLabel: { type: String, default: '' },             // set only when last ≠ first
}, { _id: false });

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
  attribution: { type: attributionSchema, default: undefined },
  status:    { type: String, enum: ['new', 'confirmed', 'cancelled'], default: 'new' },
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
