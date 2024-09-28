function appointmentCreated(time, number, clinicname, patientName, website, address, pic, link) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
      <style>
        body {
          background-color: #1E293B; /* slate-900 */
          color: white;
          font-family: Arial, sans-serif;
          padding: 0;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background-color: #ffffff;
          color: #000000;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          max-width: 700px;
          width: 100%;
          text-align: center;
        }
        .header {
          margin-bottom: 40px;
        }
        .logo {
          max-height: 60px;
        }
        .subject {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 20px;
          text-align: left;
        }
        .footer {
          margin-top: 40px;
          font-size: 14px;
          color: #D1D5DB; /* slate-300 */
        }
        .link {
          color: #FFDB1A; /* gold */
          text-decoration: underline;
        }
        p {
          color: black;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${pic}" alt="${clinicname}" class="logo">
        </div>

        <div class="subject">
          Appointment Confirmation - ${clinicname}
        </div>

        <div class="content">
          <p>Dear ${patientName},</p>
          <p>Your appointment at ${clinicname} is confirmed for <strong>${time}</strong>. Please complete your intake form before your visit using the following link:</p>

          <a href="${link}">Click to redirect to patient form</a>

          <p>We look forward to seeing you! If you need to reschedule, please contact us at ${number}. You can also visit our website at ${website}</p>

          <p>Best regards,</p>
          <p>The ${clinicname} Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  appointmentCreated
};
