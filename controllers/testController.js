const asyncHandler = require("express-async-handler");
const axios = require('axios');

// Define the SMS API details
const API_KEY = 'rKUpPqW6XnvOcS01';
const SMS_API_URL = 'https://api.sendinblue.com/v3/transactionalSMS/sms';// Update this to the actual Mailin SMS API URL if different

// Prepare the SMS data
const smsData = {
    to: '3364569588', // Recipient phone number
    from: '3364569588', // Sender name or number (alphanumeric max length 11)
    text: 'Text message to send', // Message content (160 characters max per SMS)
    tag: 'Your tag name', // Custom tag for message tracking
    type: '', // Optional: 'marketing' or 'transactional'
    callback: 'http://callbackurl.com/' // Callback URL for delivery reports
};



const testFunc = asyncHandler(async(req,res)=>{

  try {
    const response = await axios.post(SMS_API_URL, smsData, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`, // Use Bearer token for authorization
            'Content-Type': 'application/json'
        }
    });
    
    console.log('SMS Sent:', response.data);
} catch (error) {
    console.error('Error sending SMS:', error.response ? error.response.data : error.message);
}
res.send(true)    
  })
  








module.exports = {
    testFunc,
};
