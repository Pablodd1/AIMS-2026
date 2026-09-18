const asyncHandler = require('express-async-handler');
const Invoice = require('../../models/Invoice');
const TerminalPayment = require('../../models/TerminalPayment');
const Patient = require('../../models/Patients');
const { applyPayment } = require('./paymentApplier');
const { CLINIC_TZ, tzOffsetMinutes, dayBounds, chooseInvoice } = require('./matchLogic');

/* ------------------------------------------------------------------ Mongo-backed store
 * The only place that touches the database. All decisions live in paymentApplier.js.
 */
const store = {
  findPayment: (poyntTxnId) => TerminalPayment.findOne({ poyntTxnId }).lean(),
  upsertPayment: (p) => TerminalPayment.findOneAndUpdate(
    { poyntTxnId: p.poyntTxnId },
    {
      $set: {
        parentId: p.parentId || null,
        source: p.source || 'poynt',
        eventType: p.eventType || null,
        action: p.action || null,
        status: p.status || null,
        amountCents: p.amountCents,
        tipCents: p.tipCents || 0,
        currency: p.currency || 'USD',
        cardBrand: p.cardBrand || null,
        cardLast4: p.cardLast4 || null,
        cardHolderName: p.cardHolderName || null,
        deviceId: p.deviceId || null,
        storeId: p.storeId || null,
        orderId: p.orderId || null,
        reference: p.reference || null,
        occurredAt: new Date(p.occurredAt || Date.now()),
        raw: p,
        matched: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).then((d) => d.toObject()),
  patchPayment: (poyntTxnId, patch) => TerminalPayment.updateOne({ poyntTxnId }, { $set: patch }),
  findUnpaidInWindow: ({ start, end }) => Invoice.find({ status: 'Unpaid', createdAt: { $gte: start, $lte: end } }).lean(),
  findUnpaidByAmount: (amount, { from, to }) => Invoice.find({
    status: 'Unpaid', subTotal: amount, createdAt: { $gte: from, $lte: to },
  }).lean(),
  markPaid: (invoiceId) => Invoice.updateOne({ _id: invoiceId }, { $set: { status: 'Paid' } }),
  markUnpaid: (invoiceId) => Invoice.updateOne({ _id: invoiceId }, { $set: { status: 'Unpaid' } }),
  // refund/void whose parentId is missing: last matched payment on the same device for the same amount
  findMatchedOriginal: (p) => TerminalPayment.findOne({
    matched: true,
    deviceId: p.deviceId,
    amountCents: p.amountCents,
    reversedAt: null,
    occurredAt: { $gte: new Date(new Date(p.occurredAt || Date.now()).getTime() - 3 * 864e5) },
  }).sort({ occurredAt: -1 }).lean().then((d) => (d ? { ...d, id: String(d._id) } : null)),
};

/* ------------------------------------------------------------------ HTTP handlers */

/** Called by the payment service for every webhook event and every polled transaction. */
const recordTerminalPayment = asyncHandler(async (req, res) => {
  const { payment, eventType, source } = req.body || {};
  try {
    const result = await applyPayment({ ...payment, source, eventType }, store);
    return res.json({ response: true, ...result });
  } catch (e) {
    return res.status(e.status || 500).json({ response: false, error: e.message });
  }
});

const getUnmatchedPayments = asyncHandler(async (req, res) => {
  const unmatched = await TerminalPayment.find({ matched: false, status: { $nin: ['VOIDED', 'REFUNDED'] } })
    .sort({ occurredAt: -1 }).limit(Number(req.query.limit) || 100).lean();
  const refunded = await TerminalPayment.find({ reversedAt: { $ne: null }, status: 'REFUNDED' })
    .sort({ occurredAt: -1 }).limit(50).lean();
  res.json({ response: true, unmatched, refunded });
});

/**
 * Human resolves a payment. Two modes:
 *   { paymentId, invoiceId }  — attach to an existing invoice and mark it Paid.
 *   { paymentId, patientId }  — no invoice yet (doctor ran the card, no front desk): reuse
 *     an unpaid invoice for that patient at that amount, or create one, then mark it Paid.
 * In both cases the payment is linked to the patient, so it shows in their chart.
 */
const assignPayment = asyncHandler(async (req, res) => {
  const { paymentId, invoiceId, patientId } = req.body || {};
  const payment = await TerminalPayment.findById(paymentId);
  if (!payment) return res.status(404).json({ response: false, error: 'payment not found' });

  let invoice;
  if (invoiceId) {
    invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ response: false, error: 'invoice not found' });
  } else if (patientId) {
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ response: false, error: 'patient not found' });
    const subTotal = payment.amountCents / 100;
    invoice = await Invoice.findOne({ pId: String(patient._id), subTotal, status: 'Unpaid' }).sort({ createdAt: -1 });
    if (!invoice) {
      invoice = await Invoice.create({
        docId: req.user,
        pId: String(patient._id),
        item: [{ itemName: 'Card payment', itemQuantity: 1, Price: subTotal }],
        subTotal,
        userTimezone: patient.userTimezone || 'America/New_York',
      });
    }
  } else {
    return res.status(400).json({ response: false, error: 'invoiceId or patientId is required' });
  }

  payment.invoiceId = String(invoice._id);
  payment.patientId = String(invoice.pId);
  payment.matched = true;
  payment.matchMethod = 'manual';
  payment.reversedAt = null;
  await payment.save();
  await Invoice.updateOne({ _id: invoice._id }, { $set: { status: 'Paid' } });
  res.json({ response: true, paymentId: String(payment._id), invoiceId: String(invoice._id), patientId: String(invoice.pId) });
});

/** Recent terminal payments for reconciliation. patientName is resolved so the desk sees who paid. */
const getTerminalPayments = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const payments = await TerminalPayment.find({}).sort({ occurredAt: -1 }).limit(limit).lean();
  const pids = [...new Set(payments.map((p) => p.patientId).filter(Boolean))];
  const patients = pids.length
    ? await Patient.find({ _id: { $in: pids } }).select('fullName').lean()
    : [];
  const nameById = new Map(patients.map((p) => [String(p._id), p.fullName]));
  for (const p of payments) p.patientName = p.patientId ? (nameById.get(String(p.patientId)) || null) : null;
  res.json({ response: true, payments });
});

module.exports = {
  recordTerminalPayment, getUnmatchedPayments, assignPayment, getTerminalPayments,
  chooseInvoice, dayBounds, tzOffsetMinutes,
};
