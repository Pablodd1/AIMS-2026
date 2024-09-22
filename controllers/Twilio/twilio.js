
const sendMessage = async(msg,to)=>{

    const authToken = '28729102e2163caa3555992f580e1013';
    const accountSid = 'AC038061eedcc47e1d7705b722fbb0eb81';
    const client = require('twilio')(accountSid, authToken);
    try{
      const res = await client.messages
      .create({
        body: msg,
        from: '+18332164335',
        to: to
      })
      console.log(res)
      return true
    }catch(e)
    {
      return false
    }
 }

    
module.exports = {
    sendMessage
};