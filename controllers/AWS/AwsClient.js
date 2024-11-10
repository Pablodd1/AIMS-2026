const { S3Client,GetObjectCommand,PutObjectCommand } = require('@aws-sdk/client-s3') 


const s3Client = new S3Client({
    region:"us-east-2",
    credentials:{
        accessKeyId:'AKIAXWMA6W5C7HXEPS4V',
        secretAccessKey:"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",
    }
})

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
// const { s3Client } = require('./AwsClient')
// const { GetObjectCommand} = require('@aws-sdk/client-s3') 


async function getObject (key){
    const command = new GetObjectCommand({
        Bucket:"bucket-aiscribers.com-private",
        Key:key
    })
    const url = await getSignedUrl(s3Client,command);
    return url;
} 

async function putObject (fileName,contentType){
    const command = new PutObjectCommand({
        Bucket:"bucket-aiscribers.com-private",
        Key:`signatures/${fileName}`,
        ContentType:contentType
    })
    const url = await getSignedUrl(s3Client,command,{expiresIn:60});
    return url;
} 


async function init()
{
// console.log(`signed url: ${await getObject('background2.avif')}`)
console.log(`signed url: ${await putObject('icon.png','image/png')}`)
}

// init()

module.exports = {s3Client}