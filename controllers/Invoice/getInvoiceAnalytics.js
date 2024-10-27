const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')
const moment = require('moment-timezone');

const getInvoiceAnalyitcs = asyncHandler(async(req,res)=>{

try {
    const { userTimezone } = req.body;

  const timezone = userTimezone || "America/New_York"; 

  const todayStart = moment.tz(timezone).startOf('day').format('MM-DD-YYYY');
const todayEnd = moment.tz(timezone).endOf('day').format('MM-DD-YYYY');

  // Running all the operations simultaneously using Promise.all
  const [result, count, todayResult] = await Promise.all([
    // Total SubTotal for a specific pId
    Invoice.aggregate([
      {
        $match: {
          docId: req.user, 
        }
      },
      {
        $group: {
          _id: null,  
          totalSubTotal: { $sum: "$subTotal" }
        }
      }
    ]),

     // Count of documents for a specific pId
     Invoice.find({docId: req.user }).countDocuments(),

     // SubTotal for today
     Invoice.aggregate([
        {
          $match: {
            docId: req.user,
            date: { $gte: todayStart, $lte: todayEnd } // Replace 'dateField' with the correct field for date in your documents
          }
        },
        {
          $group: {
            _id: null,
            totalSubTotalToday: { $sum: "$subTotal" }
          }
        }
      ])
  ]);


  // Extracting the subtotal and today's subtotal
  const subTotal = result.length > 0 ? result[0].totalSubTotal : 0;
  const subTotalToday = todayResult.length > 0 ? todayResult[0].totalSubTotalToday : 0;

  // Sending the response
  return res.json({ response: true, subTotal, count, subTotalToday });
} catch (e) {
  console.error(e);
  return res.json({ response: false });
}

})

module.exports = {
    getInvoiceAnalyitcs
};