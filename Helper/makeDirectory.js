const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '../uploads');

// Function to ensure the uploads directory exists
const ensureUploadsDirectory = () => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Uploads directory created.');
    } else {
        console.log('Uploads directory already exists.');
    }
};


module.exports = ensureUploadsDirectory