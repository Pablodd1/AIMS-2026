const asyncHandler = require("express-async-handler");
const Patient = require('../models/Patients')

const validateFields = (fields) => {
  for (const field of fields) {
      if (!field.value) {
          return { msg: `Enter ${field.name}`, response: false };
      } else if (field.name === 'email' && !field.value.includes('@')) {
          return { msg: 'Enter valid email', response: false };
      }
  }
  return null;
};


const createPatient = asyncHandler(async(req,res)=>{

  const {
    doc_id,
    fullName,
    dateOfBirth,
    gender,
    email,
    phoneNumber,
    emergencyContactPhoneNumber,
    insuranceProvider,
    insurancePolicyNumber,
    policyHolderName,
    groupNumber,
    primaryCarePhysician,
    medications,
    allergies,
    chronicConditions,
    pastSurgeries,
    familyMedicalHistory,
    visitReason,
    symptomDescription,
    symptomDuration,
    symptomSeverity,
    symptomHistory,
    symptomTriggers,
    occupation,
    lifestyle,
    exerciseAndDiet,
    livingArrangement,
    recentHealthChanges,
    cardiovascularHistory,
    respiratoryHistory,
    gastrointestinalHistory,
    musculoskeletalHistory,
    neurologicalHistory,
    summary
} = req.body;

  
  try {
    const patientExists = await Patient.findOne({ email });
    if (patientExists) {
        return res.status(200).json({ response: false, msg: "Patient with this email address is already registered. Please enter a new email address for new registration." });
    }

    // Create new patient
    const newPatient = new Patient({
        doc_id,

        fullName,
        dateOfBirth,
        gender,
        email,
        phoneNumber,
        emergencyContactPhoneNumber,

        insuranceProvider,
        insurancePolicyNumber,
        policyHolderName,
        groupNumber,

        primaryCarePhysician,
        medications,
        allergies,
        chronicConditions,
        pastSurgeries,
        familyMedicalHistory,

        visitReason,
        symptomDescription,

        symptomDuration,
        symptomSeverity,
        symptomHistory,
        symptomTriggers,

        occupation,
        lifestyle,

        exerciseAndDiet,
        livingArrangement,
        recentHealthChanges,
        cardiovascularHistory,
        respiratoryHistory,
        gastrointestinalHistory,
        
        musculoskeletalHistory,
        neurologicalHistory,
        summary
    });

    // Save patient to database
    await newPatient.save();

    res.status(200).json({ response: true, msg: "Patient registered" });
} catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
}
});

const getPatients = asyncHandler(async(req,res)=>{
  try
  {
    console.log(req.query.id)
    const patients = await Patient.find({doc_id:req.query.id})
    res.status(200).json({patients,response:true})
  }
  catch(e)
  {
    res.json({response:false})
  }
})

const getPatientById = asyncHandler(async(req,res)=>{
  try
  {
    const patient = await Patient.findOne({_id:req.query.id})
    res.status(200).json({patient,response:true})
  }
  catch(e)
  {
    res.json({response:false})
  }
})

const updatePatient = asyncHandler(async(req,res)=>{
  try{

    const { _id , FullName , birthDate , gender , address , phoneNumber , email , provider , policyName , groupNB , memberid } = req.body
    if(!FullName)
    return res.status(200).send({ msg:"Enter FullName", response: false });
  else if(!birthDate)
    return res.status(200).send({ msg:"Enter birthDate", response: false });
  else if(!email || !email.includes("@"))
    return res.status(200).send({ msg:"Enter email", response: false });
  else if(!gender)
    return res.status(200).send({ msg:"Enter gender", response: false });
  else if(!phoneNumber)
    return res.status(200).send({ msg:"Enter phoneNumber", response: false });
  else if(!address)
    return res.status(200).send({ msg:"Enter address", response: false });
  else if(!provider)
    return res.status(200).send({ msg:"Enter provider", response: false });
  else if(!policyName)
    return res.status(200).send({ msg:"Enter policyName", response: false });
  else if(!groupNB)
    return res.status(200).send({ msg:"Enter groupNB", response: false });
  else if(!memberid)
    return res.status(200).send({ msg:"Enter memberid", response: false });
  else{
    
  await Patient.updateOne({_id},{
        FullName,
        birthDate,
        gender,
        address,
        phoneNumber,
        email,
        provider,
        policyName,
        groupNB,
        memberid
    });
    
    return res.json({response:true,msg:"Patient information updated"});
  }
}
catch(e){
    return res.status(500).json({response:false,msg:"Server down"})
}
})






module.exports = {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient
};
