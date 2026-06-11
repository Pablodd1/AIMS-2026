const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patients')
const { sendMessage } = require('./Twilio/twilio');

/**
 * Save notification phone numbers (max 3) and daily schedule toggle.
 * POST /api/post/updateNotificationSettings
 * Body: { phones: ["+1234567890", ...], enabled: true/false }
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  try {
    const { phones, enabled } = req.body;
    const validPhones = (phones || []).slice(0, 3).filter(p => p && p.trim());
    await User.updateOne(
      { _id: req.user },
      { $set: { notificationPhones: validPhones, sendDailySchedule: enabled !== false } }
    );
    return res.json({ response: true, msg: "Notification settings saved" });
  } catch (e) {
    return res.json({ response: false, msg: "Failed to save settings" });
  }
});

/**
 * Format appointments into a readable schedule text.
 */
function formatSchedule(dateStr, appointments) {
  if (!appointments || appointments.length === 0) {
    return `No appointments scheduled for ${dateStr}.`;
  }

  let lines = [`📋 ${dateStr} — ${appointments.length} appointment(s)\n`];
  
  appointments.forEach((a, i) => {
    const name = a.name || 'Unknown';
    const time = a.time ? a.time.split(' ')[1] + ' ' + (a.time.split(' ')[2] || '') : 'Time TBD';
    const status = a.status || 'Scheduled';
    const email = a.email || '';
    lines.push(`${i+1}. ${time} — ${name} (${status})${email ? ' — ' + email : ''}`);
  });

  return lines.join('\n');
}

/**
 * Get today's and tomorrow's appointments for the doctor.
 * GET /api/get/dailySchedule
 */
const getDailySchedule = asyncHandler(async (req, res) => {
  try {
    const timezone = req.query.timezone || 'America/New_York';
    const now = new Date();
    
    // Get today and tomorrow dates in clinic timezone
    const today = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
    const tomorrow = new Date(now.getTime() + 86400000)
      .toLocaleDateString('en-CA', { timeZone: timezone });

    const [todayAppts, tomorrowAppts] = await Promise.all([
      Appointment.find({ doctorID: req.user, time: { $regex: `^${today}`, $options: 'i' } })
        .sort({ time: 1 }),
      Appointment.find({ doctorID: req.user, time: { $regex: `^${tomorrow}`, $options: 'i' } })
        .sort({ time: 1 })
    ]);

    return res.json({
      response: true,
      today: { date: today, appointments: todayAppts, count: todayAppts.length },
      tomorrow: { date: tomorrow, appointments: tomorrowAppts, count: tomorrowAppts.length }
    });
  } catch (e) {
    return res.json({ response: false, msg: e.message });
  }
});

/**
 * Send daily schedule via SMS and email to notification phones.
 * POST /api/post/sendDailySchedule
 * Body: { date?: "today" | "tomorrow" } — defaults to "today"
 */
const sendDailySchedule = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user });
    if (!user) return res.json({ response: false, msg: "User not found" });

    const phones = user.notificationPhones || [];
    if (phones.length === 0) {
      return res.json({ response: false, msg: "No notification phones configured. Go to Settings to add phone numbers." });
    }

    const timezone = req.body.timezone || 'America/New_York';
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: timezone });
    const tomorrow = new Date(now.getTime() + 86400000)
      .toLocaleDateString('en-CA', { timeZone: timezone });

    const [todayAppts, tomorrowAppts] = await Promise.all([
      Appointment.find({ doctorID: req.user, time: { $regex: `^${today}`, $options: 'i' } })
        .sort({ time: 1 }),
      Appointment.find({ doctorID: req.user, time: { $regex: `^${tomorrow}`, $options: 'i' } })
        .sort({ time: 1 })
    ]);

    // Build schedule message
    const todayText = `📅 Today (${today}):\n${formatSchedule(today, todayAppts)}`;
    const tomorrowText = `📅 Tomorrow (${tomorrow}):\n${formatSchedule(tomorrow, tomorrowAppts)}`;
    
    const clinicName = user.clinicName || 'Your Clinic';
    const msg = `🏥 ${clinicName} — Daily Schedule\n\n${todayText}\n\n${tomorrowText}\n\n— AI Dynamic`;

    // Send to all configured phone numbers
    const results = [];
    for (const phone of phones) {
      const ok = await sendMessage(msg, phone);
      results.push({ phone, sent: ok });
    }

    // Also send via email if businessMail is configured
    if (user.businessMail && user.appCode) {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        port: 465, host: "smtp.gmail.com", service: "Gmail",
        auth: { user: user.businessMail, pass: user.appCode },
        secure: true,
      });
      try {
        await transporter.sendMail({
          from: user.businessMail,
          to: user.email,
          subject: `📅 ${clinicName} — Daily Schedule (${today})`,
          text: msg,
        });
        results.push({ email: user.email, sent: true });
      } catch (e) {
        results.push({ email: user.email, sent: false, error: e.message });
      }
    }

    const allSent = results.every(r => r.sent);
    return res.json({
      response: allSent,
      msg: allSent ? `Schedule sent to ${phones.length} number(s)` : "Some messages failed",
      results
    });
  } catch (e) {
    return res.json({ response: false, msg: e.message });
  }
});

/**
 * Trigger daily schedule delivery (cron-friendly, no auth needed if called internally).
 * GET /api/get/triggerDailySchedule?userId=XX
 */
const triggerDailySchedule = asyncHandler(async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.json({ response: false, msg: "userId required" });

  const user = await User.findOne({ _id: userId, sendDailySchedule: true });
  if (!user) return res.json({ response: false, msg: "User not found or daily schedule disabled" });

  const phones = user.notificationPhones || [];
  if (phones.length === 0) return res.json({ response: false, msg: "No phones configured" });

  const timezone = 'America/New_York';
  const now = new Date();
  const today = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const tomorrow = new Date(now.getTime() + 86400000)
    .toLocaleDateString('en-CA', { timeZone: timezone });

  const [todayAppts, tomorrowAppts] = await Promise.all([
    Appointment.find({ doctorID: userId, time: { $regex: `^${today}`, $options: 'i' } }).sort({ time: 1 }),
    Appointment.find({ doctorID: userId, time: { $regex: `^${tomorrow}`, $options: 'i' } }).sort({ time: 1 })
  ]);

  const todayText = `📅 Today (${today}):\n${formatSchedule(today, todayAppts)}`;
  const tomorrowText = `📅 Tomorrow (${tomorrow}):\n${formatSchedule(tomorrow, tomorrowAppts)}`;
  const msg = `🏥 ${user.clinicName || 'Your Clinic'} — Daily Schedule\n\n${todayText}\n\n${tomorrowText}\n\n— AI Dynamic`;

  const results = [];
  for (const phone of phones) {
    const ok = await sendMessage(msg, phone);
    results.push({ phone, sent: ok });
  }

  return res.json({ response: true, msg: `Sent to ${results.filter(r=>r.sent).length}/${results.length} numbers`, results });
});

module.exports = {
  updateNotificationSettings,
  getDailySchedule,
  sendDailySchedule,
  triggerDailySchedule
};
