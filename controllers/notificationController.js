const asyncHandler = require("express-async-handler");
const User = require('../models/User')
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patients')
const { sendMessage } = require('./Twilio/twilio');
let ActivityLog = null;
try { ActivityLog = require('../models/ActivityLog'); } catch (_) {}

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
 * Send or dry-run preview an SMS or Email campaign via Twilio / Nodemailer.
 * POST /api/post/sendSmsCampaign
 * Body: { campaignId, message, emailSubject?: string, recipients?: [{name, phone, email}], audience?: string, channel?: 'sms'|'email'|'both', dryRun?: boolean }
 */
const sendSmsCampaign = asyncHandler(async (req, res) => {
  try {
    const { campaignId = 'custom', message, emailSubject, recipients, audience = 'custom', channel = 'sms', dryRun = true } = req.body || {};
    const rawMsg = String(message || '').trim();
    if (!rawMsg) return res.status(400).json({ response: false, msg: 'Campaign message is required.' });
    if (rawMsg.length > 2000) return res.status(400).json({ response: false, msg: 'Message too long (max 2000 chars).' });

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
    // Explicit user constraint: Never text/email Jeffrey Draesel/Draysol, Maria Draesel/Draysol, Caitlyn Moore, Caitlyn Draesel/Draysol, or company staff.
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
          const em = String(r.email || '').trim();
          if (ph || em) targets.push({ name: r.name || 'Patient', phone: ph, email: em });
        }
      });
    } else {
      const pats = await Patient.find({ doc_id: req.user })
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
        const email = String(p.email || '').trim();
        if (channel === 'sms' && !phone) return false;
        if (channel === 'email' && !email) return false;
        if (channel === 'both' && !phone && !email) return false;

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
      targets = filtered.map((p) => ({
        name: p.fullName || 'Patient',
        phone: normalizeUsE164(p.phoneNumber),
        email: String(p.email || '').trim()
      }));
    }

    // Deduplicate by normalized phone (or email when phone is absent) and cap batch at 100 per call
    const seen = new Set();
    const deduped = [];
    for (const t of targets) {
      const key = t.phone ? `ph:${t.phone}` : (t.email ? `em:${t.email.toLowerCase()}` : '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
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

    const isReactivation = campaignId === 'reactivation_60d';
    const emailHeroTitle = isReactivation
      ? `✨ We Miss You at ${clinicName} — New Protocols &amp; Treatments`
      : `🦃 Happy Thanksgiving from ${clinicName}`;
    const emailIntro = isReactivation
      ? `It has been a little while since your last visit at <strong>${clinicName}</strong>, and we wanted to personally check in on how you are feeling.`
      : `As the holiday season begins, all of us at <strong>${clinicName}</strong> want to express our deepest gratitude for trusting us with your health, recovery, and wellness.`;
    const emailHighlight = isReactivation
      ? `<strong>✨ What&rsquo;s New for Your Recovery &amp; Longevity:</strong><br>
      We have introduced <strong>new clinical protocols and treatments</strong>—including targeted spinal &amp; joint decompression, <strong>IV Wellness Therapy</strong>, <strong>Peptide Protocols</strong>, and <strong>PRP Regenerative Care</strong>—designed to relieve stubborn pain, boost energy, and restore mobility. We would love to talk with you about which option fits your goals when you get a moment!`
      : `<strong>✨ Practice Update &amp; New Care Options:</strong><br>
      We have recently introduced advanced <strong>new protocols and treatments</strong> designed to accelerate recovery, relieve stubborn pain, and enhance mobility. We would love to talk with you about them whenever you get a moment!`;

    const renderHtml = (name) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:0; background:#F4F1E8; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#1A1916; }
  .email-container { max-width:600px; margin:24px auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #D9CCA6; box-shadow:0 4px 15px rgba(0,0,0,0.06); }
  .header { background:#0F766E; color:#ffffff; padding:24px 20px; text-align:center; }
  .header h1 { margin:0; font-size:22px; font-weight:800; }
  .content { padding:26px 24px; line-height:1.6; font-size:15px; color:#334155; }
  .highlight-box { background:#F8FAFC; border-left:4px solid #0F766E; padding:14px 16px; margin:18px 0; border-radius:0 8px 8px 0; }
  .channels { margin:20px 0; padding:0; list-style:none; }
  .channels li { margin-bottom:10px; display:flex; align-items:center; gap:8px; font-weight:600; color:#0F172A; }
  .btn { display:inline-block; background:#0F766E; color:#ffffff !important; padding:12px 22px; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; margin:8px 4px; }
  .footer { background:#F1F5F9; padding:16px 20px; text-align:center; font-size:12px; color:#64748B; border-top:1px solid #E2E8F0; }
</style>
</head>
<body>
<div class="email-container">
  <div class="header">
    <h1>${emailHeroTitle}</h1>
  </div>
  <div class="content">
    <p>Dear ${String(name || 'there').split(/\s+/)[0]},</p>
    <p>${emailIntro}</p>
    
    <div class="highlight-box">
      ${emailHighlight}
    </div>

    <p>Whether you'd like to learn more, need a tune-up, or wish to schedule an appointment, reaching us is easy:</p>
    <ul class="channels">
      <li>📱 <strong>Text:</strong> Reply directly to our notification number</li>
      <li>📧 <strong>Email:</strong> <a href="mailto:${companyEmail}?cc=${jasmelEmail}">${companyEmail}</a> or <a href="mailto:${jasmelEmail}">${jasmelEmail}</a></li>
      <li>🌐 <strong>Website:</strong> <a href="${clinicWebsite}">${clinicWebsite}</a></li>
      <li>📞 <strong>Phone:</strong> Call us at ${clinicPhone} &mdash; or simply let us know and we will gladly call you at your preferred time!</li>
    </ul>

    <div style="text-align:center; margin:24px 0 12px;">
      <a href="${clinicWebsite}" class="btn">Visit Our Website</a>
      <a href="mailto:${companyEmail}?cc=${jasmelEmail}&subject=${encodeURIComponent(isReactivation ? 'New Protocols & Tune-Up Inquiry' : 'Thanksgiving Care Inquiry')}" class="btn" style="background:#2F62B5;">Email Us</a>
    </div>

    <p>${isReactivation ? 'We look forward to seeing you soon and helping you feel your best!' : 'Wishing you and your family a restful, joyful, and healthy Thanksgiving holiday!'}</p>
    <p style="margin-bottom:0;">Warmest regards,<br><strong>${clinicName} Team</strong></p>
  </div>
  <div class="footer">
    ${clinicName} &bull; Confidential Patient Communication &bull; Reply STOP to opt out.
  </div>
</div>
</body>
</html>`;

    if (dryRun) {
      const sample = deduped[0] || { name: 'Patient', phone: '+13055551234', email: 'patient@example.com' };
      return res.json({
        response: true,
        dryRun: true,
        campaignId,
        channel,
        audience,
        recipientCount: deduped.length,
        excludedStaffCount: excludedCount,
        sampleRecipients: deduped.slice(0, 10),
        sampleMessage: renderBody(sample.name),
        sampleHtml: (channel === 'email' || channel === 'both') ? renderHtml(sample.name) : null,
      });
    }

    const results = [];
    let transporter = null;
    if (channel === 'email' || channel === 'both') {
      const nodemailer = require('nodemailer');
      if (user && user.businessMail && user.appCode) {
        transporter = nodemailer.createTransport({
          port: 465, host: 'smtp.gmail.com', service: 'Gmail',
          auth: { user: user.businessMail, pass: user.appCode },
          secure: true,
        });
      } else if (process.env.NODE_MAILER_USER && process.env.NODE_MAILER_PASS) {
        transporter = nodemailer.createTransport({
          port: 465, host: 'smtp.gmail.com', service: 'Gmail',
          auth: { user: process.env.NODE_MAILER_USER, pass: process.env.NODE_MAILER_PASS },
          secure: true,
        });
      }
    }

    const sub = String(emailSubject || '').trim() || `🦃 Happy Thanksgiving from ${clinicName}`;

    for (const t of deduped) {
      let smsSent = false;
      let emailSent = false;
      let error = null;

      // SMS Delivery
      if ((channel === 'sms' || channel === 'both') && t.phone) {
        try {
          const ok = await sendMessage(renderBody(t.name), t.phone);
          smsSent = ok !== false;
        } catch (e) {
          error = e.message;
        }
      }

      // Email Delivery
      if ((channel === 'email' || channel === 'both') && t.email && transporter) {
        try {
          await transporter.sendMail({
            from: (user && user.businessMail) || process.env.NODE_MAILER_USER,
            to: t.email,
            subject: sub,
            text: renderBody(t.name),
            html: renderHtml(t.name),
          });
          emailSent = true;
        } catch (e) {
          error = (error ? error + '; ' : '') + 'Email error: ' + e.message;
        }
      }

      const sent = (channel === 'both') ? (smsSent || emailSent) : (channel === 'email' ? emailSent : smsSent);
      results.push({ name: t.name, phone: t.phone, email: t.email, sent, smsSent, emailSent, error });
    }

    const sentCount = results.filter((r) => r.sent).length;
    if (ActivityLog && typeof ActivityLog.create === 'function') {
      ActivityLog.create({
        userId: req.user,
        action: 'campaign_sent',
        details: { campaignId, channel, audience, recipientCount: deduped.length, sentCount, failedCount: results.length - sentCount },
      }).catch(() => {});
    }
    return res.json({
      response: true,
      dryRun: false,
      campaignId,
      channel,
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

/**
 * Twilio Inbound SMS Webhook — receives patient text replies to +18332164335.
 * POST /api/post/twilioInbound
 */
const twilioInbound = asyncHandler(async (req, res) => {
  try {
    const fromRaw = (req.body && (req.body.From || req.body.from)) || '';
    const bodyText = String((req.body && (req.body.Body || req.body.body)) || '').trim();
    const messageSid = (req.body && req.body.MessageSid) || '';
    const fromE164 = normalizeUsE164(fromRaw) || String(fromRaw).trim();
    const digits10 = String(fromE164).replace(/\D/g, '').slice(-10);

    let matchedPatient = null;
    if (digits10.length === 10 && Patient && typeof Patient.findOne === 'function') {
      matchedPatient = await Patient.findOne({
        phoneNumber: { $regex: digits10.split('').join('\\D*') },
      }).select('_id fullName email doc_id').lean().catch(() => null);
    }

    const isOptOut = /^\s*(stop|unsubscribe|cancel|end|quit)\s*$/i.test(bodyText);

    if (ActivityLog && typeof ActivityLog.create === 'function') {
      await ActivityLog.create({
        userId: (matchedPatient && matchedPatient.doc_id) || undefined,
        action: 'campaign_sms_reply',
        details: {
          from: fromE164,
          patientId: matchedPatient ? String(matchedPatient._id) : null,
          patientName: matchedPatient ? matchedPatient.fullName : 'Unmatched Number',
          body: bodyText.slice(0, 1000),
          messageSid,
          isOptOut,
        },
      }).catch(() => {});
    }

    // Forward patient reply to clinic / Jasmel email if configured
    if (!isOptOut && process.env.NODE_MAILER_USER && process.env.NODE_MAILER_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          port: 465, host: 'smtp.gmail.com', service: 'Gmail',
          auth: { user: process.env.NODE_MAILER_USER, pass: process.env.NODE_MAILER_PASS },
          secure: true,
        });
        const who = matchedPatient ? `${matchedPatient.fullName} (${fromE164})` : fromE164;
        await transporter.sendMail({
          from: process.env.NODE_MAILER_USER,
          to: 'jasmel.acosta@gmail.com',
          subject: `📱 Patient SMS Reply from ${who}`,
          text: `Patient: ${who}\nMessage:\n${bodyText}\n\nReceived: ${new Date().toISOString()}`,
        });
      } catch (_) {}
    }

    res.set('Content-Type', 'text/xml');
    if (isOptOut) {
      return res.send('<Response><Message>You have been unsubscribed from Innovative Medical Wellness text messages. Reply START to resubscribe.</Message></Response>');
    }
    return res.send('<Response><Message>Thank you for messaging Innovative Medical Wellness! Our team received your text and will reply or call you shortly.</Message></Response>');
  } catch (e) {
    res.set('Content-Type', 'text/xml');
    return res.send('<Response></Response>');
  }
});

/**
 * Campaign Monitoring & Patient Reply Stats
 * GET /api/get/campaignStats
 */
const getCampaignStats = asyncHandler(async (req, res) => {
  try {
    if (!ActivityLog || typeof ActivityLog.find !== 'function') {
      return res.json({ response: true, campaignsSent: 0, repliesReceived: 0, campaigns: [], replies: [] });
    }
    const [campaigns, replies] = await Promise.all([
      ActivityLog.find({ action: 'campaign_sent' }).sort({ createdAt: -1 }).limit(25).lean().catch(() => []),
      ActivityLog.find({ action: 'campaign_sms_reply' }).sort({ createdAt: -1 }).limit(50).lean().catch(() => []),
    ]);
    return res.json({
      response: true,
      campaignsSent: campaigns.length,
      repliesReceived: replies.length,
      campaigns: campaigns.map((c) => ({ id: c._id, at: c.createdAt, ...(c.details || {}) })),
      replies: replies.map((r) => ({ id: r._id, at: r.createdAt, ...(r.details || {}) })),
    });
  } catch (e) {
    return res.status(500).json({ response: false, msg: e.message });
  }
});

module.exports = {
  updateNotificationSettings,
  getDailySchedule,
  sendDailySchedule,
  triggerDailySchedule,
  sendSmsCampaign,
  twilioInbound,
  getCampaignStats,
};
