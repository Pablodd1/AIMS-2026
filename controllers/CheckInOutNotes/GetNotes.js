const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

const getNotes  = asyncHandler(async (req, res) => {
    try{
     const notes = await CheckNotes.find({pId:req.query.id})
      return res.status(200).json({
        response:true,
        notes
      });

    }
    catch(e)
    {
        return res.status(500).json({
            response:false,
          });
    }
  })

  module.exports = {
    getNotes
  }