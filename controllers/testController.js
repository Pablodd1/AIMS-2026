const asyncHandler = require("express-async-handler");
const cloudinary = require('cloudinary').v2;
const Appointment = require('../models/Appointment')

cloudinary.config({
    cloud_name: 'dklqbx5k0',
    api_key: '586219556714458',
    api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
});


const testFunc = asyncHandler(async(req,res)=>{
    
  await Appointment.updateMany({},{status:'Scheduled'})

res.send(true)    
  })
  








module.exports = {
    testFunc,
};
