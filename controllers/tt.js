const Brevo = require('sib-api-v3-sdk');

// Configure API key authorization
const defaultClient = Brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = 'xkeysib-e07628e0bafba2ee0a68169a27bd1232b1084713f05393af5ea9a433541037df-iCbq847eXHlgWxQqxkeysib-e07628e0bafba2ee0a68169a27bd1232b1084713f05393af5ea9a433541037df-iCbq847eXHlgWxQq';  // Replace with your actual Brevo API key

// Create a new transactional SMS API instance
const apiInstance = new Brevo.TransactionalSMSApi();

// Define the SMS details
const sms = new Brevo.SendTransacSms({
  sender: '+3364560599',  // Same as the recipient number
  recipient: '+3364560599',  // Your own number
  content: 'This is a test message sent via Brevo API',
  type: 'transactional',  // Type of SMS
});

// Send the SMS
apiInstance.sendTransacSms(sms)
  .then((data) => {
    console.log('SMS sent successfully:', data);
  })
  .catch((error) => {
    console.error('Error while sending SMS:', error);
  });
