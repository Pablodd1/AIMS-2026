const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

const getNotes = asyncHandler(async (req, res) => {
    try {
        const { id, page = 1, limit = 3 } = req.query;

        if (!id) {
            return res.status(400).json({
                response: false,
                msg: "Missing required parameter: id",
            });
        }

        // Parse page and limit to ensure they are numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
            return res.status(400).json({
                response: false,
                msg: "Invalid page or limit value. Both must be positive integers.",
            });
        }

        // Calculate skip value for pagination
        const skip = (pageNumber - 1) * limitNumber;

        // Fetch paginated notes
        const notes = await CheckNotes.find({ pId: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber);

        // Fetch total count for metadata
        const totalCount = await CheckNotes.countDocuments({ pId: id });

        return res.status(200).json({
            response: true,
            notes,
            pagination: {
                total: totalCount,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalCount / limitNumber),
            },
        });
    } catch (e) {
        return res.status(500).json({
            response: false,
            msg: "An error occurred while fetching notes.",
        });
    }
});

  module.exports = {
    getNotes
  }