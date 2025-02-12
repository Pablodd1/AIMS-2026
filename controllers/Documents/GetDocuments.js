const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');



const getDocuments = asyncHandler(async (req, res) => {
  try {
      const { pId, page = 1, limit = 3 } = req.body;

      if (!pId) {
          return res.status(400).json({
              response: false,
              msg: "Missing required parameter: pId",
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

      // Fetch paginated documents
      const docs = await Document.find({ pId })
          .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
          .skip(skip)
          .limit(limitNumber);

      // Fetch total count for metadata
      const totalCount = await Document.countDocuments({ pId });

      return res.status(200).json({
          response: true,
          documents: docs,
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
          msg: "An error occurred while fetching documents.",
      });
  }
});





module.exports = {
    getDocuments
};