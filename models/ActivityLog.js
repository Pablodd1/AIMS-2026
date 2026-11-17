const mongoose = require('mongoose');
const { Schema } = mongoose;

// Per-user activity audit: what each user did (voice, mouse, text, navigation).
// Metadata only — no field values, no keystroke content, no PHI.
const ActivityLogSchema = new Schema({
  user:       { type: String, index: true },
  actionType: { type: String, enum: ['voice', 'mouse', 'text', 'navigation', 'login', 'logout', 'other'], index: true },
  detail:     { type: String, default: '' },
  path:       { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
