const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document')

const deleteDocument = asyncHandler(async(req,res)=>{
    try
    {
      const { docId } =  req.query
      await Document.deleteOne({_id:docId})
      return res.json({response:true})
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    deleteDocument
};