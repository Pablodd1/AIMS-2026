const asyncHandler = require("express-async-handler");
const Document = require('../../models/Document');





// Upload PDF and store info in DB
const uploadPDF = asyncHandler(async (req, res) => {

    try {
        const { pId , fileOriginalName , key ,userTimezone  } = req.body

        if (!pId || !fileOriginalName || !key) {
            return res.status(400).json({ response: false, msg: 'pId, fileOriginalName and key are required' });
        }
        const fs = require('fs');
        const path = require('path');
        const onDisk = !/^https?:\/\//i.test(key) && fs.existsSync(path.join('/home/aims/uploads', key));
        if (!onDisk && !/^https?:\/\//i.test(key)) {
            return res.status(400).json({ response: false, msg: 'File was not stored. Re-send the upload.' });
        }

        const doc = new Document({
            userId: req.user,
            pId:pId,
            fileOriginalName:fileOriginalName,
            secure_url: key,
            userTimezone
        });

        await doc.save();
        return res.json({ response: true, msg: "Filed Uploaded", document: { _id: doc._id, pId, fileOriginalName, secure_url: key, date: doc.date } });

    } catch (error) {
        console.error('uploadPDF failed:', error.message);
        return res.status(500).json({ response: false, msg: error.message });
    }
});

module.exports = {
    uploadPDF
};
