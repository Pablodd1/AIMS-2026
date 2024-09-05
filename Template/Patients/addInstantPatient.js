function addInstantPatient(link) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background-color: #f9f9f9;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
            }
            .header img {
                max-width: 150px;
            }
            .header h1 {
                font-size: 24px;
                margin: 0;
                color: #0056b3;
            }
            .content {
                margin-bottom: 20px;
            }
            .content p {
                margin: 0 0 10px;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #777;
            }
            .footer a {
                color: #0056b3;
                text-decoration: none;
            }
        </style>
        <title>Email Template</title>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://res.cloudinary.com/dlasb4krd/image/upload/fl_preserve_transparency/v1723113449/yjscvyuqu2fpubu9zm31.jpg?_s=public-apps" alt="iCare Mobile Medicine Logo">
                <h1>iCare Mobile Medicine</h1>
            </div>
            <div class="content">
                <p>Dear Patient,</p>
                <p>We are pleased to inform you that you can now complete your patient intake form online. Please use the link below to navigate to the form:</p>
                <p><a href=${link} target="_blank">Click Me :)</a></p>
                <p>If you have any questions or need assistance, feel free to contact us.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 iCare Mobile Medicine. All rights reserved.</p>
                <p><a href="https://www.aidemoscriber.com" target="_blank">AIMS - www.aidemoscriber.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
}
  
module.exports = {
    addInstantPatient
};
