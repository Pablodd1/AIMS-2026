const asyncHandler = require("express-async-handler");
const FeedBack  = require('../models/Feedback')

const sendFeedBack = asyncHandler(async(req,res)=>{
    const {email, msg} = req.body;
    if(!email || !msg)
    {
        return res.status(200).json({success:false,msg:'fill form correctly if you want to submit'})
    }

    try
    {
        await FeedBack.create({
            email,msg
        })

        return res.status(200).json({success:true,msg:'Your FeedBack has been sent to admin'})

    }
    catch(e)
    {
        return res.status(200).json({success:false,msg:'Server Error'})
    }
})
const fetchFeedBack = asyncHandler(async(req,res)=>{
    try{
        const FeedBacks = await FeedBack.find().sort({ createdAt: -1 })
        return res.status(200).send({success:true,FeedBacks})
    }
    catch(e)
    {
        return res.status(200).send({success:false,msg:'Server Error'})
    }
});
const deleteFeedBackById = asyncHandler(async(req,res)=>{

    try
    {
        await FeedBack.deleteOne({_id:req.body.id});
        const FeedBacks = await FeedBack.find();
        FeedBacks.reverse()
        return res.status(200).json({success:true,FeedBacks})  

    }
    catch(e)
    {
        return res.status(200).json({success:false,msg:'Server Error try again'})
    }
})



module.exports = {
    sendFeedBack,
    deleteFeedBackById,
    fetchFeedBack
}