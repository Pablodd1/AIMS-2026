const asyncHandler = require("express-async-handler");
const Patient = require('../models/Patients')
const Appointment = require('../models/Appointment');
const { addPatient } = require('./mailController')
const { sendMessage } = require('../controllers/Twilio/twilio') 
const User = require('../models/User')
const csv = require('csv-parser');
const fs = require('fs')
const fsPromises = require('fs').promises;

const createPatient = asyncHandler(async(req,res)=>{

  const {
    doc_id,
    fullName,
    dateOfBirth,
    gender,
    email,
    phoneNumber,
    emergencyContactPhoneNumber,
    address,
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
    summary,
    userTimezone
} = req.body;
  
  

   
  try {
    // const patientExists = await Patient.findOne({ email });
    // if (patientExists) {
    //     return res.status(200).json({ response: false, msg: "Patient with this email address is already registered. Please enter a new email address for new registration." });
    // }

    // Create new patient
    const newPatient = new Patient({
        doc_id,
        userTimezone,

        fullName,
        dateOfBirth,
        gender,
        email,
        phoneNumber,
        emergencyContactPhoneNumber,
        address,

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

const exportAllPatients = asyncHandler(async(req,res)=>{
  try
  {
    console.log('hit')
    const patients = await Patient.find({doc_id:req.user})
    res.status(200).json({patients,response:true})
  }
  catch(e)
  {
    res.json({response:false})
  }
})

const getPatients = asyncHandler(async (req, res) => {
  try {
      const { page = 1, limit = 29 } = req.query;
      const id = req.user;
      if (!id) {
          return res.status(400).json({
              response: false,
              msg: "Missing required parameter: id",
          });
      }

      // Parse page and limit to ensure they are numbers
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
          return res.status(400).json({
              response: false,
              msg: "Invalid page or limit value. Both must be positive integers.",
          });
      }

      // Calculate skip value for pagination
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch paginated patients
      const patients = await Patient.find({ doc_id: id })
          .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
          .skip(skip)
          .limit(limitNumber);

      // Fetch total count for metadata
      const totalCount = await Patient.countDocuments({ doc_id: id });

      return res.status(200).json({
          response: true,
          patients,
          pagination: {
              total: totalCount,
              page: pageNumber,
              limit: limitNumber,
              totalPages: Math.ceil(totalCount / limitNumber),
          },
      });
  } catch (e) {
      return res.status(500).json({
          response: false,
          msg: "An error occurred while fetching patients.",
      });
  }
});


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


    const {
      _id
    } = req.body;
    
   
  
    
  await Patient.updateOne({_id},req.body);
    
    return res.json({response:true,msg:"Patient information updated"});

}
catch(e){
    return res.status(500).json({response:false,msg:"Server down"})
}
})

const getTodayPatients = asyncHandler(async(req,res)=>{
  try {
    const userTimezone = req.query.userTimezone || "UTC"; // Get the timezone from query or default to UTC
    const today = new Date();
  
    // Set the start and end of the day in the user's time zone
    const startOfDay = new Date(
      new Date(today).toLocaleString("en-US", { timeZone: userTimezone }).split(',')[0]
    );
    startOfDay.setHours(0, 0, 0, 0);
  
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
  
    // Query the patients with appointments created today in the given timezone
    const patients = await Patient.find({
      doc_id: req.user,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    });
  
    res.status(200).json({ patients, response: true });
  } catch (e) {
    console.error("Error fetching patients:", e);
    res.status(500).json({ response: false });
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

const addInstantPatient = asyncHandler(async(req,res)=>{
  let {
    clinic,
    address,
    website,
    name,
    email,
    lastName,
    clinicNumber,
    number,
    businessMail,
    appCode,
    smsChecked,
    emailChecked,
    userTimezone
} = req.body;
  
   
  try {

    if(email)
    {
      const patientExists = await Patient.findOne({doc_id:req.user,email})
      if(patientExists)
      {
        return res.status(200).json({ response: false, msg: "Patient already exists in your patients list"});
      }
    }

    if(!email)
    {
      emailChecked = false;
    }

    if(!number)
    {
      smsChecked = false
    }
    
    const fullName = name + ' ' + lastName

    // Create new patient
    const newPatient = new Patient({
        doc_id:req.user,
        fullName:fullName,
        phoneNumber:number,
        email:email,
        userTimezone
        
        
    });
    // Save patient to database
    const patient =  await newPatient.save();
    
    const doctorDetails = await User.findOne({_id:req.user})
    let link = `https://www.aiscribers.com/updatePatient/${patient._id}`
    if(doctorDetails.email === "kmcneal@awclinics.com"){
      link = `https://www.aiscribers.com/americare`
    }
    
    let msg=""
    
    if(clinic == "Icare" || clinic == "icare" || clinic == "Icare Mobile Medicine")
    {
       msg = `Please accept this text as your registration with ${clinic} or reply "STOP" to opt out.\n
Hi ${fullName},\n
Welcome to ${clinic}! We're excited to serve you with high-quality healthcare wherever you are.\n
Call ${clinicNumber} or visit ${website} to learn more.\n
To opt out, reply STOP.`;

    }else{

      msg = `Hi ${fullName},\nwelcome to ${clinic}! We are thrilled to have you.\n${address}. Same staff, same great service!\nVisit us at ${website}.\nCall ${clinicNumber}.`;
    }

    if(smsChecked)
    {
      sendMessage(msg,number)
    }
    if(emailChecked)
    {

    if(businessMail=="" || appCode == "")
    {
      addPatient(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,email,link,name,number,clinic,website,address)
    }else{
      addPatient(businessMail,appCode,email,link,name,number,clinic,website,address)
    }
  }


    return res.status(200).json({ response: true, msg: "Patient registered" });
} catch (error) {
    console.error(error);
    return res.status(500).json({ response: false, msg: "Server error" });
}
})

const updateVoiceIntake = asyncHandler(async(req,res)=>{

  const {
    doc_id,
    dateOfBirth,
    gender,
    phoneNumber,
    emergencyContactPhoneNumber,
    address,
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
   
    // Create new patient
    await Patient.updateOne(
      {
        _id:doc_id,
      },{
        dateOfBirth,
        gender,
        phoneNumber,
        emergencyContactPhoneNumber,
        address,

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


    res.status(200).json({ response: true, msg: "Patient information updated" });
} catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
}
})

const searchPatientsByAlphabet = asyncHandler(async (req, res) => {
  try {
    const { query } = req.body;

    console.log(query);

    // Search for patients whose full name starts with the query (regex for case-insensitive search)
    const patients = await Patient.find({
      doc_id: req.user, 
      fullName: { $regex: `^${query}`, $options: 'i' }  // Case-insensitive search
    });

    if (!patients.length) {
      return res.status(404).json({ response: false, msg: "No patients found" });
    }

    res.status(200).json({ response: true, patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
  }
});

const searchPatientsByType = asyncHandler(async (req, res) => {
  try {
    const { type, query } = req.body;

    // Validate type input
    if (type !== 'name' && type !== 'email') {
      return res.status(400).json({ response: false, msg: "Invalid search type" });
    }

    // Build the search filter based on the type (name or email)
    let filter = {};
    if (type === 'name') {
      filter = { fullName: { $regex: `^${query}`, $options: 'i' } }; // Case-insensitive regex search
    } else if (type === 'email') {
      filter = { email: { $regex: `^${query}`, $options: 'i' } }; // Case-insensitive regex search for email
    }

    // Search patients in the database
    const patients = await Patient.find({
      doc_id: req.user,
      ...filter  // Spread the filter object directly here
    });

    if (!patients.length) {
      return res.status(404).json({ response: false, msg: "No patients found" });
    }

    res.status(200).json({ response: true, patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
  }
});

const searchPatientsByTypeAndLimit5 = asyncHandler(async (req, res) => {
  try {
    const { type, query } = req.body;

    // Validate type input
    if (type !== 'name' && type !== 'email') {
      return res.status(400).json({ response: false, msg: "Invalid search type" });
    }

    // Build the search filter based on the type (name or email)
    let filter = {};
    if (type === 'name') {
      filter = { fullName: { $regex: `^${query}`, $options: 'i' } }; // Case-insensitive regex search
    } else if (type === 'email') {
      filter = { email: { $regex: `^${query}`, $options: 'i' } }; // Case-insensitive regex search for email
    }

    // Search patients in the database
    const patients = await Patient.find({
      doc_id: req.user,
      ...filter
    })
    .select('fullName email _id')  // Specify the fields you want to include
    .limit(5);
    

    if (!patients.length) {
      return res.status(404).json({ response: false, msg: "No patients found" });
    }

    res.status(200).json({ response: true, patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
  }
});


  // API to import patients from CSV file
  const importPatients = asyncHandler(async (req, res) => {
    const file = req.file;
    try {
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      const user = await User.findOne({_id:req.user})
  
      const patients = [];
      const csvData = [];
  
      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', (data) => {
          if ((data['First Name'] || data['Last Name']) && (data['Email'] || data['Phone'])) {
            csvData.push(data);
          }
        })
        .on('end', async () => {
          for (const item of csvData) {
            const newPatient = new Patient(
              {
              doc_id: user._id,
              fullName: `${item['First Name']} ${item['Last Name']}`,
              phoneNumber: item['Phone'],
              email: item['Email'],
              address: item['Address (full)'],
              gender: item['Sex'],
              dateOfBirth: item['Birth Date'],
              userTimezone: user.timezone,
            }
          );
  
            patients.push(newPatient.save());
          }
  
          await Promise.all(patients);
          if (file && file.path) {
            try {
              await fsPromises.unlink(file.path);
              console.log('File deleted:', file.path);
            } catch (err) {
              console.error('Failed to delete file:', err);
            }
          }
          res.status(200).json({ message: 'Patients imported successfully.' });
        });
  
    } catch (error) {
      console.error('Error importing patients:', error);
        if (file && file.path) {
          try {
            await fsPromises.unlink(file.path);
            console.log('File deleted:', file.path);
          } catch (err) {
            console.error('Failed to delete file:', err);
          }
        }
      res.status(500).json({ message: 'Error importing patients. Please try again.' });
    }
  });













module.exports = {
    createPatient,
    getPatients,
    getPatientById,
    updatePatient,
    getTodayPatients,
    getPaitentsCount,
    getTodayPatietnsForAppointment,
    addInstantPatient,
    updateVoiceIntake,
    searchPatientsByAlphabet,
    searchPatientsByType,
    searchPatientsByTypeAndLimit5,
    exportAllPatients,
    importPatients
};
