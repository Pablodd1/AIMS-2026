const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const Patients = require('../models/Patients')
const Visit = require('../models/Visit')
const Document = require('../models/Document') 
const { sendQrCodeToPatient } = require('./mailController');
const Assistant = require('../models/Assistant');
const jwt = require("jsonwebtoken");
const { deleteDocumentObject } = require('../controllers/AWS/DeleteObject')
const Invoice = require('../models/Invoice')
const Appointment = require('../models/Appointment')
const Doctor  = require('../models/Doctor');
const { ConversationsMessageFile } = require("sib-api-v3-sdk");

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


const { email,password,selectedRole,adminId } = req.body;

  

  if(selectedRole !="admin" && !adminId)
  {
    res.json({
      response: false,
      msg: "ID missing"
    });

  }

  if(!email || !password)
  {
    res.json({
      response: false,
      msg: "Enter email and password"
    });
  }

  try{

    if(selectedRole === "admin")
    {

      const user = await User.findOne({ email });
      
      if(!user)
      {
        res.json({
          response: false,
          msg: "User not found"
        });
      }

      const bytes  = CryptoJS.AES.decrypt(user.password,  process.env.JWTSECRET)
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if(password == originalText)
      {
        res.status(200).json({
          response: true,
          msg:"success",
          token: {
            "access":generateToken(user._id),
          },
          role:"Admin"
        });
      }else{
        return res.json({
          response: false,
          msg: "Invalid Credentials"
        });
      }
    }
    else if(selectedRole == 'doctor'){

      const user = await User.findOne({ _id:adminId});

      if(!user)
      {

       return res.json({
          response: false,
          msg: "Incorrect ID"
        });
      }


      const { doctors } = user
      
      if(doctors.length <=0){

        return res.json({
          response: false,
          msg: "User not found"
        });

      }

      let alllowLogin = false;

      const doc = await Doctor.findOne({username:email})
    
      for(let i=0;i<doctors.length;i++)
      {
        if(doctors[i] == doc._id)
        {
          alllowLogin = true;
        }
      }

      if(!alllowLogin){
        return res.json({
          response: false,
          msg: "User not found"
        });
      }

      const bytes  = CryptoJS.AES.decrypt(doc.password, process.env.JWTSECRET)
      const originalText = bytes.toString(CryptoJS.enc.Utf8);

      if(originalText != password)
      {
        return res.json({
          response: false,
          msg: "Invalid Credentials"
        });
      }

      if(!doc.access)
      {
        return res.json({
          response: false,
          msg: "Access Denied"
        });
      }

      if(doc.access){
        return res.json({
          response: true,
          msg:"success",
          token: {
            "access":generateToken(user._id),
          },
          assistantToken:{
            "access":generateToken(doc._id),
          },
          role:"Doctor"
        });
      }




    }
    else{

      const user = await User.findOne({ _id:adminId});
      
      if(!user)
      {
        res.json({
          response: false,
          msg: "Incorrect ID"
        });
      }


      // extra doctor login check 
      const { assistants } = user

      if(assistants.length <=0){

        return res.json({
          response: false,
          msg: "User not found"
        });

      }

      let alllowLogin = false;
      const ass = await Assistant.findOne({username:email})
      
    
      for(let i=0;i<assistants.length;i++)
      {
        
        if(assistants[i] == ass._id)
        {
          alllowLogin = true;
        }
      }

      if(!alllowLogin){
        return res.json({
          response: false,
          msg: "User not found"
        });
      }

      const bytes  = CryptoJS.AES.decrypt(ass.password, process.env.JWTSECRET)
      const originalText = bytes.toString(CryptoJS.enc.Utf8);

      if(originalText != password)
      {
        return res.json({
          response: false,
          msg: "Invalid Credentials"
        });
      }

      if(!ass.access)
      {
        return res.json({
          response: false,
          msg: "Access Denied"
        });
      }

      if(ass.access){
        return res.json({
          response: true,
          msg:"success",
          token: {
            "access":generateToken(user._id),
          },
          assistantToken:{
            "access":generateToken(ass._id),
          },
          role:"Assistant"
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
    const { AssToken } = req.body
    console.log(AssToken)
    if(AssToken==null)
    {
      return res.json({response:true,msg:"token is valid",role:"Admin"})
    }else{
      const decoded = jwt.verify(AssToken, process.env.JWTSECRET);
      const ass = await Assistant.findOne({_id:decoded.id}) 
      if(ass && ass.access==true)
      {
        return res.json({response:true,msg:"token is valid",role:"Assistant"})
      }
      const doc = await Doctor.findOne({_id:decoded.id}) 
      if(doc && doc.access==true)
      {
        return res.json({response:true,msg:"token is valid",role:"Doctor"})
      }
      else{
        console.log('hit')
        return res.json({response:false,msg:"Assistant token is not valid",role:"None"})
      }


    }
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
  // console.log(_id,publicId)
  const rres = await deleteImage("co1pbf9gbmy18rc1noy0")
  // console.log(rres)
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
  // console.log('hit')

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
  const { pId  } = req.body

    try
    {

      const docs = await Document.find({pId}).select('secure_url')

      await Promise.all([
         Patients.deleteOne({_id:pId}),
         Visit.deleteMany({pId}),
         Document.deleteMany({pId}),
         Invoice.deleteMany({pId}),
         Appointment.deleteMany({patientID:pId})
      ])


      for(let i=0;i<docs.length;i++)
      {
        await deleteDocumentObject(docs[i].secure_url)
      }

      return res.json({
        response: true,
        msg: "Successfully patient record deleted"
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
  const { username , password , access ,total} = req.body;
  try {

    if(total>=3)
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
      access
     })

     

    await User.updateOne(
      { _id: req.user },
      { $push: { assistants: assistant._id.toString() } } // Ensure 'assistants' is an array in the schema
    );

     
    
      return res.json({
        response: true,
        msg: "Assistant has been added successfully"
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
        msg: `Assistant has been Edited successfully.`
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
    return res.json({success:true,msg:"Assistant has been deleted successfully"})
  }catch(e){
    return res.json({success:false})
  }

})
const addDoctor = asyncHandler(async(req,res)=>{
  const { username , password , access ,total} = req.body;
  try {
    if(total>=3)
    {
      return res.json({
        response: false,
        msg: "You have reached the limit of 3 doctors. Unable to add more."
      });
    }
    const doctor = await Doctor.create({
      docId:req.user,
      username,
      password: CryptoJS.AES.encrypt(
        password,
        process.env.JWTSECRET
        ).toString(),
      access
     })

     

    await User.updateOne(
      { _id: req.user },
      { $push: { doctors: doctor._id.toString() } } // Ensure 'assistants' is an array in the schema
    );

     
    
      return res.json({
        response: true,
        msg: "Doctor has been added successfully"
      });
    
  } catch (e) {
    return res.json({
      response: false,
      msg: "There was an error while adding new Doctor"
    });
  }
})
const deleteDoctor = asyncHandler(async(req,res)=>{
  try{
    const { doctorId } = req.query
    await User.updateOne({_id:req.user},{$pull:{doctors:doctorId}})
    await Doctor.deleteOne({_id:doctorId,})
    return res.json({success:true,msg:"Doctor has been deleted successfully"})
  }catch(e){
    return res.json({success:false})
  }

})
const getDoctors = asyncHandler(async(req,res)=>{
  
  try{
    const {doctors} = await User.findOne({_id:req.user}).select('doctors')

    
    const doctorsList=[];
    for(let i=0;i<doctors.length;i++)
    {
      const obj = await Doctor.findOne({_id:doctors[i]}).select('username password access')
      if(obj){
        const bytes  = CryptoJS.AES.decrypt(obj.password,  process.env.JWTSECRET)
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        obj['password'] = originalText;
        doctorsList.push(obj)
      }
    }
    return res.json({success:true,doctorsList})
  }catch(e){
    return res.json({success:false})
  }

})
const updateDoctor= asyncHandler(async(req,res)=>{
  
  const { assistantId , username , password , access } = req.body;

  try {

    await Doctor.updateOne(
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
        msg: `Doctor has been Edited successfully.`
      });
    
  } catch (e) {
    return res.json({
      response: false,
      msg: `There was an error while updating ${username} information`
    });
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
    deleteAssistant,
    addDoctor,
    getDoctors,
    deleteDoctor,
    updateDoctor
    
};
