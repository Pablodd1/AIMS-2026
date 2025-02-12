function addInstantPatient(link,name,number,clinic,website,address,clinicNumber)
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
            <br/>
            <p>We are delighted to welcome you to ${clinic}, where we combine alternative and holistic approaches, guided by expert doctors. Our mission is to help you achieve your wellness goals with personalized care.</p>
            <br/>
            <p>We are excited to inform you that we have moved from our Bay Harbor location to our new address at ${address}. While our location has changed, you can expect the same staff, the same excellent customer service, and the same cutting-edge technology in medicine.</p>
            <br/>
            <p>If you have any questions or would like to schedule an appointment, feel free to reach us at ${clinicNumber}. You can also visit our website at ${website}.</p>
            <br/>
               <p>We look forward to working with you on your wellness journey.</p>
               <p>Best regards,</p>
               <br/>
               <p>Contact Us:</p>
               <p>${address}</p>
               <p>United States</p>
               <br/>
               <p>Hours of Operation:</p>
               <p>Mon-Fri: 9:00 AM – 6:00 PM</p>
               <p>Sat: 9:00 AM – 1:00 PM (With appointment only)</p>
            

            <a href=${link} class="button">Click me 👀</a>
            <p>Thank you for choosing ${clinic}. We look forward to serving you!</p>
        </div>
    </div>
</body>
</html>

    `
}

function addInstantPatientICare(link, name, clinic, phone, email) {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${clinic}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
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
            <br/>
            <p>You have successfully registered with our system. If you'd like to withdraw your registration, please click the link below or respond with an affirmative confirmation ("yes") to continue receiving updates about our services.</p>
            <br/>
            <p>We are excited to announce our new services! At ${clinic}, our dedicated team is committed to providing exceptional healthcare with the convenience and care you deserve. We offer advanced technologies to ensure accurate diagnoses and effective treatments in the comfort of your own home.</p>
            <br/>
            <p>To make it easier for you to connect with us, here’s our updated contact information:</p>
            <p>- Phone: ${phone}</p>
            <p>- Email: ${email}</p>
            <br/>
            <p>We appreciate your trust in us and look forward to being your healthcare partner. If you have any questions or need help scheduling appointments, feel free to reach out!</p>
            <br/>
            <p>Sincerely,</p>
            <p>The ${clinic} Team</p>
            <br/>
            <a href=${link} class="button">Click here to manage your registration</a>
        </div>
    </div>
</body>
</html>
    `;
}




module.exports = {
    addInstantPatient,
    addInstantPatientICare
};

