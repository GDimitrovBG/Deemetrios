import mongoose from 'mongoose';

// Same shape as Booking's touchSchema — kept in sync deliberately: the
// dashboard uses the same label logic for both, and a phone call and a booking
// from the same visitor should attribute the same way.
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
  first:     { type: touchSchema, default: undefined },
  last:      { type: touchSchema, default: undefined },
  label:     { type: String, default: '' },
  lastLabel: { type: String, default: '' },
}, { _id: false });

// A tap on a tel: link. No PII: we can't know the caller — only where on the
// site they were and how they got there. That is enough to answer "how many
// calls came from paid ads?" alongside the booking-form conversions.
const phoneCallSchema = new mongoose.Schema({
  // Where on the SPA the link lives: 'footer' (contact popover) or 'product'
  // (Обади се button on a dress page). Kept open so a future call-to-action
  // can add its own source without a schema migration.
  source:      { type: String, default: 'unknown', maxlength: 40 },
  // The pathname the user was on when they tapped, e.g. '/product/1500'.
  // Helps break down calls by page in the dashboard.
  page:        { type: String, default: '', maxlength: 500 },
  attribution: { type: attributionSchema, default: undefined },
}, { timestamps: true });

// Recent-first queries are the whole read pattern (dashboard list + counts),
// so an index on createdAt keeps the sort cheap once the table grows.
phoneCallSchema.index({ createdAt: -1 });

export default mongoose.model('PhoneCall', phoneCallSchema);
