const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');





// Upload PDF and store info in DB
const uploadPDF = asyncHandler(async (req, res) => {

    try {
        const { pId , fileOriginalName , key ,userTimezone  } = req.body

        
        const doc = new Document({
            userId: req.user,
            pId:pId,
            fileOriginalName:fileOriginalName,
            secure_url: key,
            userTimezone
        });

        doc.save()

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
