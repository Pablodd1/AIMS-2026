const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('[cloudinary] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET not set in env');
}

  
const deleteAsset = async(publicId)=>{

   try{
       console.log('Deleting file from Cloudinary...');
       const result = await cloudinary.uploader.destroy(publicId, {
       resource_type: 'raw', // For non-image files like PDFs
    });


    if (result.result != 'ok') {
        console.error('Failed to delete asset from Cloudinary:', result);
        return false
    }
        console.error('Asset delete from Cloudinary:');
        return true
   }catch(e)
   {
        return false
   }

 }


    
module.exports = {
    deleteAsset
};