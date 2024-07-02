const mongoose = require('mongoose');
const { Schema } = mongoose;

const PatientSchema = new Schema({
    doc_id:{type:String, required: true},
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    emergencyContactPhoneNumber: { type: String, required: true },
    insuranceProvider: { type: String, required: true },
    insurancePolicyNumber: { type: String, required: true },
    policyHolderName: { type: String, required: true },
    groupNumber: { type: String, required: true },
    primaryCarePhysician: { type: String, required: true },
    medications: { type: String , required: true},
    allergies: { type: String , required: true},
    chronicConditions: { type: String, required: true },
    pastSurgeries: { type: String, required: true },
    familyMedicalHistory: { type: String, required: true },
    visitReason: { type: String, required: true, required: true },
    symptomDescription: { type: String, required: true },
    symptomDuration: { type: String, required: true },
    symptomSeverity: { type: Number, min: 1, max: 10, required: true },
    symptomHistory: { type: String, required: true },
    symptomTriggers: { type: String, required: true },
    occupation: { type: String, required: true },
    lifestyle: { type: String, required: true },
    exerciseAndDiet: { type: String, required: true },
    livingArrangement: { type: String, required: true },
    recentHealthChanges: { type: String, required: true },
    cardiovascularHistory: { type: String, required: true },
    respiratoryHistory: { type: String, required: true },
    gastrointestinalHistory: { type: String, required: true },
    musculoskeletalHistory: { type: String, required: true },
    neurologicalHistory: { type: String, required: true },
    summary: { type: String, required: true },
  }
    ,{timestamps:true})
    mongoose.models={}

const Patient = mongoose.model("Patient", PatientSchema);

module.exports = Patient;

