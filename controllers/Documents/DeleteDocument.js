const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document')
const { deleteAsset } = require('../Cloudinary/cloudinay')
const { deleteDocumentObject } = require('../AWS/AwsController')

const deleteDocument = asyncHandler(async(req,res)=>{
    try
    {
      const { docId , publicId } =  req.query
      const status = await deleteDocumentObject(publicId)
      if(status)
      {
        await Document.deleteOne({_id:docId})
        return res.json({response:true})
      }else{
        return res.json({response:false})
      }
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    deleteDocument
};