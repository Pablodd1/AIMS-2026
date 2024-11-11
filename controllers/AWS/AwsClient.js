const { S3Client } = require('@aws-sdk/client-s3') 


const s3Client = new S3Client({
    region:"us-east-2",
    credentials:{
        accessKeyId:'AKIAXWMA6W5C7HXEPS4V',
        secretAccessKey:"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",
    }
})




module.exports = {s3Client}