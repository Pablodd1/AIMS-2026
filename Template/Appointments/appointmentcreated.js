
// function appointmentCreated(time, number, clinicname, patientName, website, address, pic) {
//   return `
//   <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <title>Appointment Confirmation</title>
// <style>
//   body {
//     background-color: #1E293B; /* slate-900 */
//     color: white;
//     font-family: Arial, sans-serif;
//     padding: 0;
//     margin: 0;
//     display: flex;
//     justify-content: center;
//     align-items: center;
//     height: 100vh;
//   }
//   .container {
//     background-color: #ffffff;
//     color: #000000;
//     border-radius: 8px;
//     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
//     padding: 20px;
//     max-width: 700px;
//     width: 100%;
//     text-align: center;
//   }
//   .header {
//     margin-bottom: 40px;
//   }
//   .logo {
//     max-height: 60px;
//   }
//   .subject {
//     font-size: 24px;
//     font-weight: bold;
//     margin-bottom: 20px;
//   }
//   .content {
//     margin-bottom: 20px;
//     text-align: left;
//   }
//   .footer {
//     margin-top: 40px;
//     font-size: 14px;
//     color: #D1D5DB; /* slate-300 */
//   }
//   .link {
//     color: #FFDB1A; /* gold */
//     text-decoration: underline;
//   }
//   p {
//     color: black;
//   }
// </style>
// </head>
// <body>
// <div class="container">
//   <div class="header">
//     <img src=${pic} alt="${clinicname}" class="logo">
//   </div>

//   <div class="subject">
//     Appointment Confirmation - Innovative Medical Wellness
//   </div>

//   <div class="content">
//     <p>Dear ${patientName},</p>
//     <p>We’re happy to confirm your appointment for <strong>${time}</strong>. Please plan to arrive 10 minutes early to complete any necessary medical paperwork.</p>

//     <p>In the meantime, if you haven’t filled out the patient intake form yet, we sent it to you when we added you to the system. You should have received an email with the form. Please check it out.</p>
    
//     <p>If you have any questions, please don’t hesitate to reach out.</p>

//     <p>Thank you, and we look forward to seeing you soon!</p>
//   </div>

//   <div class="footer">
//     <p>${clinicname}</p>
//     <p>Phone: ${number}</p>
//     <p>Address: ${address}</p>
//     <p>Website: <a href=${website}>${website === "" ? '(link unavailable)' : website}</a></p>
//     <p>©️ 2024 ${clinicname}. All rights reserved.</p>
//   </div>
// </div>
// </body>
// </html>
//   `;
// }


function appointmentCreated(time, number, clinicname, patientName, website, address, pic){
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
        Appointment Confirmation - Innovative Medical Wellness
      </div>
  
      <div class="content">
        <p>Dear ${patientName},</p>
        <p>We’re happy to confirm your appointment for <strong>${time}</strong>. Please plan to arrive 10 minutes early to complete any necessary medical paperwork.</p>
  
        <p>In the meantime, if you haven’t filled out the patient intake form yet, we sent it to you when we added you to the system. You should have received an email with the form. Please check it out.</p>
        
        <p>If you have any questions, please don’t hesitate to reach out.</p>
  
        <p>Thank you, and we look forward to seeing you soon!</p>
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
  appointmentCreated
};

