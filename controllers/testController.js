const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const generateToken = require('../config/generateToken')
const CryptoJS = require("crypto-js");
const { response } = require("express");




const testFunc = asyncHandler(async(req,res)=>{

await User.updateMany({},{appCode:"",businessMail:""})
res.send(true)    
  })
  






module.exports = {
    testFunc,
};
