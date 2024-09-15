const cloudinary = require('cloudinary').v2;
const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
// const { sign } = require("jsonwebtoken");

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


  const { email,password } = req.body;
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
}
  catch(e)
  {
    res.json({response:false,msg:'Network Error'});
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

  const { _id , profile_picture , pic_public_Id } = req.body;
  try{
    await User.updateOne({_id},{profile_picture,pic_public_Id})
    return res.json({"response":true,msg:"Profile picture updated"})
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
cloudinary.config({
  cloud_name: 'dlasb4krd',
  api_key: '486585293283911',
  api_secret: 'LUDKjvJk-r_Xn1Dt7v3OSlIyK0'
});
async function deleteImage(publicId) {
  await cloudinary.uploader.destroy(company.imagePublicId, (error, result) => {
    if (error) {
      console.error('Error deleting previous image:', error);
      return false
    } else {
      console.log('Previous image deleted:', result);
      return true
    }
  });
}
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
    setEmptyPic
};
