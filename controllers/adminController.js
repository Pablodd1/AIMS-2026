const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const { response } = require("express");




const getRecentUsers = asyncHandler(async(req,res)=>{

    try{
      const users = await User.find({admin:false}).sort({ createdAt: -1 }).limit(4) 
      const counts = await User.find({admin:false}).count();
      const admins = await User.find({admin:true}).count();
      return res.status(200).json({ response: true, users,counts,admins})
  }
  catch(e)
  {
      return res.status(500).json({ reesponse: false })
  }  
  })

const adminLogin = asyncHandler(async(req,res)=>{


    const { email,password } = req.body;
    if(!email || !password)
    {
      res.json({
        response: false,
        msg: "Enter email and password"
      });
    }
    const user = await User.findOne({ email });
    if(user.role == false){
        res.json({
            response: false,
            msg: "User is not admin"
          });
    }
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
  






module.exports = {
    getRecentUsers,
    adminLogin
    
};
