
const sendMessage = async(msg,to)=>{

    // jeeffrey 
    // const authToken = '98fa428842a5e94d275808105daa6378';
    // const accountSid = 'AC80571de3c2b43adccaaa358897b336db';
    // jasmel
        const authToken = '28729102e2163caa3555992f580e1013';
    const accountSid = 'AC038061eedcc47e1d7705b722fbb0eb81';
    const client = require('twilio')(accountSid, authToken);
    try{
      const res = await client.messages
      .create({
        body: msg,
        // from: '+18337899628',
        from:'+18332164335',
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