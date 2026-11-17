const asyncHandler = require("express-async-handler");
const { PutObjectCommand } = require('@aws-sdk/client-s3') 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3Client } = require('./AwsClient')


const getSignedUrlForUpload = asyncHandler(async(req,res)=>{

    try{

        const { fileName,contentType,folder } = req.query
        const dir0 = folder || 'Document';
        // S3 is unusable while AWS_ACCESS_KEY_ID is a placeholder; hand out a local
        // presigned PUT instead so the browser's existing PUT flow keeps working.
        const _ak = process.env.AWS_ACCESS_KEY_ID || '';
        const s3Real = _ak.length === 20 && !/xxxx/i.test(_ak);
        if (!s3Real) {
            const key = `${dir0}/${fileName}`;
            const tok = (req.headers.authorization || '').replace(/^Bearer /, '') || req.query.token || '';
            const base = 'https://aimedicalscriber.com/aims-service1';
            const url = `${base}/api/put/localBinary?key=${encodeURIComponent(key)}&token=${encodeURIComponent(tok)}`;
            return res.json({ response: true, url, key, storage: 'local' });
        }
        if(!fileName || !String(fileName).trim()){
            return res.status(400).json({response:false,msg:'fileName required'})
        }
        let command;
        let url;
        const dir = folder || 'Document';
        if(dir=='Document')
        {
            command = new PutObjectCommand({
                Bucket:"bucket-aiscribers.com-private",
                Key:`${dir}/${fileName}`, ContentType: contentType || 'application/octet-stream'
            })
            url = await getSignedUrl(s3Client,command,{expiresIn:180});
        }else
        {
            command = new PutObjectCommand({
                Bucket:"bucket-aiscribers.com-public",
                Key:`${dir}/${fileName}`, ContentType: contentType || 'application/octet-stream'
            })
            url = await getSignedUrl(s3Client,command,{expiresIn:120});
        }
         
        return res.json({response:true,url});
    }catch(e)
    {
        return res.json({response:false});
    }
 

})



module.exports ={
    getSignedUrlForUpload,
}
