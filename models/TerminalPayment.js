const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * One row per card-present payment the terminal took (mirrors its Poynt record).
 * Financial data only — no PAN, no clinical data; never store anything but the last 4.
 */
const TerminalPaymentSchema = new Schema({
  poyntTxnId: { type: String, required: true, unique: true, index: true },
  parentId: { type: String, default: null },          // set on refunds/voids -> the original sale
  source: { type: String, default: 'poynt' },
  eventType: { type: String, default: null },          // webhook event that delivered it, or POLL
  action: { type: String, default: null },             // SALE | REFUND | VOID | CAPTURE
  status: { type: String, default: null },             // CAPTURED | VOIDED | REFUNDED | AUTHORIZED
  amountCents: { type: Number, required: true },
  tipCents: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  cardBrand: { type: String, default: null },
  cardLast4: { type: String, default: null },
  cardHolderName: { type: String, default: null },
  deviceId: { type: String, default: null },
  storeId: { type: String, default: null },
  orderId: { type: String, default: null },
  reference: { type: String, default: null },          // terminal-side reference, if the staff entered one
  occurredAt: { type: Date, required: true },
  invoiceId: { type: String, default: null },
  patientId: { type: String, default: null },
  matched: { type: Boolean, default: false, index: true },
  matchMethod: {
    type: String,
    enum: ['reference', 'exact_amount_same_day', 'exact_amount_recent', 'manual', 'unmatched'],
    default: 'unmatched',
  },
  reversedAt: { type: Date, default: null },           // void/refund handled
  raw: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = mongoose.model('TerminalPayment', TerminalPaymentSchema);
