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
