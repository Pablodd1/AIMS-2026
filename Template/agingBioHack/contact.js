function contactTemplate(name , email, phone , subject,message){
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Form Submission</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #0f766e;
          color: white;
          padding: 15px 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .field {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .field:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #0f766e;
          display: block;
          margin-bottom: 5px;
        }
        .value {
          padding-left: 10px;
        }
        .message-value {
          white-space: pre-wrap;
          padding-left: 10px;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; font-size: 18px;">Contact Form Submission</h2>
        </div>
        <div class="content">
          <div class="field">
            <span class="label">Name:</span>
            <div class="value">${name}</div>
          </div>
          <div class="field">
            <span class="label">Email:</span>
            <div class="value">${email}</div>
          </div>
          <div class="field">
            <span class="label">Phone:</span>
            <div class="value">${phone}</div>
          </div>
          <div class="field">
            <span class="label">Subject:</span>
            <div class="value">${subject}</div>
          </div>
          <div class="field">
            <span class="label">Message:</span>
            <div class="message-value">${message}</div>
          </div>
        </div>
      </div>
    </body>
    </html>`
}

module.exports = {
    contactTemplate
}