
const sendMessage = async()=>{

    const accountSid = 'AC038061eedcc47e1d7705b722fbb0eb81';
    const authToken = '28729102e2163caa3555992f580e1013';
    const client = require('twilio')(accountSid, authToken);

        client.messages
  .create({
    body: 'Hello, my name is Zain',
    from: '+17869708366',
    to: '+923364569588' // Recipient's phone number
  })
  .then(message => console.log(`Message sent with SID: ${message.sid}`))
  .catch(error => {
    console.error('Error sending message:', error.message);
    // Optionally, handle specific error codes here
  });
 }

    
module.exports = {
    sendMessage
};