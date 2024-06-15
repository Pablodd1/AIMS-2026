const {createUser,signin,passcracker,getUserInfo} = require('./controllers/userController')

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




  app.get("/", (req, res) => {
    res.send("AIMS node.js backend api routes running");
  });

const PORT = 4000;

app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);
