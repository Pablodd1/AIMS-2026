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

  // Miami (America/New_York) 7AM gate. Cron fires 11:00 and 12:00 UTC; only the run
  // that maps to 7:00 Miami passes — DST-safe without CRON_TZ (which would shift other jobs).
  // force=1 bypasses the gate for manual testing/ops.
  const miamiHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
  const force = req.query.force === '1';
  if (miamiHour !== 7 && !force) return res.json({ response: true, skipped: true, msg: `Skipped — Miami hour ${miamiHour}, not 7am` });

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

  // Email delivery — same nodemailer pattern as sendDailySchedule. Sends to the user's
  // account email (drjeffreydraesel@gmail.com for the cron user). businessMail/appCode = Gmail app password.
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
        subject: `📅 ${user.clinicName || 'Your Clinic'} — Daily Schedule (${today})`,
        text: msg,
      });
      results.push({ email: user.email, sent: true });
    } catch (e) {
      results.push({ email: user.email, sent: false, error: e.message });
    }
  } else {
    results.push({ email: user.email || '(none)', sent: false, error: 'businessMail/appCode not configured' });
  }

  return res.json({ response: true, msg: `Sent to ${results.filter(r=>r.sent).length}/${results.length} number(s), email ${results.find(r=>r.email) ? (results.find(r=>r.email).sent ? 'OK' : 'FAILED') : 'n/a'}`, results });
});

function normalizeUsE164(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (String(raw || '').trim().startsWith('+') && digits.length >= 10) return '+' + digits;
  return null;
}

/**
 * Send or dry-run preview an SMS campaign via Twilio.
 * POST /api/post/sendSmsCampaign
 * Body: { campaignId, message, recipients?: [{name, phone, email}], audience?: string, dryRun?: boolean }
 */
const sendSmsCampaign = asyncHandler(async (req, res) => {
  try {
    const { campaignId = 'custom', message, recipients, audience = 'custom', dryRun = true } = req.body || {};
    const rawMsg = String(message || '').trim();
    if (!rawMsg) return res.status(400).json({ response: false, msg: 'Campaign message is required.' });
    if (rawMsg.length > 1000) return res.status(400).json({ response: false, msg: 'Message too long (max 1000 chars).' });

    const user = await User.findById(req.user)
      .select('clinicName website email businessMail phone_number notificationPhones')
      .lean()
      .catch(() => null);

    const clinicName = (user && user.clinicName) || process.env.CLINIC_NAME || 'Innovative Medical Wellness';
    const clinicWebsite = (user && user.website) || process.env.CLINIC_WEBSITE || 'https://innovativemedicalwellness.com';
    const companyEmail = (user && (user.businessMail || user.email)) || 'info@innovativemedicalwellness.com';
    const clinicPhone = (user && user.phone_number) || '305-864-1373';
    const jasmelEmail = 'jasmel.acosta@gmail.com';

    // Strict internal staff & company exclusion registry.
    // Explicit user constraint: Never text Jeffrey Draesel/Draysol, Maria Draesel/Draysol, Caitlyn Moore, Caitlyn Draesel/Draysol, or company staff.
    const internalPhones = new Set();
    if (user) {
      if (user.phone_number) {
        const p0 = normalizeUsE164(user.phone_number);
        if (p0) internalPhones.add(p0);
      }
      if (Array.isArray(user.notificationPhones)) {
        user.notificationPhones.forEach((ph) => {
          const p = normalizeUsE164(ph);
          if (p) internalPhones.add(p);
        });
      }
    }

    function isExcludedCompanyContact(name, email, phone) {
      const n = String(name || '').toLowerCase();
      const em = String(email || '').toLowerCase();
      const ph = normalizeUsE164(phone);

      // Blocked staff and family name patterns
      const blockedNamePatterns = [
        /jeffrey/i,
        /draesel/i,
        /draysol/i,
        /maria/i,
        /caitlyn/i,
        /caitlin/i,
        /moore/i,
        /\badmin\b/i,
        /\bstaff\b/i,
        /\baims\b/i,
        /innovative\s*medical/i,
        /test\s*patient/i,
      ];

      for (const pat of blockedNamePatterns) {
        if (pat.test(n)) return true;
      }

      // Blocked internal email patterns
      if (em) {
        if (/draesel|draysol|caitlyn|jasmel\.acosta/i.test(em)) return true;
        if (user && (em === String(user.email || '').toLowerCase() || em === String(user.businessMail || '').toLowerCase())) return true;
      }

      // Blocked internal clinic and doctor notification phone numbers
      if (ph && internalPhones.has(ph)) return true;

      return false;
    }

    const hasStop = /reply\s+stop/i.test(rawMsg);
    const finalTemplate = hasStop ? rawMsg : `${rawMsg}\nReply STOP to opt out.`;

    let targets = [];
    let excludedCount = 0;

    if (Array.isArray(recipients) && recipients.length) {
      recipients.forEach((r) => {
        if (isExcludedCompanyContact(r.name, r.email, r.phone)) {
          excludedCount++;
        } else {
          const ph = normalizeUsE164(r.phone);
          if (ph) targets.push({ name: r.name || 'Patient', phone: ph });
        }
      });
    } else {
      const pats = await Patient.find({ doc_id: req.user, phoneNumber: { $exists: true, $ne: '' } })
        .select('fullName email phoneNumber visitDates updatedAt createdAt')
        .limit(300)
        .lean();
      const now = Date.now();
      const filtered = pats.filter((p) => {
        if (isExcludedCompanyContact(p.fullName, p.email, p.phoneNumber)) {
          excludedCount++;
          return false;
        }
        const phone = normalizeUsE164(p.phoneNumber);
        if (!phone) return false;
        if (audience === 'inactive_60d') {
          const last = Array.isArray(p.visitDates) && p.visitDates.length ? p.visitDates[p.visitDates.length - 1] : null;
          if (!last) return true;
          const ts = Date.parse(last);
          return !isNaN(ts) && (now - ts) > 60 * 86400000;
        }
        if (audience === 'completed_recent_7d') {
          const last = Array.isArray(p.visitDates) && p.visitDates.length ? p.visitDates[p.visitDates.length - 1] : null;
          if (!last) return false;
          const ts = Date.parse(last);
          return !isNaN(ts) && (now - ts) <= 7 * 86400000;
        }
        return true;
      });
      targets = filtered.map((p) => ({ name: p.fullName || 'Patient', phone: normalizeUsE164(p.phoneNumber) }));
    }

    // Deduplicate by normalized phone and cap batch at 100 per call
    const seen = new Set();
    const deduped = [];
    for (const t of targets) {
      if (!t.phone || seen.has(t.phone)) continue;
      seen.add(t.phone);
      deduped.push(t);
      if (deduped.length >= 100) break;
    }

    const renderBody = (name) => finalTemplate
      .replace(/\{\{\s*name\s*\}\}/gi, String(name || 'there').split(/\s+/)[0])
      .replace(/\{\{\s*clinic\s*\}\}/gi, clinicName)
      .replace(/\{\{\s*website\s*\}\}/gi, clinicWebsite)
      .replace(/\{\{\s*company_email\s*\}\}/gi, companyEmail)
      .replace(/\{\{\s*contact_email\s*\}\}/gi, jasmelEmail)
      .replace(/\{\{\s*phone\s*\}\}/gi, clinicPhone);

    if (dryRun) {
      return res.json({
        response: true,
        dryRun: true,
        campaignId,
        audience,
        recipientCount: deduped.length,
        excludedStaffCount: excludedCount,
        sampleRecipients: deduped.slice(0, 10),
        sampleMessage: renderBody(deduped[0] ? deduped[0].name : 'Patient'),
      });
    }

    const results = [];
    for (const t of deduped) {
      try {
        const ok = await sendMessage(renderBody(t.name), t.phone);
        results.push({ phone: t.phone, name: t.name, sent: ok !== false });
      } catch (e) {
        results.push({ phone: t.phone, name: t.name, sent: false, error: e.message });
      }
    }
    const sentCount = results.filter((r) => r.sent).length;
    return res.json({
      response: true,
      dryRun: false,
      campaignId,
      recipientCount: deduped.length,
      sentCount,
      failedCount: results.length - sentCount,
      results,
    });
  } catch (error) {
    console.error('sendSmsCampaign error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

module.exports = {
  updateNotificationSettings,
  getDailySchedule,
  sendDailySchedule,
  triggerDailySchedule,
  sendSmsCampaign,
};
