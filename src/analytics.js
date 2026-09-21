// -----------------------------------------------------------------------------
//  Analytics helpers — the SPA is fully client-side and the pages don't fire
//  form-submit or page-view events for GTM to hook. So every conversion the
//  business tracks needs its own named dataLayer push here, and one Custom
//  Event trigger in the GTM container matching that name.
//
//  Named events currently pushed:
//    - booking_submitted   → src/booking.jsx (form for a fitting appointment)
//    - phone_call          → this file, wired on every public `tel:` link
//
//  Both carry no PII: name, phone and email stay out of the dataLayer since
//  any tag in the container can read it. GTM only needs to know "it happened"
//  to fire the Google Ads conversion.
// -----------------------------------------------------------------------------

/** Fire a `phone_call` event so GTM can count taps on the phone number as a
 *  conversion. `source` says which link was tapped so we can see where in the
 *  funnel it happened (footer, product page …), without adding any PII. */
export function trackPhoneCall(source) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'phone_call',
      source: source || 'unknown',
    });
  } catch {}
}
