const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const Patients = require('../models/Patients')
const Visit = require('../models/Visit')
const Document = require('../models/Document') 
const { deleteAsset } = require('../controllers/Cloudinary/cloudinay');
const { sendQrCodeToPatient } = require('./mailController');
const Assistant = require('../models/Assistant');
const { ConversationsMessageFileImageInfo } = require("sib-api-v3-sdk");

const createUser = asyncHandler(async (req,res)=>{
  
  const { first_name, last_name ,email, phone_number , password,re_password  , title , Address , speciality  , clinicName} = req.body;
  if (req.method == "POST") {
    try {

      if(!first_name)
        return res.status(200).send({ msg:"Enter first name", response: false });
      else if(!last_name)
        return res.status(200).send({ msg:"Enter last name", response: false });
      else if(!email || !email.includes("@"))
        return res.status(200).send({ msg:"Enter email", response: false });
      else if(!password)
        return res.status(200).send({ msg:"Enter password", response: false });
      else if(password!=re_password)
        return res.status(200).send({ msg:"Passwod do not match", response: false });
      else if(!title)
        return res.status(200).send({ msg:"Enter title", response: false });
      else if(!Address)
        return res.status(200).send({ msg:"Enter Address", response: false });
      else if(!speciality)
        return res.status(200).send({ msg:"Enter speciality", response: false });
      else if(!clinicName)
        return res.status(200).send({ msg:"Enter clinicName", response: false });
      else{

          const isAccExits = await User.findOne({email})
          if(isAccExits!=null)
          {
            return res.status(200).send({ msg:"Accountt already exits with this email", response: false });
          }
          let u = await User.create({
            first_name,
            last_name,
            email,
            phone_number,
            title,
            speciality,
            Address,
            clinicName,
            password: CryptoJS.AES.encrypt(
              password,
              process.env.JWTSECRET
              ).toString(),
            });
             u.save()
            res.status(200).json({ msg: "account created", response:true });
          }

    } catch {
      res.status(200).json({response:false, msg: "You missed something" });
    }
  } else return res.status(200).json({success:false, error: "Bad Request" }); 


})
const signin = asyncHandler(async(req,res)=>{


  const { email,password,selectedRole } = req.body;
  if(!email || !password)
  {
    res.json({
      response: false,
      msg: "Enter email and password"
    });
  }
  const user = await User.findOne({ email });
  if(!user)
  {
    res.json({
      response: false,
      msg: "User not found"
    });
  }
  try{
    if(selectedRole == 'doctor'){

    const bytes  = CryptoJS.AES.decrypt(user.password,  process.env.JWTSECRET)
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if(password != originalText)
    {
      res.json({
        response: false,
        msg: "Wrong Password"
      });
    }
    else{
      res.status(200).json({
        response: true,
        msg:"success",
        token: {
          "access":generateToken(user._id),
        }
      });
    }
  }else{

    const { assistants } = await User.findOne({email}).select('assistants')

    if(assistants.length <=0){
      return res.json({
        response: false,
        msg: "User not found"
      });
    }
    let alllowLogin = false;
    
    for(let i=0;i<assistants.length;i++)
    {
      const obj = await Assistant.findOne({_id:assistants[i]})
      if(obj.access == false){
        alllowLogin = false;
        break
      } 
      const bytes  = CryptoJS.AES.decrypt(obj.password, process.env.JWTSECRET)
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if(originalText == password){
        alllowLogin = true;
        break
      }
    }
    if(alllowLogin){

      return res.json({
        response: alllowLogin,
        msg:"success",
        token: {
          "access":generateToken(user._id),
        }
      });
    }else{
      return res.json({
        response: alllowLogin,
        msg: "Invalid Credentials"
      });
    }
  }

}
  catch(e)
  {
    return res.json({response:false,msg:'Network Error'});
  }
})
const updatePassword = asyncHandler(async(req,res)=>{


    try{
      const pass = CryptoJS.AES.encrypt(
        req.body.updatePasswordState,
        process.env.JWTSECRET
        ).toString()
      
      await User.updateOne({_id:req.user},{password:pass})
      return res.status(200).json({ response: true,})
  }
  catch(e)
  {
      return res.status(500).json({ reesponse: false })
  }
})
const passcracker = asyncHandler(async(req,res)=>{
  const { email } = req.body
  let user = await User.findOne({email:email})
  if(user.email!=email)  res.status(200).json({error:'User not found' })
  const bytes  = CryptoJS.AES.decrypt(user.password, process.env.JWTSECRET)
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
   res.status(200).json({password:originalText})
})
const getUserInfo = asyncHandler(async(req,res)=>{
  try{
    const user = await User.findOne({_id:req.user})
    return res.status(200).json({ response: true, user})
}
catch(e)
{
    return res.status(500).json({ reesponse: false })
}
})
const updateProfile = asyncHandler(async(req,res)=>{
  try{
    const { _id,first_name, last_name ,email, phone_number  , title , Address , speciality  ,clinicName} = req.body;
   
    await User.updateOne({_id},{first_name,last_name,email,phone_number,title,Address,speciality,clinicName})
    return res.status(200).json({respnse:true,msg:"Clinic Profile Updated"})
  }catch(e){
    return res.status(200).json({respnse:false,msg:"Error try again"})
  }
})
const checkUserToken = asyncHandler(async(req,res)=>{

  try{
    return res.json({response:true,msg:"token is valid"})
  }
  catch(e)
  {
    return res.json({response:false,msg:"token is not valid"})
  }
})
const updateSignature = asyncHandler(async(req,res)=>{

   const { _id , signature } = req.body;
   try{
     await User.updateOne({_id},{signature})
     return res.json({"response":true,msg:"Signature updated"})
    }catch(e)
    {
      return res.json({"response":false,msg:"Failed to updated signature try again"})
    }
})
const updateProfiePicture = asyncHandler(async(req,res)=>{

  const { img ,folder } = req.body;
  try{
      if(folder == 'profile_picture')
      {
        await User.updateOne({_id:req.user},{$set:{'profile_picture':`${process.env.PUBLIC_BUCKET_AWS_URL}/${folder}/${img}`}})
        return res.json({"response":true,msg:"Profile Updated"})
      } 
      else if(folder == 'signature')
      {
        await User.updateOne({_id:req.user},{$set:{'signature':`${process.env.PUBLIC_BUCKET_AWS_URL}/${folder}/${img}`}})
        return res.json({"response":true,msg:"Profile Updated"})
      }else{
        await User.updateOne({_id:req.user},{$set:{'clinic_logo':`${process.env.PUBLIC_BUCKET_AWS_URL}/${folder}/${img}`}})
        return res.json({"response":true,msg:"Profile Updated"})
      }
      
    
   }catch(e)
   {
     return res.json({"response":false,msg:"Failed to updated profile picture try again"})
   }
})
const updateClinicLogo = asyncHandler(async(req,res)=>{

  const { _id , clinic_logo } = req.body;
  try{
    await User.updateOne({_id},{clinic_logo})
    return res.json({"response":true,msg:"Clinic logo updated"})
   }catch(e)
   {
     return res.json({"response":false,msg:"Failed to updated Clinic logo try again"})
   }
})
const delSignature = asyncHandler(async(req,res)=>{
  const { _id , publicId } = req.body;
  console.log(_id,publicId)
  const rres = await deleteImage("co1pbf9gbmy18rc1noy0")
  console.log(rres)
  //  try{
  //    if(await deleteImage(publicId) == true)
  //    {
  //      await User.updateOne({_id},{signature:""})
  //      return res.json({"response":true,msg:"Signature deleted"})
  //     }else{
        return res.json({"response":false,msg:"Failed to delete signature try again"})
//       }
//     }catch(e)
//     {
//       return res.json({"response":false,msg:"Failed to delete signature try again"})
//     }
})
const updatEmailredentials = asyncHandler(async(req,res)=>{
  try{
    const { businessMail , appCode } = req.body;
   
    await User.updateOne({_id:req.user},{businessMail,appCode})
    return res.status(200).json({respnse:true,msg:"Clinic Profile Updated"})
  }catch(e){
    return res.status(200).json({respnse:false,msg:"Error try again"})
  }
})
const updatewebsiteURL = asyncHandler(async(req,res)=>{
  try{
    const { website } = req.body;
   
    await User.updateOne({_id:req.user},{website})
    return res.status(200).json({respnse:true,msg:"Clinic Profile Updated"})
  }catch(e){
    return res.status(200).json({respnse:false,msg:"Error try again"})
  }
})
const setEmptyPic = asyncHandler(async(req,res)=>{
  const { publicId } = req.body
  console.log('hit')

  try{

    
    const res = await deleteImage(publicId)
    
    if(res==true)
    {
      // await User.updateOne({_id:req.user},{title:"",name:""})
      return res.json({"response":true})
    }
    return res.json({"response":false})
  }catch(e){
    return res.json({"response":true})
  }


  
})
const deletePatientHitory = asyncHandler(async(req,res)=>{
  const { pId , password } = req.body

    try
    {
    

     

    const user = await User.findOne({_id:req.user})

    const bytes  = CryptoJS.AES.decrypt(user.password,  process.env.JWTSECRET)
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if(password != originalText)
    {
      return res.json({
        response: false,
        msg: "Invalid Password"
      });
    }

      await Promise.all([
         Patients.deleteOne({_id:pId}),
         Visit.deleteMany({pId}),
         Document.deleteMany({pId})
      ])

     const docs = await Document.find({pId});

      for(let i=0;i<docs.length;i++)
      {
        await deleteAsset(docs[i].publicId)
      }

      return res.json({
        response: true,
        msg: "Successfully patient reccord deleted"
      });
    }
    catch(e)
    {
      return res.json({
        response: false,
        msg: "Sever error"
      });
    }
})
const sendQrCode = asyncHandler(async(req, res) => {
  const { 
    businessMail,
    appCode, 
    userEmail,
    id
  } = req.body;

  try {
    const link = `https://www.aidemoscriber.com/updatePatient/${id}`;
    sendQrCodeToPatient(businessMail, appCode, link, userEmail);
    
      return res.json({
        response: true,
        msg: "Email has been sent to the patient address"
      });
    
  } catch (e) {
    return res.json({
      response: false,
      msg: "There was an error while sending mail to the patient"
    });
  }
});
const setOpenAiKey = asyncHandler(async(req, res) => {
   const { key } = req.body;

   if(!key) return res.json({respose:false});
   
   const object = {
    "OpenAiKey": key
  };
  
  // First, check if the user already has an OpenAiKey in the keys array
  const user = await User.findOne({
    _id: req.user,
    keys: { $elemMatch: { OpenAiKey: object.OpenAiKey } }
  });
  
  // If the key exists, update it
  if (user) {
    await User.updateOne(
      { _id: req.user, "keys.OpenAiKey": object.OpenAiKey },
      { $set: { "keys.$.OpenAiKey": object.OpenAiKey } } // Update the specific key
    );
  } else {
    // If it doesn't exist, push the new key into the keys array
    await User.updateOne(
      { _id: req.user },
      { $push: { keys: object } } // Push the new key
    );
  }
})
const addAssistant = asyncHandler(async(req,res)=>{
  
  const { username , password , access , userTimeZone,totalAssistant} = req.body;

  try {

    if(totalAssistant>3)
    {
      return res.json({
        response: false,
        msg: "You have reached the limit of 3 assistants. Unable to add more."
      });
    }
    const assistant = await Assistant.create({
      docId:req.user,
      username,
      password: CryptoJS.AES.encrypt(
        password,
        process.env.JWTSECRET
        ).toString(),
      access,
      userTimeZone
     })

     console.log(assistant._id)

     

    await User.updateOne(
      { _id: req.user },
      { $push: { assistants: assistant._id } } // Ensure 'assistants' is an array in the schema
    );

     
    
      return res.json({
        response: true,
        msg: "New Assistant added in the clinic"
      });
    
  } catch (e) {
    return res.json({
      response: false,
      msg: "There was an error while adding new assistant"
    });
  }
})
const updateAssistant = asyncHandler(async(req,res)=>{
  
  const { assistantId , username , password , access } = req.body;

  try {

    await Assistant.updateOne(
      {
        _id:assistantId
      },
      {$set:{
        username,
        password: CryptoJS.AES.encrypt(
          password,
          process.env.JWTSECRET
          ).toString(),
        access
      }
     })
     
      return res.json({
        response: true,
        msg: `${username} information updated`
      });
    
  } catch (e) {
    return res.json({
      response: false,
      msg: `There was an error while updating ${username} information`
    });
  }
})
const getAssistant = asyncHandler(async(req,res)=>{
  
  try{

    const {assistants} = await User.findOne({_id:req.user}).select('assistants')
    
    const assistantsList=[];
    for(let i=0;i<assistants.length;i++)
    {
      const obj = await Assistant.findOne({_id:assistants[i]}).select('username password access')
      if(obj){
        const bytes  = CryptoJS.AES.decrypt(obj.password,  process.env.JWTSECRET)
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        obj['password'] = originalText;
        assistantsList.push(obj)
      }
    }
    
    return res.json({success:true,assistantsList})
  }catch(e){
    return res.json({success:false})
  }

})
const deleteAssistant = asyncHandler(async(req,res)=>{
  try{
    const { assistantId } = req.query
    await User.updateOne({_id:req.user},{$pull:{assistants:assistantId}})
    await Assistant.deleteOne({_id:assistantId})
    return res.json({success:true})
  }catch(e){
    return res.json({success:false})
  }

})







module.exports = {
    createUser,
    signin,
    passcracker,
    getUserInfo,
    updateProfile,
    checkUserToken,
    updateSignature,
    delSignature,
    updateProfiePicture,
    updateClinicLogo,
    updatEmailredentials,
    updatewebsiteURL,
    setEmptyPic,
    deletePatientHitory,
    updatePassword,
    sendQrCode,
    setOpenAiKey,
    addAssistant,
    updateAssistant,
    getAssistant,
    deleteAssistant
    
};
