const asyncHandler = require("express-async-handler");
const { PutObjectCommand } = require('@aws-sdk/client-s3') 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3Client } = require('./AwsClient')


const putObject = asyncHandler(async(req,res)=>{

    try{

        const { fileName,contentType,folder } = req.query
        console.log(fileName,contentType,folder )
        let command;
        if(folder=='Document')
        {
            command = new PutObjectCommand({
                Bucket:"bucket-aiscribers.com-private",
                Key:`${folder}/${fileName}`,
                ContentType:contentType
            })
        }else
        {
            command = new PutObjectCommand({
                Bucket:"bucket-aiscribers.com-public",
                Key:`${folder}/${fileName}`,
                ContentType:contentType
            })
        }
         
        const url = await getSignedUrl(s3Client,command,{expiresIn:60});
        console.log(url)
        return res.json({response:true,url});
    }catch(e)
    {
        return res.json({response:false});
    }
 

})

module.exports ={
    putObject
}
