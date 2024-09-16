const asyncHandler = require("express-async-handler");
const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: 'dklqbx5k0',
    api_key: '586219556714458',
    api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
});



const testFunc = asyncHandler(async(req,res)=>{
    await cloudinary.uploader.destroy('doctors_pdf_uploads/jcatipqoowmjp7rlol7x.pdf', (error, result) => {
        if (error) {
          console.error('Error deleting previous image:', error);
          return false
        } else {
          console.log('Previous image deleted:', result);
          return true
        }
      });

res.send(true)    
  })
  








module.exports = {
    testFunc,
};
