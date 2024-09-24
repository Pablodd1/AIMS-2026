const {createUser,signin,passcracker,getUserInfo,updateProfile,checkUserToken,updateSignature,delSignature,updateProfiePicture,updateClinicLogo,updatEmailredentials,updatewebsiteURL,setEmptyPic,deletePatientHitory,updatePassword} = require('./controllers/userController')
const {createPatient,getPatients,getPatientById,updatePatient,getTodayPatients,getPaitentsCount,getTodayPatietnsForAppointment,addInstantPatient,updateVoiceIntake} = require('./controllers/patientController')
const {createVisit,viewReport,getVists,editReport,delVisit} = require('./controllers/visitController')
const { getRecentUsers,adminLogin , fetchAllDoctors, fetchAllAdmins,fecthDemoAccounts,demoUserCount,createDemoUser} = require("./controllers/adminController")
const { createAppointment , getbyDateAppointment , delAppointment , editAppTime , calenderDates , changeStatus, filterAppointments} = require('./controllers/appointmentController')
const {sendFeedBack , fetchFeedBack , deleteFeedBackById } = require('./controllers/feedbackController')
const { speechToTextForm ,patientDataToSummary} = require('./controllers/openaiController')
const { uploadPDF, getDocuments , deleteDocument } = require('./controllers/Documents/DocumentController')
const { testFunc } = require('./controllers/testController')
const { protect } = require('./middleware/authMiddleware')
const bodyParser = require('body-parser');
const connectDB = require('./config/db')
const express = require("express");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
connectDB()



const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());// allow front api's
app.use(express.json()); // to accept json data
app.use(cors({
  origin: '*' // Replace with your Next.js frontend URL
}));


//multer
const storage1 = multer.diskStorage({
  destination: function(req, file, cb) {
    // Define where to store the files
    cb(null, './uploads'); // Uploads directory should exist
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname('audio.webm'));
  }
});

const storage2 = multer.diskStorage({
  destination: function(req, file, cb) {
    // Define where to store the files
    cb(null, './pdfs'); // Uploads directory should exist
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + '.' + 'pdf');
  }
});



const uploadSet1 = multer({ storage: storage1 });
const uploadSet2 = multer({ storage: storage2 });

//user Routes
app.post('/api/v1/auth/users/',createUser);
app.post('/api/v1/auth/jwt/create/',signin)
app.post('/api/get/passcracker',passcracker)
app.get('/api/v1/auth/users/me',protect,getUserInfo)
app.post('/api/post/updateProfile',protect,updateProfile)
app.get('/api/get/checkUserToken',protect,checkUserToken)
app.post('/api/post/updatEmailredentials',protect,updatEmailredentials)
app.post('/api/post/updatewebsiteURL',protect,updatewebsiteURL)
app.post('/api/post/setEmptyPic',setEmptyPic)
app.post('/api/post/deletePatientHitory',protect,deletePatientHitory)
app.post('/api/post/updatePassword',protect,updatePassword)
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

//visit routes
app.post('/api/post/createVisit',protect,createVisit);
app.get("/api/get/viewReport",protect,viewReport)
app.get('/api/get/getVists',protect,getVists)
app.delete('/api/del/delVisit',protect,delVisit)

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
app.post('/api/post/patientDataToSummary',patientDataToSummary)

//appointments
app.post('/api/post/createAppointment',protect,createAppointment)
app.post('/api/get/getbyDateAppointment',protect,getbyDateAppointment)
app.post('/api/del/delAppointment',protect,delAppointment)
app.post('/api/edit/editAppTime',protect,editAppTime)
app.post('/api/post/changeStatus',protect,changeStatus)
app.post('/api/get/calenderDates',calenderDates)
app.post('/api/post/filterAppointments',protect,filterAppointments)
// documents 
app.post('/api/post/uploadPDF',protect,uploadSet2.single('file'),uploadPDF)
app.post('/api/get/getDocuments',protect,getDocuments)
app.delete('/api/delete/deleteDocument',protect,deleteDocument)


app.get("/", (req, res) => {
    res.send("AIMS backend api routes running");
});

const PORT = 4000;

app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);
