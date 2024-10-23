const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const getAllInvoices = asyncHandler(async(req,res)=>{
    try
    {
      const {pId} =  req.body
      
      const result = await Invoice.find({
        docId:req.user,
        pId,
      })

      return res.json({response:true,invoices:result})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    getAllInvoices
};