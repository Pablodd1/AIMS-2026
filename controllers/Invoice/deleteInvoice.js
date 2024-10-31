const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const deleteInvoice = asyncHandler(async(req,res)=>{
    try
    {
      const { id } =  req.query

      await Invoice.deleteOne({_id:id})

      return res.json({response:true,msg:"Invoice deleted successfully"})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    deleteInvoice
};