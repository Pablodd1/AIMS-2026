const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dklqbx5k0',
    api_key: '586219556714458',
    api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
});

// Upload PDF to Cloudinary
const uploadPDFToCloudinary = async (file, options = {}) => {
    try {
        // Upload the PDF file
        const result = await cloudinary.uploader.upload(file, {
            resource_type: 'raw',  // 'raw' is used for non-image assets like PDF, ZIP, etc.
            ...options             // Additional options like folder, tags, etc.
        });
        // console.log(result)
        // Return secure_url and public_id
        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error('Error uploading PDF to Cloudinary:', error);
        throw error;
    }
};

// Upload PDF and store info in DB
const uploadPDF = asyncHandler(async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({ response: false, msg: 'No file provided' });
        }

        const filePath = path.resolve(__dirname, '../../pdfs/', req.file.filename);

        const response = await uploadPDFToCloudinary(filePath, { folder: 'doctors_pdf_uploads' });
        

        const doc = new Document({

            userId: req.user,
            pId:req.body.pId,
            fileOriginalName:req.file.originalname,
            publicId: response.public_id,
            secure_url: response.secure_url

        });

        doc.save()

        fs.unlink(filePath, (err) => {

          if (err) console.error('Failed to delete local file:', err);

        });

        if (doc) {

            return res.json({ response: true,msg:"Filed Uploaded"});

        } else {

            return res.json({ response: false });

        }
    } catch (error) {

        return res.status(500).json({ response: false});
    }
});

module.exports = {
    uploadPDF
};
