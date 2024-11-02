const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const makeInvoice = asyncHandler(async(req,res)=>{
    try
    {
      const { pId , items , subTotal,userTimezone} =  req.body

   
      await Invoice.create({
        docId:req.user,
        pId,
        item:items,
        subTotal,
        userTimezone
      })

      return res.json({response:true,msg:"Invoice assigned to patient"})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    makeInvoice
};