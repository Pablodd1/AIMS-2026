const asyncHandler = require("express-async-handler");
const Patient = require('../models/Patients')
const Appointment = require('../models/Appointment');
const CheckNotes = require('../models/CheckNotes');
const Visit = require('../models/Visit');
const { addPatient } = require('./mailController')
const { sendMessage } = require('../controllers/Twilio/twilio') 
const User = require('../models/User')
const csv = require('csv-parser');
const fs = require('fs')
const fsPromises = require('fs').promises;

// Attach date-of-service (DOS) + visit counts from BOTH completed appointments
// and kiosk check-ins (CheckNotes). Kiosk check-ins are the authoritative visit
// source: AIMS misses most visits otherwise. Appointments store only the patient
// NAME (no patientId) so they are matched by lowercased full name; CheckNotes
// carry pId directly.
const { dayOf } = require("../Helper/visitCounter");
const attachDos = async (patients) => {
  const namesLower = patients.map(p => (p.fullName || "").trim().toLowerCase()).filter(Boolean);
  const pids = patients.map(p => String(p._id));
  const [rowsByName, rowsByPid, notes, visits] = await Promise.all([
    namesLower.length ? Appointment.aggregate([
      { $match: { status: { $regex: /^complet/i }, $expr: { $in: [{ $toLower: "$name" }, namesLower] } } },
      { $group: { _id: { $toLower: "$name" }, lastVisitDate: { $max: "$time" }, aptCount: { $sum: 1 }, dates: { $addToSet: "$time" } } }
    ]) : Promise.resolve([]),
    pids.length ? Appointment.aggregate([
      { $match: { status: { $regex: /^complet/i }, patientID: { $in: pids } } },
      { $group: { _id: "$patientID", lastVisitDate: { $max: "$time" }, aptCount: { $sum: 1 }, dates: { $addToSet: "$time" } } }
    ]) : Promise.resolve([]),
    pids.length ? CheckNotes.aggregate([
      { $match: { pId: { $in: pids } } },
      { $group: { _id: "$pId", lastVisitDate: { $max: { $ifNull: ["$checkInDate", "$createdAt"] } }, noteCount: { $sum: 1 }, dates: { $addToSet: { $ifNull: ["$checkInDate", "$createdAt"] } } } }
    ]) : Promise.resolve([]),
    pids.length ? Visit.aggregate([
      { $match: { pId: { $in: pids } } },
      { $group: { _id: "$pId", lastVisitDate: { $max: { $ifNull: ["$date", "$createdAt"] } }, visitDocCount: { $sum: 1 }, dates: { $addToSet: { $ifNull: ["$date", "$createdAt"] } } } }
    ]) : Promise.resolve([]),
  ]);
  const nameMap = {};
  for (const r of rowsByName) nameMap[r._id] = r;
  const pidApptMap = {};
  for (const r of rowsByPid) pidApptMap[String(r._id)] = r;
  const noteMap = {};
  for (const n of notes) noteMap[String(n._id)] = n;
  const visitMap = {};
  for (const v of visits) visitMap[String(v._id)] = v;

  for (const p of patients) {
    const pid = String(p._id);
    const hitName = nameMap[(p.fullName || "").trim().toLowerCase()];
    const hitPid = pidApptMap[pid];
    const nt = noteMap[pid];
    const vd = visitMap[pid];
    const rawDates = [
      ...(hitName && hitName.dates ? hitName.dates : []),
      ...(hitPid && hitPid.dates ? hitPid.dates : []),
      ...(nt && nt.dates ? nt.dates : []),
      ...(vd && vd.dates ? vd.dates : []),
      ...(Array.isArray(p.visitDates) ? p.visitDates : []),
    ];
    const ds = new Set(rawDates.map(d => dayOf(d instanceof Date ? d.toISOString() : d)).filter(Boolean));
    const sorted = [...ds].sort();
    p.visitDates = sorted;
    p.visitDatesStr = sorted.join(', ');
    p.visitCount = sorted.length;
    if (sorted.length) p.lastVisitDate = sorted[sorted.length - 1];
    p.checkinCount = nt ? nt.noteCount : 0;
    p.soapCount = vd ? vd.visitDocCount : 0;
    p.aptCount = Math.max(hitName ? hitName.aptCount : 0, hitPid ? hitPid.aptCount : 0) + p.checkinCount + p.soapCount;
  }
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
    userTimezone,
    painScale,
    painLocation,
    painQuality,
    autoAccident,
    workersComp,
    previousChiropractic,
    functionalLimitations,
    referralSource,
    secondaryInsurance,
    emergencyContactName,
    emergencyContactRelationship,
    height,
    weight,
    smoking,
    alcohol,
    drugUse,
    pictureIdOcr,
    insuranceCardOcr,
    pregnancyStatus
} = req.body;
  
  

   
  try {
    // Check for duplicate patients by email or phone+name
    if (email) {
      const existingPatient = await Patient.findOne({ email });
      if (existingPatient) {
        return res.status(200).json({ response: false, msg: "Patient with this email address is already registered. Please enter a new email address for new registration." });
      }
    } else if (fullName && phoneNumber) {
      const existingPatient = await Patient.findOne({ fullName, phoneNumber });
      if (existingPatient) {
        return res.status(200).json({ response: false, msg: "Patient with this name and phone number already exists." });
      }
    }

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
        summary,
        painScale,
        painLocation,
        painQuality,
        autoAccident,
        workersComp,
        previousChiropractic,
        functionalLimitations,
        referralSource,
        secondaryInsurance,
        emergencyContactName,
        emergencyContactRelationship,
        height,
        weight,
        smoking,
        alcohol,
        drugUse,
        pictureIdOcr,
        insuranceCardOcr,
        pregnancyStatus
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
    const caller = await User.findById(req.user).select('admin').lean();
    const query = caller && caller.admin ? {} : { doc_id: req.user };
    const patients = await Patient.find(query).lean();
    await attachDos(patients);
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

      // Admins see ALL patients; doctors see only their own
      // (Fix for migration gap: imported patients may have no doc_id)
      const caller = await User.findById(id).select('admin').lean();
      const query = caller && caller.admin ? {} : { doc_id: id };

      // Fetch paginated patients
      const patients = await Patient.find(query).lean()
          .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
          .skip(skip)
          .limit(limitNumber);
      await attachDos(patients);

      // Fetch total count for metadata
      const totalCount = await Patient.countDocuments(query);

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
    const userTimezone = req.query.userTimezone || "UTC";
    const today = new Date();
    
    // Get today's appointments
    const todayStr = today.toISOString().slice(0, 10);
    const appointments = await Appointment.find({
      doctorID: req.user,
      time: { $regex: `^${todayStr}`, $options: 'i' }
    });
    
    // Get unique patient IDs from today's appointments
    const patientIds = [...new Set(appointments.map(a => a.patientID))];
    
    // Fetch those patients
    const patients = await Patient.find({
      _id: { $in: patientIds }
    });
    
    // Attach appointment time to each patient
    const patientsWithAppts = patients.map(p => {
      const appt = appointments.find(a => a.patientID === p._id.toString());
      return {
        ...p.toObject(),
        appointmentTime: appt?.time || '',
        appointmentStatus: appt?.status || '',
        appointmentId: appt?._id || '',
      };
    });
  
    res.status(200).json({ patients: patientsWithAppts, response: true, total: patientsWithAppts.length });
  } catch (e) {
    console.error("Error fetching today's patients:", e);
    res.status(500).json({ response: false });
  }
  
})

const getPaitentsCount = asyncHandler(async(req,res)=>{
    Promise.all([
      Patient.find({ doc_id: req.user }).countDocuments().exec(),
      Patient.find({ 
        doc_id: req.user,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).countDocuments().exec()
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

    const fullName = name + ' ' + lastName

    // Duplicate guard: check email, then phone+name
    if(email)
    {
      const patientExists = await Patient.findOne({doc_id:req.user,email})
      if(patientExists)
      {
        return res.status(200).json({ response: false, msg: "Patient already exists in your patients list", patient: patientExists });
      }
    }
    else if(number)
    {
      const phoneDigits = number.toString().replace(/\D/g, '');
      if(phoneDigits.length >= 7)
      {
        const patientExists = await Patient.findOne({doc_id:req.user, fullName: fullName, phoneNumber: number})
        if(patientExists)
        {
          return res.status(200).json({ response: false, msg: "Patient already exists in your patients list", patient: patientExists });
        }
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
    let link = `https://www.aimedicalscriber.com/updatePatient/${patient._id}`
    if(doctorDetails.email === "kmcneal@awclinics.com"){
      link = `https://www.aimedicalscriber.com/americare`
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


    return res.status(200).json({ response: true, msg: "Patient registered", patient });
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
    summary,
    painScale,
    painLocation,
    painQuality,
    autoAccident,
    workersComp,
    previousChiropractic,
    functionalLimitations,
    referralSource,
    secondaryInsurance,
    emergencyContactName,
    emergencyContactRelationship,
    height,
    weight,
    smoking,
    alcohol,
    drugUse,
    pictureIdOcr,
    insuranceCardOcr,
    pregnancyStatus
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
        summary,
        painScale,
        painLocation,
        painQuality,
        autoAccident,
        workersComp,
        previousChiropractic,
        functionalLimitations,
        referralSource,
        secondaryInsurance,
        emergencyContactName,
        emergencyContactRelationship,
        height,
        weight,
        smoking,
        alcohol,
        drugUse,
        pictureIdOcr,
        insuranceCardOcr,
        pregnancyStatus
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

const buildSmartPatientFilter = async (rawQuery, type = 'all') => {
  const q = String(rawQuery || '').trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = { $regex: escaped, $options: 'i' };

  if (type === 'email') return { email: rx };
  if (type === 'dob') {
    const iso = dayOf(q);
    return iso ? { $or: [{ dateOfBirth: rx }, { dateOfBirth: { $regex: iso, $options: 'i' } }] } : { dateOfBirth: rx };
  }
  if (type === 'phone') {
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 4) {
      const flexPhone = digits.split('').join('[^\\d]*');
      return { $or: [{ phoneNumber: rx }, { phoneNumber: { $regex: flexPhone, $options: 'i' } }] };
    }
    return { phoneNumber: rx };
  }

  // Unified smart match (name / last name / DOB / phone / email / DOS)
  const orClauses = [
    { fullName: rx },
    { email: rx },
    { dateOfBirth: rx },
    { phoneNumber: rx },
    { visitDates: rx },
  ];

  // Flexible phone digit matching (e.g. "3148137555" matches "+1 (314) 813-7555")
  const digits = q.replace(/\D/g, '');
  if (digits.length >= 4 && !/^\d{4}-\d{2}-\d{2}$/.test(q)) {
    const flexPhone = digits.split('').join('[^\\d]*');
    orClauses.push({ phoneNumber: { $regex: flexPhone, $options: 'i' } });
  }

  // Date matching: DOB or Date of Service (DOS) across CheckNotes, Visit, and Appointment
  const isoDay = dayOf(q);
  if (isoDay) {
    orClauses.push({ dateOfBirth: { $regex: isoDay, $options: 'i' } });
    orClauses.push({ visitDates: isoDay });
    const [mNotes, mVisits, mAppts] = await Promise.all([
      CheckNotes.find({ checkInDate: { $regex: isoDay, $options: 'i' } }).select('pId').lean().catch(() => []),
      Visit.find({ date: { $regex: isoDay, $options: 'i' } }).select('pId').lean().catch(() => []),
      Appointment.find({ time: { $regex: isoDay, $options: 'i' } }).select('patientID name').lean().catch(() => []),
    ]);
    const dosIds = new Set();
    const dosNames = new Set();
    mNotes.forEach(n => { if (n.pId) dosIds.add(String(n.pId)); });
    mVisits.forEach(v => { if (v.pId) dosIds.add(String(v.pId)); });
    mAppts.forEach(a => {
      if (a.patientID) dosIds.add(String(a.patientID));
      if (a.name) dosNames.add(String(a.name).trim());
    });
    if (dosIds.size) orClauses.push({ _id: { $in: [...dosIds] } });
    if (dosNames.size) {
      dosNames.forEach(nm => {
        orClauses.push({ fullName: { $regex: `^${nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      });
    }
  }

  return { $or: orClauses };
};

const searchPatientsByType = asyncHandler(async (req, res) => {
  try {
    const { type = 'name', query } = req.body;

    if (!['name', 'email', 'dob', 'phone', 'dos', 'all'].includes(type)) {
      return res.status(400).json({ response: false, msg: "Invalid search type. Use: name, email, dob, phone, dos, or all" });
    }
    if (!query || !String(query).trim()) {
      return res.status(400).json({ response: false, msg: "Search query is required" });
    }

    const filter = await buildSmartPatientFilter(query, type);
    const patients = await Patient.find({
      doc_id: req.user,
      ...filter
    }).lean();

    if (!patients.length) {
      return res.status(404).json({ response: false, msg: "No patients found" });
    }

    await attachDos(patients);
    res.status(200).json({ response: true, patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
  }
});

const searchPatientsByTypeAndLimit5 = asyncHandler(async (req, res) => {
  try {
    const { type = 'name', query } = req.body;

    if (!['name', 'email', 'dob', 'phone', 'dos', 'all'].includes(type)) {
      return res.status(400).json({ response: false, msg: "Invalid search type. Use: name, email, dob, phone, dos, or all" });
    }
    if (!query || !String(query).trim()) {
      return res.status(400).json({ response: false, msg: "Search query is required" });
    }

    const filter = await buildSmartPatientFilter(query, type);
    const patients = await Patient.find({
      doc_id: req.user,
      ...filter
    })
    .select('fullName email dateOfBirth phoneNumber visitDates _id')
    .limit(8)
    .lean();

    if (!patients.length) {
      return res.status(404).json({ response: false, msg: "No patients found" });
    }

    res.status(200).json({ response: true, patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: false, msg: "Server error" });
  }
});


  // API to import patients from CSV file (supports both AIMS Export headers and First/Last Name templates)
  const importPatients = asyncHandler(async (req, res) => {
    const file = req.file;
    const cleanup = async () => {
      if (file && file.path) {
        try { await fsPromises.unlink(file.path); } catch (_) {}
      }
    };
    try {
      if (!file) {
        return res.status(400).json({ response: false, message: 'No CSV file uploaded.' });
      }
      const user = await User.findOne({ _id: req.user }).lean().catch(() => null);
      const docId = (user && user._id) || req.user;
      const tz = (user && user.timezone) || process.env.CLINIC_TZ || 'America/New_York';

      const normRow = (raw) => {
        const m = {};
        for (const [k, v] of Object.entries(raw || {})) {
          const cleanKey = String(k || '').replace(/^\uFEFF/, '').trim().toLowerCase();
          m[cleanKey] = String(v == null ? '' : v).trim();
        }
        return m;
      };
      const pick = (m, keys) => {
        for (const k of keys) {
          if (m[k]) return m[k];
        }
        return '';
      };

      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
          .on('error', reject)
          .pipe(csv())
          .on('data', (data) => rows.push(normRow(data)))
          .on('error', reject)
          .on('end', resolve);
      });

      let importedCount = 0;
      let skippedCount = 0;
      const saves = [];
      for (const m of rows) {
        const directFull = pick(m, ['full name', 'fullname', 'name', 'patient name', 'patient']);
        const first = pick(m, ['first name', 'firstname', 'first']);
        const last = pick(m, ['last name', 'lastname', 'last']);
        const fullName = (directFull || `${first} ${last}`).replace(/\s+/g, ' ').trim();
        const phoneNumber = pick(m, ['phone number', 'phone', 'phonenumber', 'mobile', 'cell', 'telephone']);
        const email = pick(m, ['email', 'email address', 'e-mail']);
        const address = pick(m, ['address (full)', 'address', 'street address']);
        const gender = pick(m, ['gender', 'sex']);
        const dateOfBirth = pick(m, ['date of birth', 'birth date', 'dob', 'dateofbirth', 'birthdate']);

        if (!fullName) {
          skippedCount++;
          continue;
        }
        const newPatient = new Patient({
          doc_id: docId,
          fullName,
          phoneNumber,
          email,
          address,
          gender,
          dateOfBirth,
          userTimezone: tz,
        });
        saves.push(newPatient.save().then(() => { importedCount++; }).catch(() => { skippedCount++; }));
      }

      await Promise.all(saves);
      await cleanup();
      return res.status(200).json({
        response: true,
        importedCount,
        skippedCount,
        message: importedCount > 0
          ? `Imported ${importedCount} patient${importedCount === 1 ? '' : 's'}${skippedCount ? ` (${skippedCount} skipped)` : ''}.`
          : 'No valid patient rows found in CSV (expected a Full Name or First Name / Last Name column).',
      });
    } catch (error) {
      console.error('Error importing patients:', error);
      await cleanup();
      return res.status(500).json({ response: false, message: 'Error importing patients: ' + (error.message || 'Please check CSV format.') });
    }
  });













// Global search across all patient fields (name, email, phone, DOB, address, etc.)
const searchPatientsGlobal = asyncHandler(async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === '') {
      return res.status(400).json({ response: false, msg: "Search query is required" });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escapedQuery, $options: 'i' };
    const smartFilter = await buildSmartPatientFilter(query, 'all');

    const caller = await User.findById(req.user).select('admin').lean();
    const scope = caller && caller.admin ? {} : { doc_id: req.user };
    const patients = await Patient.find({
      ...scope,
      $or: [
        ...(smartFilter.$or || []),
        { address: regex },
        { insuranceProvider: regex },
        { insurancePolicyNumber: regex },
        { medications: regex },
        { allergies: regex },
      ]
    }).limit(25).lean();

    await attachDos(patients);
    return res.json({ response: true, patients });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ response: false, msg: "Server error" });
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
    searchPatientsGlobal,
    exportAllPatients,
    importPatients
};
