const mongoose = require('mongoose');
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  id: { type: Number, required: true },
  question: { type: String, required: true },
  field: { type: String }, // maps to patient model field (fullName, email, etc.)
  category: { type: String, default: 'general' }, // demographics, symptoms, history, insurance
  required: { type: Boolean, default: false },
  type: { type: String, enum: ['text', 'date', 'phone', 'email', 'select', 'textarea'], default: 'text' },
  options: [{ type: String }], // for select type
  example: { type: String }, // example answer for reference
  order: { type: Number },
});

const SectionSchema = new Schema({
  name: { type: String, required: true }, // Subjective, Objective, Assessment, Plan
  prompt: { type: String }, // GPT system prompt for this section
  fields: [{ type: String }], // field names in this section
  required: { type: Boolean, default: false },
  order: { type: Number },
});

const NoteTypeSchema = new Schema({
  name: { type: String, required: true, unique: true }, // "New Patient Intake", "SOAP Note", "Progress Note"
  slug: { type: String, required: true, unique: true }, // "new-patient", "soap-note", "progress-note"
  description: { type: String },
  category: { type: String, enum: ['intake', 'soap', 'progress', 'followup', 'exam', 'custom'], default: 'custom' },
  
  // System prompt sent to GPT for this note type
  systemPrompt: { type: String },
  
  // Sections (for SOAP-style notes)
  sections: [SectionSchema],
  
  // Questions (for intake-style notes)
  questions: [QuestionSchema],
  
  // Template text for rendering
  templateText: { type: String },
  
  // Default note title format
  titleFormat: { type: String, default: '{{type}} - {{date}}' },
  
  // Active status
  active: { type: Boolean, default: true },
  
  // Required fields that trigger red flags
  requiredFields: [{ type: String }],
  
  // Version tracking
  version: { type: Number, default: 1 },
}, { timestamps: true });

const NoteType = mongoose.model('NoteType', NoteTypeSchema);
module.exports = NoteType;
