const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const testFunc = asyncHandler(async(req,res)=>{
    
 await User.updateMany({},{assistants:[]})

res.send(true)    
  })
  








module.exports = {
    testFunc,
};
