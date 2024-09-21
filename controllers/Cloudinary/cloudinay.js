const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dklqbx5k0',
    api_key: '586219556714458',
    api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
});

  
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