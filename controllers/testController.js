const asyncHandler = require("express-async-handler");
const Visit = require("../models/Visit");
const testFunc = asyncHandler(async(req,res)=>{
    
 await Visit.updateMany({},{reportType:"1.0"})
 res.send(true)
  
  })
  








module.exports = {
    testFunc,
};
