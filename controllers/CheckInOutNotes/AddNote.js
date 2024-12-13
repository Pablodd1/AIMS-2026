const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");


const addNote = asyncHandler(async (req, res) => {
    try {
        const { pId, checkInTime, checkOutTime, checkInDate, userTimezone } = req.body;

        if (!pId || !checkInTime || !checkOutTime || !checkInDate || !userTimezone) {
            return res.status(400).json({
                response: false,
                msg: "Missing required fields. Please provide all required data."
            });
        }

        req.body['docId'] = req.user
        const note = await CheckNotes.create(req.body);
        return res.status(201).json({
            response: true,
            msg: "Note added",
            note: note
        });

    } catch (e) {
        console.error(e); 
        return res.status(500).json({
            response: false,
            msg: "An error occurred while adding the note."
        });
    }
});

module.exports = { addNote };


  module.exports = {
    addNote
  }