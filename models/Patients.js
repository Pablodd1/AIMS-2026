const mongoose = require('mongoose');
const { Schema } = mongoose;

const PatientSchema = new Schema({
    doc_id:{type:String, required: true},
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: false, unique: true },
    phoneNumber: { type: String, required: false },
    emergencyContactPhoneNumber: { type: String, required: false },
    insuranceProvider: { type: String, required: false },
    insurancePolicyNumber: { type: String, required: false },
    policyHolderName: { type: String, required: false },
    groupNumber: { type: String, required: false },
    primaryCarePhysician: { type: String, required: false },
    medications: { type: String , required: false},
    allergies: { type: String , required: false},
    chronicConditions: { type: String, required: false },
    pastSurgeries: { type: String, required: false },
    familyMedicalHistory: { type: String, required: false },
    visitReason: { type: String, required: false, required: false },
    symptomDescription: { type: String, required: false },
    symptomDuration: { type: String, required: false },
    symptomSeverity: { type: Number,  required: false },
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
    summary: { type: String, required: false },
  }
    ,{timestamps:true})
    mongoose.models={}

const Patient = mongoose.model("Patient", PatientSchema);

module.exports = Patient;

