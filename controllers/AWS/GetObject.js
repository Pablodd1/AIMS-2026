const asyncHandler = require("express-async-handler");
const { GetObjectCommand } = require('@aws-sdk/client-s3') 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3Client } = require('./AwsClient')

const getObject = asyncHandler(async(req,res)=>{

    try{

        const command = new GetObjectCommand({
            Bucket:"bucket-aiscribers.com-private",
            Key:req.query.key
        })
        const url = await getSignedUrl(s3Client,command,{expiresIn:60});
        return res.json({response:true,url})
    }catch(e){
        return res.json({response:false})
    }
 

})


module.exports = {
    getObject
}
