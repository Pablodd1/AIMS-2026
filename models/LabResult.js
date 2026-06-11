const mongoose = require('mongoose');
const { Schema } = mongoose;

const LabResultSchema = new Schema({
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  doctorId: {
    type: String,
    required: true,
  },
  labName: {
    type: String,
    required: true,
    default: 'Lab Report',
  },
  labDate: {
    type: String,
  },
  results: [{
    testName: { type: String, required: true },
    value: { type: String },
    unit: { type: String },
    referenceRange: { type: String },
    flag: { type: String, enum: ['high', 'low', 'normal', 'critical', ''], default: '' },
    category: { type: String }, // e.g. 'CBC', 'Lipid', 'Metabolic', etc.
  }],
  sourceFile: {
    type: String, // original filename
  },
  sourceType: {
    type: String,
    enum: ['pdf', 'image', 'csv', 'xlsx', 'manual'],
    default: 'manual',
  },
  aiInterpretation: {
    type: String,
  },
  aiSuggestions: [{
    type: String,
  }],
  notes: {
    type: String,
  },
  summary: {
    type: String,
  },
}, { timestamps: true });

mongoose.models = {};
const LabResult = mongoose.model('LabResult', LabResultSchema);
module.exports = LabResult;
