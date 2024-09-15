// Twilio credentials from your Twilio dashboard
const accountSid = 'AC6a79e8a4343dc47b39e2556f0cccd353';  // Your Account SID from www.twilio.com/console
const authToken = 'af098fe36c5ba2b5677bab8f86ff5d3a';    // Your Auth Token from www.twilio.com/console

const client = require('twilio')(accountSid, authToken);

client.messages
  .create({
     body: 'Hello! This is a test message from Twilio.',
     from: '+972559531160',  // Your Twilio number (with country code)
     to: '+17866432099'    // The recipient's number (in E.164 format)
   })
  .then(message => console.log(message.sid))
  .catch(error => console.error(error));
