const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document')
const { deleteAsset } = require('../Cloudinary/cloudinay')
const { deleteDocumentObject } = require('../AWS/AwsController')

const deleteDocument = asyncHandler(async(req,res)=>{
    try
    {
      const { docId , publicId } =  req.query
      // record deletion must not depend on S3 (key quarantine / local storage)
      const fs = require("fs");
      const path = require("path");
      let removed = await deleteDocumentObject(publicId);
      const fp = path.join("/home/aims/uploads", String(publicId || ""));
      if (publicId && !String(publicId).includes("..") && fs.existsSync(fp)) { fs.unlinkSync(fp); removed = true; }
      // always drop the record; S3/local removal above is best-effort
      await Document.deleteOne({_id:docId})
      return res.json({response:true, storageRemoved: !!removed})
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    deleteDocument
};