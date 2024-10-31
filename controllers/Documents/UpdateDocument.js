
const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');


const updateDocumentDate = asyncHandler(async(req,res)=>{
    try
    {
      const { id, date , name } =  req.body

      await Document.updateOne(
        {
        _id:id
       },{
        $set:{
            date,
            fileOriginalName:name
        }
       })

      return res.json({response:true,msg:"Document date changed"})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    updateDocumentDate
};
