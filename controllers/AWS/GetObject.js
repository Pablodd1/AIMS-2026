const asyncHandler = require("express-async-handler");
const { GetObjectCommand } = require('@aws-sdk/client-s3') 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3Client } = require('./AwsClient')

const getObject = asyncHandler(async(req,res)=>{

    try{

        const fs = require("fs");
        const path = require("path");
        if (fs.existsSync(path.join("/home/aims/uploads", req.query.key))) {
            const tok = (req.headers.authorization || "").replace(/^Bearer /, "");
            return res.json({ response: true, url: "/aims-service1/api/get/localFile?key=" + encodeURIComponent(req.query.key) + "&token=" + encodeURIComponent(tok) });
        }
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
