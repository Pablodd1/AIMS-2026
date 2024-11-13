const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const invoiceStatus = asyncHandler(async(req,res)=>{
    try
    {
      const {invoiceId,status} =  req.body
      await Invoice.updateOne({
        _id:invoiceId
      },
      {
        $set:{status}
      })
      return res.json({response:true,msg:`Invoice status has been channged to ${status} `})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    invoiceStatus
};