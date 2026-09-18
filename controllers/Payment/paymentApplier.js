'use strict';
/**
 * The money path: decide what a terminal payment does to an AIMS invoice.
 * No mongoose here — the store is injected, so test/selfcheck.js exercises the real
 * decisions (match, ambiguity, duplicate re-delivery, void, refund) against a fake store.
 */
const { dayBounds, chooseInvoice } = require('./matchLogic');

const isReversal = (p) => ['VOIDED', 'REFUNDED'].includes(p.status) || ['VOID', 'REFUND'].includes(p.action);
// only captured money books an invoice — an AUTH holds funds but hasn't moved them
const isSale = (p) => p.status === 'CAPTURED';

/**
 * @param payment normalised terminal payment (see payments/poynt.js normalizeTransaction)
 * @param store   {findPayment, upsertPayment, patchPayment, findUnpaidInWindow, findUnpaidByAmount, markPaid, markUnpaid}
 */
async function applyPayment(payment, store) {
  if (!payment?.poyntTxnId || typeof payment.amountCents !== 'number') {
    throw Object.assign(new Error('payment.poyntTxnId and amountCents are required'), { status: 400 });
  }

  const existing = await store.findPayment(payment.poyntTxnId);
  if (existing && (existing.matched || existing.status === payment.status)) {
    return { duplicate: true, matched: Boolean(existing.matched), invoiceId: existing.invoiceId || null };
  }

  const doc = await store.upsertPayment(payment);

  // reversals first: a void/refund must never fall into the "unmatched" queue
  if (isReversal(payment)) {
    const original = payment.parentId
      ? await store.findPayment(payment.parentId)
      : await store.findPayment(payment.poyntTxnId);
    const match = original?.matched ? original : await store.findMatchedOriginal(payment);
    if (!match?.invoiceId) return { reversal: true, reversed: false, reason: 'no matched original' };

    await store.patchPayment(match.id || match.poyntTxnId, { reversedAt: new Date() });
    if (payment.status === 'VOIDED') {          // funds never moved -> invoice goes back to Unpaid
      await store.markUnpaid(match.invoiceId);
      return { reversal: true, reversed: true, voided: true, invoiceId: match.invoiceId };
    }
    // refund: the sale did happen, money left the merchant — leave the invoice Paid, flag for a human
    return { reversal: true, reversed: true, refunded: true, invoiceId: match.invoiceId, needsAttention: true };
  }

  if (!isSale(payment)) {
    return { skipped: true, reason: `status ${payment.status} / action ${payment.action}` };
  }

  const at = new Date(payment.occurredAt || Date.now());
  const { start, end } = dayBounds(at);
  const sameDay = await store.findUnpaidInWindow({ start, end });
  const sameDayIds = new Set(sameDay.map((i) => String(i._id)));
  const recent = await store.findUnpaidByAmount(payment.amountCents / 100, {
    from: new Date(at.getTime() - 30 * 864e5),
    to: new Date(at.getTime() + 864e5),
  });

  const byId = new Map();
  for (const inv of sameDay) byId.set(String(inv._id), { ...inv, __sameDay: true });
  for (const inv of recent) if (!byId.has(String(inv._id))) byId.set(String(inv._id), { ...inv, __sameDay: sameDayIds.has(String(inv._id)) });

  const { invoice, method } = chooseInvoice([...byId.values()], payment);
  if (!invoice) {
    return { matched: false, matchMethod: 'unmatched', candidates: byId.size, paymentId: String(doc.id ?? doc._id) };
  }

  await store.markPaid(invoice._id);
  await store.patchPayment(payment.poyntTxnId, {
    invoiceId: String(invoice._id), patientId: invoice.pId || null,
    matched: true, matchMethod: method, reversedAt: null,
  });
  return { matched: true, invoiceId: String(invoice._id), patientId: invoice.pId || null, matchMethod: method };
}

module.exports = { applyPayment, isReversal, isSale };
