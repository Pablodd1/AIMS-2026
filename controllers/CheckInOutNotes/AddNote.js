const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

const addNote  = asyncHandler(async (req, res) => {
    try{
      req.body['docId'] = req.user
      const note =  await CheckNotes.create(req.body)
      return res.status(201).json({
        response:true,
        msg:"Note added",
        note:note
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
    addNote
  }