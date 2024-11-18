

function appointmentUpdate(newt, number, website, clinic, name) {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Time Changed - ${clinic}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
            font-family: Arial, sans-serif;
        }
        .container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        .header {
            padding: 20px;
            background-color: #1e293b;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        .content {
            padding: 20px;
            line-height: 1.6;
            color: #333333;
            text-align: left;
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
            <h1>Appointment Time Changed</h1>
        </div>
        <div class="content">
            <p>Dear ${name},</p>
            <p>We would like to inform you that the time for your appointment at <strong>${clinic}</strong> has been changed.</p>
            <p>Your new appointment time is <strong>${newt}</strong>.</p>
            <p>If this time is not convenient for you or if you have any questions, please feel free to contact us.</p>
            <p><strong>Website:</strong> <a href="${website}">${website === "" ? '(link unavailable)' : website}</a><br>
               <strong>Phone Number:</strong> ${number}</p>
           
           <br/>
            <p>We look forward to seeing you soon.</p>
        </div>
    </div>
</body>
</html>

    `;
}

module.exports = {
    appointmentUpdate
};

