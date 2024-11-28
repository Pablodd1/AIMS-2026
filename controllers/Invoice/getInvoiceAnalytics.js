const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')
const moment = require('moment-timezone');

const getInvoiceAnalyitcs = asyncHandler(async(req,res)=>{

try {
    const { userTimezone } = req.body;

  const timezone = userTimezone || "America/New_York"; 

  const todayStart = moment.tz(timezone).startOf('day').toDate();
  const todayEnd = moment.tz(timezone).endOf('day').toDate();

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
          createdAt: { $gte: todayStart, $lte: todayEnd } // Ensure 'date' is the correct field in your schema
        }
      },
      {
        $group: {
          _id: null,
          subTotal: { $sum: "$subTotal" }
        }
      }
    ])
  ]);
console.log(todayResult)

  // Extracting the subtotal and today's subtotal
  const subTotal = result.length > 0 ? result[0].totalSubTotal : 0;
  const subTotalToday = todayResult[0]?.subTotal || 0;

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