const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')
const Patient = require('../../models/Patients')


const getAllByStatus = asyncHandler(async (req, res) => {
  try {
      const { status, page = 1 , limit = 100 } = req.query;

      const parsedLimit = parseInt(limit, 10);
      const limitNumber = Math.min(Math.max(isNaN(parsedLimit) ? 100 : parsedLimit, 1), 500);

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
      const rawInvoices = await Invoice.find({
          docId: req.user,
          status
      }).sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

      const pIds = [...new Set(rawInvoices.map((inv) => inv.pId).filter(Boolean))];
      const nameMap = {};
      if (pIds.length) {
        const pts = await Patient.find({ _id: { $in: pIds } }).select('fullName').lean().catch(() => []);
        pts.forEach((pt) => { nameMap[String(pt._id)] = pt.fullName; });
      }
      const invoices = rawInvoices.map((inv) => ({
        ...inv,
        patientName: inv.patientName || nameMap[String(inv.pId)] || 'Unknown Patient',
      }));


      // Fetch total count for metadata
      const totalCount = await Invoice.countDocuments({
          docId: req.user,
          status,
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
    getAllByStatus
};