const asyncHandler = require("express-async-handler");
const { GetObjectCommand } = require('@aws-sdk/client-s3') 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3Client } = require('./AwsClient')

const getObject = asyncHandler(async(req,res)=>{

    try{

        const fs = require("fs");
        const path = require("path");
        // The chart UI sends the stored reference as secure_url; the old code only
        // read ?key=, so every local download came back with an empty key.
        const key = String(req.query.key || req.query.secure_url || "").trim();

        // Legacy documents reference absolute remote URLs (Cloudinary) or VPS-stored files.
        // Returning those directly is correct; signing an S3 key for them yields a dead link.
        if (/^https?:\/\//i.test(key)) {
            return res.json({ response: true, url: key });
        }
        const abs = path.join("/home/aims/uploads", key);
        if (key && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
            const tok = (req.headers.authorization || "").replace(/^Bearer /, "");
            return res.json({ response: true, url: "/aims-service1/api/get/localFile?key=" + encodeURIComponent(key) + "&token=" + encodeURIComponent(tok) });
        }
        if (!key) return res.json({ response: false, msg: "key required" });
        const command = new GetObjectCommand({
            Bucket:"bucket-aiscribers.com-private",
            Key:key
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
