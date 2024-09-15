// function appointmentCancelled(time,number)
// {
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
//     <title>Appointment Cancellation</title>
// </head>
// <body>
//     <div class="container">
//         <div class="header">
//             <img src="https://res.cloudinary.com/dlasb4krd/image/upload/v1725280173/mhxcy03vi7mi0r1lybmm.png" alt="AIMS">
//             <h1>AIMS</h1>
//         </div>
//         <div class="content">
//             <p>We regret to inform you that your appointment scheduled for <strong>${time}</strong> has been canceled by the doctor.</p>
//             <p>We apologize for any inconvenience this may cause. If you have any questions or need to reschedule, please contact us at <strong>${number}</strong>.</p>
//             <p>Thank you for your understanding.</p>
//         </div>
//         <div class="footer">
//             <p>&copy; 2024 AIMS. All rights reserved.</p>
//             <p><a href="https://www.aiscribers.com" target="_blank">AIMS - www.aidemoscribers.com</a></p>
//         </div>
//     </div>
// </body>
// </html>

//     `
// }

// module.exports = {
//     appointmentCancelled
// }

function appointmentCancelled(time,number,website,clinic,name) {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Cancellation - ${clinic}</title>
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
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Appointment Cancellation</h1>
        </div>
        <div class="content">
            <p>Dear ${name},</p>
            <p>We regret to inform you that your appointment scheduled for <strong>${time}</strong> at ${clinic} has been cancelled.</p>
            <p>If you have any questions or would like to reschedule, please feel free to contact us.</p>
            <p><strong>Website:</strong> <a href="${website}">${website === "" ? '(link unavailable)' : website}</a><br>
               <strong>Phone Number:</strong> ${number}</p>
            <p>We apologize for any inconvenience caused and appreciate your understanding.</p>
            <p>If you wish to reschedule your appointment, please click the button below:</p>

            <p>Thank you for your time.</p>
        </div>
    </div>
</body>
</html>

    `;
}

module.exports = {
    appointmentCancelled
};
