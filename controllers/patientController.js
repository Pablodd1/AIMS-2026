const asyncHandler = require("express-async-handler");
const Patient = require('../models/Patients')
const Appointment = require('../models/Appointment');
const { appendFile } = require("fs");


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

    res.status(200).json({ response: true, msg: "Patient registered",patients:newPatient });
} catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
}
});

const getPatients = asyncHandler(async(req,res)=>{
  try
  {
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

    // const { _id } = req.body

    const {
      _id, fullName, dateOfBirth, gender, email, phoneNumber, emergencyContactPhoneNumber,
      insuranceProvider, insurancePolicyNumber, policyHolderName, groupNumber, primaryCarePhysician,
      medications, allergies, chronicConditions, pastSurgeries, familyMedicalHistory, visitReason,
      symptomDescription, symptomDuration, symptomSeverity, symptomHistory, symptomTriggers,
      occupation, lifestyle, exerciseAndDiet, livingArrangement, recentHealthChanges,
      cardiovascularHistory, respiratoryHistory, gastrointestinalHistory, musculoskeletalHistory,
      neurologicalHistory, summary
    } = req.body;
    
    // const requiredFields = {
    //   fullName, dateOfBirth, gender, email, phoneNumber, emergencyContactPhoneNumber,
    //   insuranceProvider, insurancePolicyNumber, policyHolderName, groupNumber, primaryCarePhysician,
    //   medications, allergies, chronicConditions, pastSurgeries, familyMedicalHistory, visitReason,
    //   symptomDescription, symptomDuration, symptomSeverity, symptomHistory, symptomTriggers,
    //   occupation, lifestyle, exerciseAndDiet, livingArrangement, recentHealthChanges,
    //   cardiovascularHistory, respiratoryHistory, gastrointestinalHistory, musculoskeletalHistory,
    //   neurologicalHistory, summary
    // };
    
    // for (const [field, value] of Object.entries(requiredFields)) {
    //   if (!value || (field === "email" && !value.includes("@"))) {
    //     return res.status(200).send({ msg: `Enter ${field}`, response: false });
    //   }
    // }
  
    
  await Patient.updateOne({_id},req.body);
    
    return res.json({response:true,msg:"Patient information updated"});

}
catch(e){
    return res.status(500).json({response:false,msg:"Server down"})
}
})

const getTodayPatients = asyncHandler(async(req,res)=>{
  try {
    // Calculate the date 24 hours ago
    // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
    // Find patients with appointments created after twentyFourHoursAgo for the given doc_id
    const patients = await Patient.find({
      doc_id: req.query.id,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
      // createdAt: { $gte: twentyFourHoursAgo }
    });
  
    res.status(200).json({ patients, response: true });
  } catch (e) {
    res.json({ response: false });
  }
})

const getPaitentsCount = asyncHandler(async(req,res)=>{
    Promise.all([
      Patient.find({ doc_id: req.user }).count().exec(),
      Patient.find({ 
        doc_id: req.user,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).count().exec()
    ])
    .then(([totalPatientCount, todayPatientCount]) => {
      // Handle successful execution
      return res.json({ response: true, totalPatientCount, todayPatientCount });
    })
    .catch((err) => {
      // Handle errors in either query execution
      console.error("Error fetching patient counts:", err);
      return res.json({ response: false });
    });
  
})

const getTodayPatietnsForAppointment = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const pat = {
      doc_id: req.user,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    };
    const appt = {
      doctorID: req.user,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    };

    const todayPatients = await Patient.find(pat);
    const todayAppointments = await Appointment.find(appt);

    // Create a Set of patient IDs that have appointments
    const patientsWithAppointments = new Set(todayAppointments.map(appt => appt.patientID.toString()));

    // Filter out patients who do not have appointments
    const patientsWithoutAppointments = todayPatients.filter(patient => !patientsWithAppointments.has(patient._id.toString()));

    return res.json({ success: true, patients: patientsWithoutAppointments });
  } catch (e) {
    console.error(e); // Log the error for debugging
    return res.json({ success: false });
  }
});


// const getTodayPatietnsForAppointment = asyncHandler(async(req,res)=>{
//   try
//   {
//   const today = new Date();
//     const startOfDay = new Date(today.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(today.setHours(23, 59, 59, 999));

//     const pat = {
//       doc_id:req.user,
//       createdAt: {
//         $gte: startOfDay,
//         $lt: endOfDay
//       }
//     };
//     const appt = {
//       doctorID:req.user,
//       createdAt: {
//         $gte: startOfDay,
//         $lt: endOfDay
//       }
//     };

//   const todayPatients = await Patient.find(pat);
//   const todayAppointments = await Appointment.find(appt)

//   let patientsWithoutAppointments = []
//   for(let i=0;i<todayPatients.length;i++)
//   {
//     for(let j=0;j<todayAppointments.length;j++)
//     {
//       console.log(todayPatients[i]._id == todayAppointments[j].patientID) 
//       if(todayPatients[i]._id != todayAppointments[j].patientID){
//         patientsWithoutAppointments.push(todayPatients[i])
//       }
//     }

//   }

//   return res.json({"success":true,patients:patientsWithoutAppointments})
// }catch(e)
// {
//   return res.json({"success":false})
// }

// })




module.exports = {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
    getTodayPatients,
    getPaitentsCount,
    getTodayPatietnsForAppointment
};
