// -----------------------------------------------------------------------------
//  Analytics helpers — the SPA is fully client-side and the pages don't fire
//  form-submit or page-view events for GTM to hook. So every conversion the
//  business tracks needs its own named dataLayer push here, plus a server-side
//  log so the dashboard can show it alongside bookings.
//
//  Named events currently pushed:
//    - booking_submitted   → src/booking.jsx (form for a fitting appointment)
//    - phone_call          → this file, wired on every public `tel:` link
// -----------------------------------------------------------------------------

import { createPhoneCall } from './api';
import { getAttributionPayload } from './attribution';

/** Fire a `phone_call` event so GTM can count taps on the phone number as a
 *  conversion, AND log it server-side with attribution so the dashboard can
 *  break down calls by source alongside bookings. Fire-and-forget: the client
 *  has already opened the dialer; if the log POST fails, we just lose one row. */
export function trackPhoneCall(source) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'phone_call',
      source: source || 'unknown',
    });
  } catch {}
  try {
    createPhoneCall({
      source: source || 'unknown',
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      attribution: getAttributionPayload(),
    }).catch(() => {});
  } catch {}
}
