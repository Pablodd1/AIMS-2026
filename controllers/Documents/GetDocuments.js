const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');

const getDocuments = asyncHandler(async(req,res)=>{
    try
    {
      const docs = await Document.find({userId:req.user})
      res.status(200).json({documents:docs,response:true})
    }
    catch(e)
    {
      res.json({response:false})
    }
})

module.exports = {
    getDocuments
};