const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const { response } = require("express");


const createUser = asyncHandler(async (req,res)=>{
  
  const { id,first_name, last_name ,email, phone_number , password,re_password  , title , Address , speciality , responsible , base} = req.body;
  if (req.method == "POST") {
    try {
      // console.log(first_name,last_name,email,phone_n/umber,password,title,Address,speciality,responsible,base)

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
      else if(!responsible)
        return res.status(200).send({ msg:"Enter responsible", response: false });
      else if(!base)
        return res.status(200).send({ msg:"Enter base", response: false });
      else{
          let u = await User.create({
            first_name,
            last_name,
            email,
            phone_number,
            base,
            title,
            responsible,
            speciality,
            Address,
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
    return res.status(200).json({ reesponse: true, user})
}
catch(e)
{
    return res.status(500).json({ reesponse: false })
}
})



module.exports = {
    createUser,
    signin,
    passcracker,
    getUserInfo
};
