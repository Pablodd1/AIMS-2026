'use strict';
/**
 * Pure matching logic for terminal payments — no database, no framework, so it can be
 * checked directly (test/selfcheck.js). The controller wires these to Mongo.
 *
 * Money rule: never guess. Two invoices with the same amount = a human assigns it.
 */

const CLINIC_TZ = process.env.CLINIC_TZ || 'America/New_York';

/** Offset of `tz` from UTC, in minutes, at the given instant. */
function tzOffsetMinutes(date, tz = CLINIC_TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour === '24' ? 0 : p.hour, p.minute, p.second);
  return (date.getTime() - asUTC) / 60000;
}

/**
 * Calendar-day window (clinic local time) containing `instant`.
 * ponytail: single-pass offset, so a DST change inside the window shifts it by an hour —
 * irrelevant for a 12h match window; revisit only if same-day precision ever matters.
 */
function dayBounds(instant, tz = CLINIC_TZ) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
  const guess = new Date(`${ymd}T00:00:00Z`);
  const start = new Date(guess.getTime() + tzOffsetMinutes(guess, tz) * 60000);
  return { start, end: new Date(start.getTime() + 864e5) };
}

/**
 * Choose the invoice a card payment belongs to.
 * candidates: [{_id, subTotal, pId, __sameDay}]
 * -> {invoice|null, method}
 */
function chooseInvoice(candidates, payment) {
  if (!candidates || !candidates.length) return { invoice: null, method: 'unmatched' };

  if (payment.reference) {
    const byRef = candidates.find((c) => String(c._id) === String(payment.reference)
      || String(c.docId) === String(payment.reference)
      || String(c.pId) === String(payment.reference));
    if (byRef) return { invoice: byRef, method: 'reference' };
  }

  const amount = payment.amountCents / 100;
  const exact = candidates.filter((c) => Math.abs(Number(c.subTotal) - amount) < 0.005);
  if (exact.length === 1) {
    return { invoice: exact[0], method: exact[0].__sameDay ? 'exact_amount_same_day' : 'exact_amount_recent' };
  }
  return { invoice: null, method: 'unmatched' };   // 0 matches, or ambiguous
}

module.exports = { CLINIC_TZ, tzOffsetMinutes, dayBounds, chooseInvoice };
