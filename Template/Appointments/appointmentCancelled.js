

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
            <p>If you wish to reschedule your appointment, please contact us:</p>

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
