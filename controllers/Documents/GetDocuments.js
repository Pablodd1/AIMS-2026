const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');

const getDocuments = asyncHandler(async(req,res)=>{
    try
    {
      const { pId } = req.body
      const docs = await Document.find({pId})
      return res.json({documents:docs,response:true})
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    getDocuments
};