const asyncHandler = require("express-async-handler");
const cloudinary = require('cloudinary').v2;
const Appointment = require('../models/Appointment')

cloudinary.config({
    cloud_name: 'dklqbx5k0',
    api_key: '586219556714458',
    api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
});


const testFunc = asyncHandler(async(req,res)=>{
    
  // await Appointment.updateMany({},{status:'Scheduled'})
  const authToken = '28729102e2163caa3555992f580e1013';
  const accountSid = 'AC038061eedcc47e1d7705b722fbb0eb81';
  const client = require('twilio')(accountSid, authToken);
  client.messages
      .create({
          body: 'API TESTING',
          from: '+18332164335',
          to: '+923064155804'
      })
      .then(message => console.log(message.sid));

res.send(true)    
  })
  








module.exports = {
    testFunc,
};
