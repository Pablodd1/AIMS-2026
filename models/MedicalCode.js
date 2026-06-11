const mongoose = require('mongoose');
const { Schema } = mongoose;

// Unified model for ICD-10 diagnosis codes and CPT procedure codes
const MedicalCodeSchema = new Schema({
  type: {
    type: String,
    enum: ['icd10', 'cpt'],
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'General',
  },
  // CPT-specific fields
  modifier: {
    type: String,
    default: null,
  },
  rvu: {
    type: Number,
    default: null,
  },
  // ICD-10-specific fields
  billable: {
    type: Boolean,
    default: true,
  },
  // Common
  isCustom: {
    type: Boolean,
    default: false,
  },
  docId: {
    type: String,
    default: null, // null = system codes, string = doctor-created custom code
  },
}, { timestamps: true });

MedicalCodeSchema.index({ type: 1, code: 1 }, { unique: true });
MedicalCodeSchema.index({ type: 1, category: 1 });
MedicalCodeSchema.index({ description: 'text', code: 'text' });

module.exports = mongoose.model('MedicalCode', MedicalCodeSchema);
