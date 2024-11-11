const asyncHandler = require("express-async-handler");
const { DeleteObjectCommand } = require('@aws-sdk/client-s3') 
const { s3Client } = require('./AwsClient')
const User = require('../../models/User')

const deleteObject = asyncHandler(async(req,res)=>{

    try
    {
        const { key,bucket,name } = req.query
        console.log(key,bucket,name)
        const result = await awsRemoveObject(key,bucket)
        if(result){
            if(name == 'profile_picture') await User.updateOne({_id:req.user},{$set:{profile_picture:""}});
            else if(name == 'signature')  await User.updateOne({_id:req.user},{$set:{signature:''}});
            else await User.updateOne({_id:req.user},{$set:{clinic_logo:''}});
            return res.json({response:result});
        }else{
            return res.json({response:false});
        }
    }
    catch(e)
    {
        return res.json({response:false});
    }
 

})

async function awsRemoveObject(url,bucket )
{
    try{

        url = url.split('/')

        const key = url[url.length-2]+'/'+url[url.length-1]

        const  command = new DeleteObjectCommand({
            Bucket:`bucket-aiscribers.com-${bucket}`,
            Key: key,
        })
        
        await s3Client.send(command)
        return true
    }catch(e){
        return false
    }
}

async function  deleteDocumentObject (key){

    try{
        const  command = new DeleteObjectCommand({
            Bucket:`bucket-aiscribers.com-private`,
            Key: key,
        })
        
        await s3Client.send(command)
        return true
    }catch(e){
        return false;
    }

}

module.exports ={
    deleteObject,
    awsRemoveObject,
    deleteDocumentObject
}
