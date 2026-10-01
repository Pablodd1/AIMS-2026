function appointmentReminder(time, patientName, clinicname, confirmLink) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment reminder</title>
    <style>
      body { background-color: #1E293B; color: white; font-family: Arial, sans-serif; padding: 0; margin: 0; }
      .container { background-color: #ffffff; color: #000000; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        padding: 24px; max-width: 640px; width: 100%; margin: 24px auto; text-align: center; }
      .subject { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
      p { color: #111; }
      .time { font-size: 18px; font-weight: bold; margin: 14px 0; }
      .button { display: inline-block; padding: 11px 22px; margin: 8px 5px; text-decoration: none;
        border-radius: 6px; color: #ffffff !important; font-weight: bold; }
      .confirm-button { background-color: #28A745; }
      .cancel-button { background-color: #DC3545; }
      .resched-button { background-color: #4F46E5; }
      .muted { font-size: 13px; color: #555; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="subject">Appointment Reminder &mdash; ${clinicname}</div>
      <p>Dear ${patientName},</p>
      <p>This is a reminder of your upcoming appointment:</p>
      <div class="time">${time}</div>
      <p>Confirm, cancel or reschedule with one tap:</p>
      <p>
        <a href="${confirmLink}" class="button confirm-button">Confirm</a>
        <a href="${confirmLink}" class="button resched-button">Reschedule</a>
        <a href="${confirmLink}" class="button cancel-button">Cancel</a>
      </p>
      <p class="muted">All buttons open the same secure page where you choose the action.<br>
      Prefer to talk to us? Call 305-864-1373.</p>
    </div>
  </body>
  </html>
  `;
}

module.exports = {
  appointmentReminder
};
