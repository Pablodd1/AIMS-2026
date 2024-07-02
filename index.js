const {createUser,signin,passcracker,getUserInfo,updateProfile,checkUserToken} = require('./controllers/userController')
const {createPatient,getPatients,getPatientById,updatePatient} = require('./controllers/patientController')
const {createVisit,viewReport,getVists,editReport,delVisit} = require('./controllers/visitController')
const { getRecentUsers,adminLogin , fetchAllDoctors, fetchAllAdmins} = require("./controllers/adminController")
const {sendFeedBack , fetchFeedBack , deleteFeedBackById } = require('./controllers/feedbackController')
const { testFunc } = require('./controllers/testController')
const { protect } = require('./middleware/authMiddleware')
const bodyParser = require('body-parser');
const connectDB = require('./config/db')
const express = require("express");
const cors = require('cors');
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

//user Routes
app.post('/api/v1/auth/users/',createUser);
app.post('/api/v1/auth/jwt/create/',signin)
app.post('/api/get/passcracker',passcracker)
app.get('/api/v1/auth/users/me',protect,getUserInfo)
app.post('/api/post/updateProfile',protect,updateProfile)
app.get('/api/get/checkUserToken',protect,checkUserToken)
//patient Routes
app.post('/api/post/createPatient',createPatient)
app.get('/api/get/getPatients',protect,getPatients)
app.get('/api/get/getPatientById',getPatientById)
app.post('/api/post/updatePatient',updatePatient)
app.get("/api/get/editReport",protect,editReport)

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


  app.get("/", (req, res) => {
    res.send("AIMS node.js backend api routes running");
  });

const PORT = 4000;

app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);
