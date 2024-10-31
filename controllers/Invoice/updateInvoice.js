const asyncHandler = require("express-async-handler");
const Invoice = require('../../models/Invoice')

const updateInvoice = asyncHandler(async(req,res)=>{
    try
    {
      const { id, date } =  req.body

      
      await Invoice.updateOne(
        {
        _id:id
       },{
        $set:{
            date
        }
       })

      return res.json({response:true,msg:"Invoice date changed"})
      
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

module.exports = {
    updateInvoice
};