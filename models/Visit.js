const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');

const VisitSchema = new Schema({
  pId: {
    type: String,
    required: true,
  },
  doc_id: {
    type: String,
  },
  all: {
    type: String,
  },
  soapNotesSummary: {
    type: String,
  },
  subjective: {
    type: String,
  },
  objective: {
    type: String,
  },
  chiefComplaint: {
    type: String,
  },
  HPI: {
    type: String,
  },
  PMH: {
    type: String,
  },
  Allergy: {
    type: String,
  },
  ROS: {
    type: String,
  },
  physicalExamination: {
    type: String,
  },
  Assessment: {
    type: String,
  },
  med: {
    type: String,
  },
  Plan: {
    type: String,
  },
  Rationale: {
    type: String,
  },
  cptCodes: [{
    type: Object,
  }],
  icdCodes: [{
    type: Object,
  }],
  dxCodes: [{
    type: Object,
  }],
  date: {
    type: String,
  },
  time: {
    type: String,
  },
  reportType:{
    default:"1.0",
    type: String,
  },
  userTimezone: {
    type: String,
  },
  redFlags: [{
    type: Object,
  }],
  treatmentSuggestions: {
    type: Object,
  },
  audioNoteUrl: {
    type: String,
  },
  audioNoteDuration: {
    type: Number,
  },
  audioTranscription: {
    type: String,
  },
  // --- Clinical moat: Med-Legal / PI Defense Engine ---
  personalInjuryDossier: {
    type: Object,
  },
  mechanismOfInjury: {
    type: Object,
  },
  impactOnADL: [{
    type: Object,
  }],
  causationStatement: {
    type: Object,
  },
  // --- Clinical moat: Objective MSK / ROM ---
  rangeOfMotion: [{
    type: Object,
  }],
  romAnalysis: [{
    type: Object,
  }],
  // --- Clinical moat: Pre-billing audit ---
  auditResults: {
    type: Object,
  },
  // --- Scribe: present vs future, kept apart on purpose ---
  // performedToday: what was actually done in THIS visit.
  // plannedFuture: what the provider plans/orders for later — never mixed into the above.
  performedToday: {
    type: String,
  },
  plannedFuture: {
    type: String,
  },
  // --- Scribe: provider signature & pre-sign attestation (gate) ---
  signedBy: {
    type: String,
  },
  signedAt: {
    type: Date,
  },
  signatureName: {
    type: String,
  },
  // {studies, medications, therapy, icd10, cpt, redFlags} -> 'yes' | 'no'
  attestations: {
    type: Object,
  },
  // second-agent quality check verdict captured at sign time
  qualityCheck: {
    type: Object,
  },
  // care-gap / doctor-review items from the scribe generation pass (never part of the final note)
  clinicalReview: [{
    type: Object,
  }],
}, { timestamps: true });

VisitSchema.pre('save', function (next) {
  console.log('Pre-save middleware executed for Visit');
  if (this.isNew) {
    const currentDate = getCurrentDateGlobally(this.userTimezone);
    const currentTime = getCurrentTimeGlobally(this.userTimezone);
    if (!currentDate || !currentTime) {
      console.error('Error: Date or time is undefined');
    } else {
      this.date = currentDate;
      this.time = currentTime;
      console.log(`Date set to: ${currentDate}, Time set to: ${currentTime}`);
    }
  }
  next();
});

const Visit = mongoose.model("Visit", VisitSchema);

module.exports = Visit;
