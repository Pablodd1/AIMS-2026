const {updateDoctor,deleteDoctor,getDoctors,addDoctor,deleteAssistant,getAssistant,updateAssistant,addAssistant,createUser,signin,getUserInfo,updateProfile,checkUserToken,updateSignature,delSignature,updateProfiePicture,updateClinicLogo,updatEmailredentials,updatewebsiteURL,setEmptyPic,deletePatientHitory,updatePassword,sendQrCode,setOpenAiKey} = require('./controllers/userController')
const {createPatient,getPatients,getPatientById,updatePatient,getTodayPatients,getPaitentsCount,getTodayPatietnsForAppointment,addInstantPatient,updateVoiceIntake,searchPatientsByAlphabet,searchPatientsByType,searchPatientsByTypeAndLimit5,exportAllPatients,importPatients,searchPatientsGlobal} = require('./controllers/patientController')
const {createVisit,viewReport,getVists,getAllVisits,editReport,delVisit , updateVisitDate,recentVisit,newReportMethodStoredIntoDb} = require('./controllers/Visits/visitController')
const { getRecentUsers,adminLogin , fetchAllDoctors, fetchAllAdmins,fecthDemoAccounts,demoUserCount,createDemoUser} = require("./controllers/adminController")
const { createAppointment , getbyDateAppointment , delAppointment , editAppTime , calenderDates , changeStatus, filterAppointments,userResponseFromEmail,appointmentReport,allAppointments} = require('./controllers/appointmentController')
const {sendFeedBack , fetchFeedBack , deleteFeedBackById } = require('./controllers/feedbackController')
require("dotenv").config();
const { speechToTextForm ,patientDataToSummary , speechToTextFormWithOcr, extractPatientDataFromImage, downloadNoteAsAudio, validateRedFlags, suggestTreatment, extractDxCptCodes, generateNoteWithHistory, runQualityCheck, translateToEnglish, interpretCommand, generateReportFromAudioFile, extractIntakeEntities } = require('./controllers/openaiController')
const { makeInvoice , getAllInvoices , getInvoiceById , getInvoiceAnalyitcs , updateInvoice , deleteInvoice, invoiceStatus, getAllByStatus } = require('./controllers/Invoice/invoiceController')
const { uploadPDF, getDocuments , deleteDocument, updateDocumentDate } = require('./controllers/Documents/DocumentController')
const {  reportDocx , reportPdf ,createQuickDocx , reportDocxDirectDownload,ameriarePatientDocument,inspectionDownload} = require('./controllers/Downloads/downloadController')
const {  getObject , getSignedUrlForUpload , deleteObject} = require ('./controllers/AWS/AwsController')
const {  addNote, checkIn, getTodayCheckIns, deleteNote, getNotes } = require('./controllers/CheckInOutNotes/NotesController')
const { createLabResult, uploadLabFile, getLabResults, getLabResultById, deleteLabResult, exportLabResults, getLabTrends } = require('./controllers/labController')
const { seedDefaultNoteTypes, getNoteTypes, getNoteType, createNoteType, updateNoteType, deleteNoteType, getQuestionsForIntake } = require('./controllers/noteTypeController')
const { testFunc } = require('./controllers/testController')
const {
  patientLogin,
  getPatientAppointments,
  getPatientVisitHistory,
  patientAuth,
} = require('./controllers/patientPortalController')
const {
  getPatientVisits,
  exportVisitDocx,
} = require('./controllers/visitExportController')
const {
  searchMedicalCodes,
  getCodeCategories,
  addCustomCode,
  updateCustomCode,
  addFavoriteCode,
  removeFavoriteCode,
  getFavoriteCodes,
  getRecentCodes,
  runBillingCompliance,
} = require('./controllers/medicalCodesController')
const { updateNotificationSettings, getDailySchedule, sendDailySchedule, triggerDailySchedule } = require('./controllers/notificationController')
const { protect } = require('./middleware/authMiddleware')
const bodyParser = require('body-parser');
const  ensureUploadsDirectory  = require('./Helper/makeDirectory')
const connectDB = require('./config/db')
const express = require("express");
const cors = require('cors');
const multer = require('multer');
const { agingBioHack } = require('./controllers/mailController')
connectDB()

// Seed default note types on first run
seedDefaultNoteTypes().catch(console.error);
// seedMedicalCodes().catch(console.error); // Temporarily disabled



// Call the function
ensureUploadsDirectory();




const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());// allow front api's
app.use(express.json()); // to accept json data
app.use(cors({
  origin: '*' // Replace with your Next.js frontend URL
}));


//multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Define where to store the files
    cb(null, './uploads'); // Uploads directory should exist
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1]
    cb(null, file.fieldname + '-' + Date.now() + '.' + ext);
  }
});



const uploadSet1 = multer({ storage });

//user Routes
app.post('/api/v1/auth/users/',createUser);
app.post('/api/v1/auth/jwt/create/',signin)
app.get('/api/v1/auth/users/me',protect,getUserInfo)
app.post('/api/post/updateProfile',protect,updateProfile)
app.post('/api/post/checkUserToken',protect,checkUserToken)
app.get('/api/get/checkUserToken',(req,res)=>{const t=req.headers.authorization?.split(' ')[1];if(!t)return res.json({response:true,msg:'token is valid',role:'Admin'});try{const d=require('jsonwebtoken').verify(t,process.env.JWTSECRET);return res.json({response:true,msg:'token is valid',role:'Admin'});}catch(e){return res.json({response:false,msg:'token is not valid'})}})
app.post('/api/post/updatEmailredentials',protect,updatEmailredentials)
app.post('/api/post/updatewebsiteURL',protect,updatewebsiteURL)
app.post('/api/post/setEmptyPic',setEmptyPic)
app.post('/api/post/deletePatientHitory',protect,deletePatientHitory)
app.post('/api/post/updatePassword',protect,updatePassword)
app.post('/api/post/sendQrCode',sendQrCode)
app.post('/api/post/setOpenAiKey',protect,setOpenAiKey)
// Notification settings — daily schedule delivery
app.post('/api/post/updateNotificationSettings',protect,updateNotificationSettings)
app.get('/api/get/dailySchedule',protect,getDailySchedule)
app.post('/api/post/sendDailySchedule',protect,sendDailySchedule)
app.get('/api/get/triggerDailySchedule',triggerDailySchedule)
//add-new-assistant
app.post('/api/post/addAssistant',protect,addAssistant)
app.post('/api/post/updateAssistant',protect,updateAssistant)
app.get('/api/get/getAssistants',protect,getAssistant)
app.delete('/api/delete/deleteAssistant',protect,deleteAssistant)
//add-new-doctors
app.post('/api/post/addDoctor',protect,addDoctor)
app.get('/api/get/getDoctors',protect,getDoctors)
app.delete('/api/delete/deleteDoctor',protect,deleteDoctor)
app.post('/api/post/updateDoctor',protect,updateDoctor)


//patient Routes
app.post('/api/post/createPatient',createPatient)
app.get('/api/get/getPatients',protect,getPatients)
app.get('/api/get/getTodayPatients',protect,getTodayPatients)
app.get('/api/get/getPatientById',getPatientById)
app.post('/api/post/updatePatient',updatePatient)
app.get("/api/get/editReport",protect,editReport)
app.get('/api/get/getPaitentsCount',protect,getPaitentsCount)
app.get('/api/get/getTodayPatietnsForAppointment',protect,getTodayPatietnsForAppointment)
app.post('/api/post/addInstantPatient',protect,addInstantPatient)
app.post('/api/post/updateVoiceIntake',updateVoiceIntake)
app.post('/api/post/searchPatientsByAlphabet',protect,searchPatientsByAlphabet)
app.post('/api/post/searchPatientsByType',protect,searchPatientsByType)
app.post('/api/post/searchPatientsByTypeAndLimit5',protect,searchPatientsByTypeAndLimit5)
app.post('/api/post/searchPatientsGlobal',protect,searchPatientsGlobal)
app.get('/api/get/exportAllPatients',protect,exportAllPatients)
app.post('/api/post/importPatients',protect,uploadSet1.single('file'),importPatients)

// Lab Results routes
app.post('/api/post/createLabResult',protect,createLabResult)
app.post('/api/post/uploadLabFile',protect,uploadSet1.single('file'),uploadLabFile)
app.get('/api/get/getLabResults',protect,getLabResults)
app.get('/api/get/getLabResultById',protect,getLabResultById)
app.delete('/api/delete/deleteLabResult',protect,deleteLabResult)
app.get('/api/get/exportLabResults',protect,exportLabResults)
app.get('/api/get/getLabTrends',protect,getLabTrends)

// Note Type routes (admin panel)
app.get('/api/get/getNoteTypes',protect,getNoteTypes)
app.get('/api/get/getNoteType',protect,getNoteType)
app.post('/api/post/createNoteType',protect,createNoteType)
app.put('/api/put/updateNoteType',protect,updateNoteType)
app.delete('/api/delete/deleteNoteType',protect,deleteNoteType)
app.get('/api/get/getQuestionsForIntake', getQuestionsForIntake)

//visit routes
app.post('/api/post/createVisit',protect,createVisit);
app.get("/api/get/viewReport",protect,viewReport)
app.get('/api/get/getVists',protect,getVists)
app.get('/api/get/getAllVisits',protect,getAllVisits)
app.delete('/api/del/delVisit',protect,delVisit)
app.post('/api/post/updateVisitDate',protect,updateVisitDate)
app.get('/api/get/recentVisit',protect,recentVisit)
app.post('/api/post/newReportMethodStoredIntoDb',protect,newReportMethodStoredIntoDb)

//admin routes
app.get('/api/get/getRecentUsers',protect,getRecentUsers)
app.post('/api/post/v1/auth/jwt/create/admin',adminLogin)


//admin -> feedback 
app.post('/api/post/sendFeedBack',sendFeedBack)
app.get('/api/get/fetchFeedBack',protect,fetchFeedBack)
app.post('/api/post/deleteFeedBackById',protect,deleteFeedBackById)
//admin->doctors
app.get('/api/get/fetchAllDoctors',protect,fetchAllDoctors)
//admin->admins
app.get('/api/get/fetchAllAdmins',protect,fetchAllAdmins)
//test routes
app.get('/api/get/test',testFunc)
// System health
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const uptime = process.uptime();
  const d = new Date(uptime * 1000);
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  res.json({
    status: 'ok',
    uptime: `${days}d ${hours}h`,
    started: new Date(Date.now() - uptime * 1000).toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
    version: '2.0',
    env: process.env.NODE_ENV || 'production',
  });
});


// admin->demo
app.post('/api/get/fecthDemoAccounts',fecthDemoAccounts)
app.post('/api/get/demoUserCount',demoUserCount)
app.post('/api/post/createDemoUser',protect,createDemoUser)

//signature
app.post('/api/post/updateSignature',protect,updateSignature)
app.post('/api/del/delSignature',protect,delSignature)

//profie pic
app.post('/api/post/updateProfiePicture',protect,updateProfiePicture)
//clinic logo
app.post('/api/post/updateClinicLogo',protect,updateClinicLogo)

//oepnai
app.post('/api/post/speechToText',uploadSet1.single('file'),speechToTextForm)
app.post('/api/post/generateReportFromAudioFile', uploadSet1.single('file'), generateReportFromAudioFile)
app.post('/api/post/speechToText/both',uploadSet1.fields([{ name: 'file1', maxCount: 1 },{ name: 'file2', maxCount: 1 },]),speechToTextFormWithOcr)
// Image OCR — replaces dead Flask/Django endpoint
app.post('/api/post/extractPatientDataFromImage', uploadSet1.single('image'), extractPatientDataFromImage)
// Smart assistant — generates notes with previous visit history
app.post('/api/post/generateNoteWithHistory', protect, generateNoteWithHistory)
// Auto-treatment suggestions
app.post('/api/post/suggestTreatment', protect, suggestTreatment)
// Validate red flags
app.post('/api/post/validateRedFlags', protect, validateRedFlags)
// Extract DX/CPT codes
app.post('/api/post/extractDxCptCodes', protect, extractDxCptCodes)
// Download note as audio
app.get('/api/get/downloadNoteAsAudio', protect, downloadNoteAsAudio)
// 3-Agent quality check
app.post('/api/post/runQualityCheck', protect, runQualityCheck)
// Translation — Spanish/Creole to English
app.post('/api/post/translateToEnglish', translateToEnglish)
// AI command interpreter
app.post('/api/post/interpretCommand', interpretCommand)

// Medical codes (DX/CPT) — Phase 1 port from NEW-AIMS-UPGRADED
app.post('/api/post/searchMedicalCodes', protect, searchMedicalCodes)
app.get('/api/get/getCodeCategories', protect, getCodeCategories)
app.post('/api/post/addCustomCode', protect, addCustomCode)
app.post('/api/post/updateCustomCode', protect, updateCustomCode)
app.post('/api/post/addFavoriteCode', protect, addFavoriteCode)
app.post('/api/post/removeFavoriteCode', protect, removeFavoriteCode)
app.get('/api/get/getFavoriteCodes', protect, getFavoriteCodes)
app.get('/api/get/getRecentCodes', protect, getRecentCodes)
app.post('/api/post/runBillingCompliance', protect, runBillingCompliance)

app.post('/api/post/extractIntakeEntities', extractIntakeEntities)
app.post('/api/post/patientDataToSummary',patientDataToSummary)

//appointments
app.post('/api/post/createAppointment',protect,createAppointment)
app.post('/api/get/getbyDateAppointment',protect,getbyDateAppointment)
app.post('/api/del/delAppointment',protect,delAppointment)
app.post('/api/edit/editAppTime',protect,editAppTime)
app.post('/api/post/changeStatus',protect,changeStatus)
app.post('/api/get/calenderDates',calenderDates)
app.post('/api/post/filterAppointments',protect,filterAppointments)
app.post('/api/post/userResponseFromEmail',userResponseFromEmail) // change status
app.get('/api/get/userResponseFromEmail',userResponseFromEmail) /// allow to user to change status
app.get('/api/get/appointmentReport',protect,appointmentReport)
app.get('/api/get/allAppointments',protect,allAppointments)
// documents 
app.post('/api/post/uploadPDF',protect,uploadPDF)
app.post('/api/get/getDocuments',protect,getDocuments)
app.delete('/api/delete/deleteDocument',protect,deleteDocument)
app.post('/api/post/updateDocumentDate',protect,updateDocumentDate)

//Invoice
app.post('/api/post/makeInvoice',protect,makeInvoice)
app.get('/api/get/getAllInvoices',protect,getAllInvoices)
app.post('/api/post/getInvoiceById',protect,getInvoiceById)
app.post('/api/post/getInvoiceAnalyitcs',protect,getInvoiceAnalyitcs)
app.post('/api/post/updateInvoice',protect,updateInvoice)
app.delete('/api/delete/deleteInvoice',protect,deleteInvoice)
app.post('/api/post/invoiceStatus',protect,invoiceStatus)
app.get('/api/get/getAllByStatus',protect,getAllByStatus)


//Downloads (report,pdf)
app.get('/api/get/reportDocx',protect,reportDocx)
app.get('/api/get/reportPdf',protect,reportPdf)
app.get('/api/post/createQuickDocx',protect,createQuickDocx)
app.post('/api/post/reportDocxDirectDownload',reportDocxDirectDownload)
app.post('/api/post/ameriarePatientDocument',ameriarePatientDocument)
//inspection
app.post('/api/post/inspectionDownload',inspectionDownload)
// Visit timeline & export
app.get('/api/get/getPatientVisits', protect, getPatientVisits)
app.get('/api/get/exportVisitDocx/:visitId', protect, exportVisitDocx)

// Patient Portal
app.post('/api/post/patientLogin', patientLogin)
app.get('/api/get/patientAppointments', patientAuth, getPatientAppointments)
app.get('/api/get/patientVisitHistory', patientAuth, getPatientVisitHistory)


//AWS-S3
app.get('/api/get/getSignedUrlForUpload',protect,getSignedUrlForUpload)
app.get('/api/get/getObject',protect,getObject)
app.delete('/api/delete/deleteObject',protect,deleteObject)

//CheckIn/OutNotes
app.get('/api/get/getNotes',protect,getNotes)
app.post('/api/post/addNote',protect,addNote)
app.post('/api/post/checkIn',protect,checkIn)
app.get('/api/get/getTodayCheckIns',protect,getTodayCheckIns)
app.delete('/api/delete/deleteNote/:id',protect,deleteNote)


//agingBioHack
app.post('/api/post/email/agingbiohack',agingBioHack)

// route 
app.get("/", (req, res) => {
    res.send("AIMS backend api routes running");
});

const PORT = 4000;

app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);
