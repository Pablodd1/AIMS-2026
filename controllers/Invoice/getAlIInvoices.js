const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')



const getAllInvoices = asyncHandler(async (req, res) => {
  try {
      const { pId, page = 1 } = req.query;
      if (!pId) {
          return res.status(400).json({
              response: false,
              msg: "Missing required parameter: pId",
          });
      }

      // Set the limit to 3 records per page
      const limitNumber = 3;

      // Parse page to ensure it is a number
      const pageNumber = parseInt(page, 10);

      if (isNaN(pageNumber) || pageNumber < 1) {
          return res.status(400).json({
              response: false,
              msg: "Invalid page value. Page must be a positive integer.",
          });
      }

      // Calculate skip value for pagination
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch paginated invoices
      const invoices = await Invoice.find({
          docId: req.user,
          pId,
      }).sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

        console.log(pageNumber)

      // Fetch total count for metadata
      const totalCount = await Invoice.countDocuments({
          docId: req.user,
          pId,
      });

      return res.status(200).json({
          response: true,
          invoices,
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
          msg: "An error occurred while fetching invoices.",
      });
  }
});


module.exports = {
    getAllInvoices
};