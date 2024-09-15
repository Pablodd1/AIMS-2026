function addInstantPatient(link,name,number,clinic,website)
{
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Innovative Medical Wellness</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 20px;
            background-color: #1e293b;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        .content {
            padding: 20px;
            line-height: 1.6;
            color: #333333;
        }
        .footer {
            padding: 10px;
            text-align: center;
            background-color: #f4f4f4;
            border-radius: 0 0 10px 10px;
        }
        a {
            color: #4CAF50;
            text-decoration: none;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin: 10px 0;
            background-color: #1e293b;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ${clinic}!</h1>
        </div>
        <div class="content">
            <p>Dear ${name},</p>
            <p>We are thrilled to welcome you to ${clinic}! We are excited to have you on board and look forward to providing you with exceptional care and service.</p>
            <p>We have successfully added you to our registration system, and you are now a part of our community. If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
            <p>For your convenience, our contact information is:</p>
            <p><strong>Website:</strong><a href=${website}>${website==""?'(link unavailable)':website}</a><br>
               <strong>Phone Number:</strong> ${number}</p>
            <p>Please click the button below to navigate to the form and complete your preferences.</p>

            <a href=${link} class="button">Click me 👀</a>
            <p>Thank you for choosing ${clinic}. We look forward to serving you!</p>
        </div>
    </div>
</body>
</html>

    `
}

module.exports = {
    addInstantPatient
};

