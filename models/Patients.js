const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');


const PatientSchema = new Schema({
  doc_id: { type: String, required: true },
  fullName: { type: String, required: true },
  dateOfBirth: { type: String },
  gender: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
  emergencyContactPhoneNumber: { type: String, required: false },
  address: { type: String, required: false },
  insuranceProvider: { type: String, required: false },
  insurancePolicyNumber: { type: String, required: false },
  policyHolderName: { type: String, required: false },
  groupNumber: { type: String, required: false },
  primaryCarePhysician: { type: String, required: false },
  medications: { type: String, required: false },
  allergies: { type: String, required: false },
  chronicConditions: { type: String, required: false },
  pastSurgeries: { type: String, required: false },
  familyMedicalHistory: { type: String, required: false },
  visitReason: { type: String, required: false },
  symptomDescription: { type: String, required: false },
  symptomDuration: { type: String, required: false },
  symptomSeverity: { type: String, required: false },
  symptomHistory: { type: String, required: false },
  symptomTriggers: { type: String, required: false },
  occupation: { type: String, required: false },
  lifestyle: { type: String, required: false },
  exerciseAndDiet: { type: String, required: false },
  livingArrangement: { type: String, required: false },
  recentHealthChanges: { type: String, required: false },
  cardiovascularHistory: { type: String, required: false },
  respiratoryHistory: { type: String, required: false },
  gastrointestinalHistory: { type: String, required: false },
  musculoskeletalHistory: { type: String, required: false },
  neurologicalHistory: { type: String, required: false },
  userTimezone: { type: String, required: false },
  summary: { type: String, required: false },
  notes: { type: String, required: false },
  date: { type: String }, // Default to current date
  time: { type: String }, // Default to current time
  visitCount: { type: Number, default: 0 },

  // Pain & symptoms
  painScale: { type: Number, required: false },
  painLocation: { type: [String], required: false },
  painQuality: { type: String, required: false },

  // Auto accident
  autoAccident: {
    involved: { type: Boolean, default: false },
    date: { type: String, required: false },
    claimNumber: { type: String, required: false },
    attorneyName: { type: String, required: false },
    attorneyPhone: { type: String, required: false },
    policeReport: { type: String, required: false },
  },

  // Workers compensation
  workersComp: {
    involved: { type: Boolean, default: false },
    employer: { type: String, required: false },
    claimNumber: { type: String, required: false },
    caseManager: { type: String, required: false },
    caseManagerPhone: { type: String, required: false },
  },

  // Chiropractic history
  previousChiropractic: {
    seenBefore: { type: Boolean, default: false },
    lastChiropractor: { type: String, required: false },
    lastVisitDate: { type: String, required: false },
  },

  functionalLimitations: { type: String, required: false },
  referralSource: { type: String, required: false },

  // Secondary insurance
  secondaryInsurance: {
    provider: { type: String, required: false },
    policyNumber: { type: String, required: false },
    groupNumber: { type: String, required: false },
  },

  // Emergency contact details
  emergencyContactName: { type: String, required: false },
  emergencyContactRelationship: { type: String, required: false },

  // Physical metrics
  height: { type: String, required: false },
  weight: { type: String, required: false },

  // Split substance use
  smoking: { type: String, required: false },
  alcohol: { type: String, required: false },
  drugUse: { type: String, required: false },

  // OCR extracted data
  pictureIdOcr: { type: String, required: false },
  insuranceCardOcr: { type: String, required: false },

  // Pregnancy status
  pregnancyStatus: { type: String, required: false },

}, { timestamps: true });

mongoose.models = {};

// Middleware to set date and time before saving the document
PatientSchema.pre('save', function (next) {
  console.log('Pre-save middleware executed for Patient');

  // Set date and time only for new documents
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

const Patient = mongoose.model("Patient", PatientSchema);

module.exports = Patient;
