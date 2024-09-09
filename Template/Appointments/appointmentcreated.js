// function appointmentCreated(time) {
//     return `
//     <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta http-equiv="X-UA-Compatible" content="IE=edge">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <style>
//         body {
//             font-family: Arial, sans-serif;
//             color: #333;
//             line-height: 1.6;
//         }
//         .container {
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             border: 1px solid #ddd;
//             border-radius: 5px;
//             background-color: #f9f9f9;
//         }
//         .header {
//             text-align: center;
//             margin-bottom: 20px;
//         }
//         .header img {
//             max-width: 150px;
//         }
//         .header h1 {
//             font-size: 24px;
//             margin: 0;
//             color: #0056b3;
//         }
//         .content {
//             margin-bottom: 20px;
//         }
//         .content p {
//             margin: 0 0 10px;
//         }
//         .footer {
//             text-align: center;
//             font-size: 12px;
//             color: #777;
//         }
//         .footer a {
//             color: #0056b3;
//             text-decoration: none;
//         }
//     </style>
//     <title>Email Template</title>
// </head>
// <body>
//     <div class="container">
//         <div class="header">
//             <img src="https://res.cloudinary.com/dlasb4krd/image/upload/v1725280173/mhxcy03vi7mi0r1lybmm.png" alt="iCare Mobile Medicine Logo">
//             <h1>AIMS</h1>
//         </div>
//         <div class="content">
//             <p>Dear Patient,</p>
//             <p>We are pleased to inform you that your appointment has been scheduled on <strong>${time}</strong>.</p>
//             <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
//         </div>
//         <div class="footer">
//             <p>&copy; 2024 AIMS. All rights reserved.</p>
//             <p><a href="https://www.aiscribers.com" target="_blank">AIMS - www.aidemoscribers.com</a></p>
//         </div>
//     </div>
// </body>
// </html>

//     `;
// }
  
// module.exports = {
//     appointmentCreated
// };


function appointmentCreated(time,number,clinicname,patientName) {
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
            <img src="https://res.cloudinary.com/dlasb4krd/image/upload/v1725280173/mhxcy03vi7mi0r1lybmm.png" alt="AIMS">
            <h1>AIMS</h1>
        </div>
        <div class="content">
            <p>Dear ${patientName},</p>
            <p>We are pleased to inform you that your appointment is confirmed on <strong>${time}</strong>. Please arrive 10 minutes earlier to finalize any necessary medical paperwork.</p>
            <br/>
            <p>For your convenience, please fill out the following medical intake form using either your voice or typing for accuracy. Follow the instructions provided, and rest assured, your documentation will be securely encrypted.</p>
            <br/>
            <p>If you have any questions, feel free to contact us.</p>
            <p>${clinicname}</p>
            <p>Phone: ${number}</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 AIMS. All rights reserved.</p>
            <p><a href="https://www.aiscribers.com" target="_blank">AIMS - www.aidemoscribers.com</a></p>
        </div>
    </div>
</body>
</html>
    `;
}

module.exports = {
    appointmentCreated
};

