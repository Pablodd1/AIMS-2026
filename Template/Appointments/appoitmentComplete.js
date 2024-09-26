function appointmentComplete(number, clinicname, patientName, website, address, pic) {
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
          <img src=${pic} alt="${clinicname}" class="logo">
        </div>
    
        <div class="subject">
          Appointment Confirmation - ${clinicname}
        </div>
    
        <div class="content">
          <p>Dear ${patientName},</p>
          <p>We would like to sincerely thank you for choosing <strong>${clinicname}</strong> for your care. We hope your experience was positive, and we are here for any follow-ups you may need.</p>
  
          <p>We kindly ask you to leave us a review on Google under <strong>${clinicname}</strong>. Your feedback helps us improve and serve you better.</p>
    
          <p>Thank you once again, and we hope to see you soon.</p>
  
          <p>Best regards,<br>The ${clinicname} Team</p>
  
        </div>
    
        <div class="footer">
          <p>${clinicname}</p>
          <p>Phone: ${number}</p>
          <p>Address: ${address}</p>
          <p>Website: <a href=${website}>${website === "" ? '(link unavailable)' : website}</a></p>
          <p>©️ 2024 ${clinicname}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
        `;
  }
  
  module.exports = {
    appointmentComplete
  };
  