const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

const deleteNote  = asyncHandler(async (req, res) => {
    try{



    const  result =  await CheckNotes.deleteOne({_id:req.params.id})
    if(result)
    {
        return res.status(200).json({
            response:true,
            msg:"Note deleted",
        });
    }else{
        return res.status(200).json({
            response:false,
          });
    }

    }
    catch(e)
    {
        return res.status(500).json({
            response:false,
          });
    }
  })

  module.exports = {
    deleteNote
  }