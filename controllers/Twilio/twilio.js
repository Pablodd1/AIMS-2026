
const sendMessage = async(msg,to)=>{

    const authToken = '98fa428842a5e94d275808105daa6378';
    const accountSid = 'AC80571de3c2b43adccaaa358897b336db';
    const client = require('twilio')(accountSid, authToken);
    try{
      const res = await client.messages
      .create({
        body: msg,
        from: '+18337899628',
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