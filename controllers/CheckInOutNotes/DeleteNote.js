const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

const deleteNote = asyncHandler(async (req, res) => {
    try {
        // Validate request parameter
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                response: false,
                message: "Missing required parameter: id",
            });
        }

        // Check if the note exists
        const noteExists = await CheckNotes.findById(id);
        if (!noteExists) {
            return res.status(404).json({
                response: false,
                message: "Note not found",
            });
        }

        // Delete the note
        const result = await CheckNotes.deleteOne({ _id: id });
        if (result.deletedCount > 0) {
            return res.status(200).json({
                response: true,
                message: "Note deleted",
            });
        } else {
            return res.status(500).json({
                response: false,
                message: "Failed to delete the note",
            });
        }
    } catch (e) {
        return res.status(500).json({
            response: false,
            message: "An error occurred while deleting the note",
        });
    }
});


  module.exports = {
    deleteNote
  }