const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const getInvoiceById = asyncHandler(async(req,res)=>{
    try
    {
      const {invoiceId} =  req.body
      
      const result = await Invoice.findOne({
        docId:req.user,
        _id:invoiceId
      })

      return res.json({response:true,invoice:result})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    getInvoiceById
};