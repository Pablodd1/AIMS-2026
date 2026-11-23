const asyncHandler = require('express-async-handler');
const OpenAI = require('openai');
const Patient = require('../models/Patients');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');
const CheckNotes = require('../models/CheckNotes');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { syncVisitCount } = require('../Helper/visitCounter');

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY || 'missing-key' });

// Complete AIMS platform route & module directory so voice can activate EVERY function
const FULL_AIMS_ROUTES = [
  { path: '/', label: 'Home / Main Dashboard', keywords: ['home', 'dashboard', 'main', 'start'] },
  { path: '/Dashboard', label: 'Analytics Dashboard', keywords: ['analytics', 'metrics', 'overview'] },
  { path: '/TodayPatients', label: "Today's Patients", keywords: ['today', 'todays patients', 'daily roster', 'queue'] },
  { path: '/Patient', label: 'All Patients Directory', keywords: ['patients', 'patient list', 'all patients', 'directory'] },
  { path: '/AppointmentSelection', label: 'Appointments Calendar', keywords: ['calendar', 'appointments', 'schedule'] },
  { path: '/Appointment', label: 'Create New Appointment', keywords: ['book', 'new appointment', 'schedule appointment'] },
  { path: '/AppointmentStatus', label: 'Appointment Status Board', keywords: ['appointment status', 'cancel', 'complete appointment'] },
  { path: '/ConsultationHub', label: 'Consultation & Visit Hub', keywords: ['consultation', 'visit hub', 'consult'] },
  { path: '/AimsAssistant', label: 'AIMS AI Chat Assistant', keywords: ['ai chat', 'aims assist', 'assistant', 'chat'] },
  { path: '/registerPatient/', label: 'Voice Intake / Register New Patient', keywords: ['voice intake', 'register patient', 'new patient', 'add patient'] },
  { path: '/Invoice', label: 'Invoices & Quick Invoice', keywords: ['invoice', 'invoices', 'quick invoice', 'billing'] },
  { path: '/payments-reconcile/', label: 'Payments & Terminal Reconciliation', keywords: ['payments', 'reconcile', 'terminal', 'poynt', 'godaddy'] },
  { path: '/dx-cpt-codes/', label: 'DX/CPT Codes, Biller & Compliance', keywords: ['codes', 'dx', 'cpt', 'icd', 'biller', 'compliance'] },
  { path: '/billing-ai/portal', label: 'Billing AI (837P Claims Portal)', keywords: ['billing ai', '837', 'claims', 'clearinghouse'] },
  { path: '/sms-center/', label: 'SMS Text Campaigns (5 Twilio Templates)', keywords: ['sms', 'text campaign', 'campaigns', 'twilio', 'marketing', 'blast'] },
  { path: '/consent/', label: 'Patient Consent Forms', keywords: ['consent', 'consents', 'hipaa form', 'signature'] },
  { path: '/scribe/', label: 'AI Medical Scribe (SOAP Notes)', keywords: ['scribe', 'soap note', 'dictate', 'medical note'] },
  { path: '/quick-note/', label: 'Quick Clinical Note', keywords: ['quick note', 'fast note', 'short note'] },
  { path: '/audio-notes/', label: 'Audio Notes', keywords: ['audio notes', 'recordings', 'voice notes'] },
  { path: '/red-flags/', label: 'Clinical Red Flags Validator', keywords: ['red flags', 'safety check', 'triage'] },
  { path: '/treatment-plan/', label: 'Treatment Plans', keywords: ['treatment plan', 'care plan', 'rehab plan'] },
  { path: '/translate/', label: 'Clinical Translator (EN/ES/HT)', keywords: ['translate', 'spanish', 'creole', 'translator'] },
  { path: '/summary/', label: 'Patient Clinical Summary', keywords: ['summary', 'patient summary', 'clinical summary'] },
  { path: '/voice-commander/', label: 'Voice Command Center', keywords: ['voice commander', 'voice center', 'command center'] },
  { path: '/Settings', label: 'Clinic Settings & Integrations', keywords: ['settings', 'config', 'smtp', 'profile', 'notifications'] },
  { path: '/Admin/NoteTypes', label: 'Note Templates & Types', keywords: ['note types', 'templates', 'soap templates'] },
  { path: '/admin/', label: 'Admin Panel', keywords: ['admin', 'admin panel', 'users', 'staff'] },
  { path: '/kiosk', label: 'Front-Desk Patient Kiosk', keywords: ['kiosk', 'check in kiosk', 'lobby'] },
  { path: '/intake/', label: 'Public Patient Intake', keywords: ['public intake', 'intake form'] },
  { path: '/pre-consult/', label: 'Pre-Consult Intake', keywords: ['pre consult', 'pre-consult'] },
  { path: '/Help', label: 'Help & Support', keywords: ['help', 'support', 'guide'] },
];

const SOLDIER_SYSTEM_PROMPT = `You are AIMS Tactical Command — the elite, human-sounding voice executive aide for a medical clinic inside the AIMS EHR platform.

VOICE & PERSONA ("Professional Soldier"):
- Calm, sharp, disciplined, respectful, and deeply human — like a seasoned military executive officer serving a physician.
- Concise, mission-focused, zero robotic filler. Use natural, crisp confirmations ("Copy that, Doctor.", "Understood.", "Standing by.", "Executed — opening her chart now.").
- Match the user's language automatically (English, Spanish, or Haitian Creole).
- Handle LONG, multi-sentence, compound spoken requests by breaking them into an ordered array of executable steps.

AVAILABLE ROUTES (exact paths):
${JSON.stringify(FULL_AIMS_ROUTES.map((r) => ({ path: r.path, label: r.label })))}

AVAILABLE STEP ACTIONS (return an array "steps" of 1 to 5 steps in execution order):
1. {"type":"search_patient","query":"name, DOB, phone, email, or DOS","openChart":true|false,"openScribe":true|false}
   - Finds patient across name, DOB, phone, email, or DOS, reports visit/check-in counts, and optionally opens /PatientFich/<id> (and launches Scribe if openScribe=true).
2. {"type":"appointments","day":"today|tomorrow|YYYY-MM-DD"}
   - Checks schedule for that date and lists patients & statuses.
3. {"type":"clinic_stats"}
   - Reports total patients, today's appointments, today's check-ins, and unpaid invoices count.
4. {"type":"checkin_patient","query":"patient name/phone/id","note":"optional check-in note"}
   - Logs a front-desk check-in for the patient today and updates their visit count.
5. {"type":"book_appointment","query":"patient name/phone/id","datetime":"YYYY-MM-DD HH:MM or natural time","confirmed":true|false}
   - Schedules an appointment. Set confirmed=false unless the user explicitly confirmed in this turn or previous turn.
6. {"type":"sms_campaign","campaignId":"reminder_24h|reactivation_60d|post_visit_review|missed_reschedule|wellness_promo","audience":"all_with_phone|inactive_60d|completed_recent_7d","openCenter":true}
   - Opens /sms-center/ pre-loaded with the requested campaign and previews audience count (dry-run). Never fires a live blast without explicit confirmation.
7. {"type":"navigate","path":"/ExactPath"}
   - Navigates to any AIMS page or tool from the route list above.
8. {"type":"translate","targetLang":"en|es|ht","text":"phrase to translate"}
   - Translates clinical speech cleanly into English, Spanish, or Haitian Creole.
9. {"type":"answer","text":"direct helpful answer"}
   - Answers general clinical workflow or AIMS questions concisely.

RULES:
- If the user asks multiple things in one long sentence (e.g. "Check who is on my schedule today, pull up Alicia Martinez, see how many visits she has, and open her chart"), include ALL steps in "steps".
- If the user references "him", "her", "that patient", or "this patient", use the currentPatientId or recent conversation history.
- Return ONLY valid JSON:
{
  "steps": [ ... ],
  "spokenIntro": "short crisp soldier-style acknowledgment if needed (1 sentence max)",
  "language": "en|es|ht"
}`;

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getClinicToday(offsetDays = 0) {
  const tz = process.env.CLINIC_TZ || 'America/New_York';
  const dt = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
}

async function smartFindPatients(rawQuery, scope, currentPatientId) {
  const q = String(rawQuery || '').trim();
  if (!q && currentPatientId) {
    const p = await Patient.findOne({ ...scope, _id: currentPatientId }).lean().catch(() => null);
    return p ? [p] : [];
  }
  if (!q) return [];
  const clean = q.replace(/\b(find|search|look up|open|pull up|show me|get|patient|chart|file|for|the)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const orConds = [];
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 7) {
    orConds.push({ phoneNumber: { $regex: digits.split('').join('\\D*'), $options: 'i' } });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(clean)) {
    orConds.push({ dateOfBirth: { $regex: escapeRegex(clean), $options: 'i' } });
    orConds.push({ visitDates: clean });
  }
  if (clean.includes('@')) {
    orConds.push({ email: { $regex: escapeRegex(clean), $options: 'i' } });
  }
  const toks = clean.split(/\s+/).filter(Boolean).slice(0, 4);
  if (toks.length) {
    orConds.push({ $and: toks.map((t) => ({ fullName: { $regex: escapeRegex(t), $options: 'i' } })) });
  }
  let list = await Patient.find({ ...scope, $or: orConds }).limit(5).lean();
  if (!list.length && toks.length) {
    list = await Patient.find({ ...scope, fullName: { $regex: escapeRegex(toks[0]), $options: 'i' } }).limit(5).lean();
  }
  return list;
}

const VALID_ROUTE_PATHS = new Set(FULL_AIMS_ROUTES.map((r) => r.path));
const ALLOWED_TTS_VOICES = new Set(['onyx', 'echo', 'alloy', 'fable', 'nova', 'shimmer']);

/**
 * POST /api/post/voiceAssistant  (and /api/post/voiceCommand)
 * Enriched multi-step natural language command executor for all AIMS functions.
 */
const voiceCommandPro = asyncHandler(async (req, res) => {
  try {
    const { text, path = '', patientId = '', history = [], confirm = false } = req.body || {};
    const utterance = String(text || '').trim();
    if (!utterance) {
      return res.status(400).json({ response: false, action: 'unknown', message: 'Standing by, Doctor. No command received.' });
    }

    const caller = await User.findById(req.user).select('admin clinicName').lean().catch(() => null);
    const isAdmin = !!(caller && caller.admin);
    const patScope = isAdmin ? {} : { doc_id: req.user };
    const apptScope = isAdmin ? {} : { doctorID: req.user };

    const recentHistory = Array.isArray(history)
      ? history.slice(-6).map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content || '').slice(0, 400),
        }))
      : [];

    const todayStr = getClinicToday(0);
    const tomorrowStr = getClinicToday(1);

    const completion = await openai.chat.completions.create({
      model: process.env.AIMS_VOICE_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SOLDIER_SYSTEM_PROMPT },
        ...recentHistory,
        {
          role: 'user',
          content: JSON.stringify({
            utterance,
            currentPath: path,
            currentPatientId: patientId || null,
            today: todayStr,
            tomorrow: tomorrowStr,
            userConfirmed: !!confirm,
          }),
        },
      ],
    });

    const raw = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || '{}';
    let plan = {};
    try { plan = JSON.parse(raw); } catch (_) { plan = {}; }
    const steps = Array.isArray(plan.steps) && plan.steps.length ? plan.steps.slice(0, 5) : [{ type: 'answer', text: 'Understood, Doctor. Please specify which patient or module you want activated.' }];

    const stepsExecuted = [];
    const speechParts = [];
    let primaryAction = 'answer';
    let navPath = '';
    let resolvedPatient = null;
    let openScribe = false;
    let smsCampaignId = '';
    let requiresConfirmation = false;
    let pendingAction = null;

    for (const step of steps) {
      const type = String(step.type || '').toLowerCase();

      if (type === 'search_patient' || type === 'open_patient' || type === 'patient_visits') {
        const list = await smartFindPatients(step.query, patScope, patientId);
        if (!list.length) {
          stepsExecuted.push({ type, ok: false, summary: `No patient matched "${step.query || ''}"` });
          speechParts.push(`Negative on "${step.query || 'that search'}" — no matching patient on file.`);
        } else {
          const p0 = list[0];
          resolvedPatient = p0;
          const pidStr = String(p0._id);
          const [checkIns, visits] = await Promise.all([
            CheckNotes.countDocuments({ pId: pidStr }).catch(() => 0),
            Visit.countDocuments({ pId: pidStr }).catch(() => 0),
          ]);
          const totalVisits = Math.max(Number(p0.visitCount || 0), checkIns, visits);
          const lastDos = Array.isArray(p0.visitDates) && p0.visitDates.length ? p0.visitDates[p0.visitDates.length - 1] : null;
          const others = list.slice(1, 3).map((x) => x.fullName).filter(Boolean);
          const detail = `${p0.fullName} — ${totalVisits} visit${totalVisits === 1 ? '' : 's'} (${checkIns} check-in${checkIns === 1 ? '' : 's'}, ${visits} SOAP note${visits === 1 ? '' : 's'})${lastDos ? ', last DOS ' + lastDos : ''}`;
          stepsExecuted.push({ type, ok: true, patientId: pidStr, name: p0.fullName, totalVisits, checkIns, visits, lastDos, summary: detail });
          if (step.openChart !== false) {
            primaryAction = 'openPatient';
            navPath = `/PatientFich/${pidStr}`;
          }
          if (step.openScribe) openScribe = true;
          speechParts.push(`Located ${detail}.${others.length ? ' Also matched: ' + others.join(', ') + '.' : ''}${step.openScribe ? ' Launching AI Scribe.' : step.openChart !== false ? ' Opening chart now.' : ''}`);
        }
      } else if (type === 'appointments') {
        let day = todayStr;
        const dRaw = String(step.day || '').toLowerCase();
        if (dRaw.includes('tomorrow') || dRaw.includes('mañana') || dRaw.includes('manana')) day = tomorrowStr;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(dRaw)) day = dRaw;
        const found = await Appointment.find({
          ...apptScope,
          status: { $in: ['Scheduled', 'Pending', 'Confirmed', 'Complete', 'Completed'] },
          time: { $regex: '^' + escapeRegex(day), $options: 'i' },
        }).sort({ time: 1 }).lean();
        const names = found.slice(0, 6).map((a) => `${a.name || a.fullName || 'Patient'} (${a.status || 'Scheduled'})`).join(', ');
        stepsExecuted.push({ type, ok: true, date: day, count: found.length, summary: `${found.length} appointment(s) on ${day}` });
        if (primaryAction === 'answer') primaryAction = 'appointments';
        speechParts.push(found.length
          ? `${found.length} appointment${found.length === 1 ? '' : 's'} on ${day}: ${names}.`
          : `Schedule is clear on ${day} — zero appointments booked.`);
      } else if (type === 'clinic_stats') {
        const [totalPatients, todayAppts, todayCheckIns, unpaidInvoices] = await Promise.all([
          Patient.countDocuments(patScope).catch(() => 0),
          Appointment.countDocuments({ ...apptScope, time: { $regex: '^' + escapeRegex(todayStr), $options: 'i' } }).catch(() => 0),
          CheckNotes.countDocuments({ checkInDate: { $regex: '^' + escapeRegex(todayStr), $options: 'i' } }).catch(() => 0),
          Invoice.countDocuments({ ...patScope, status: { $in: ['unpaid', 'pending', 'partial'] } }).catch(() => 0),
        ]);
        const summary = `${totalPatients} patients total, ${todayAppts} appointments today, ${todayCheckIns} check-ins today, ${unpaidInvoices} open invoices`;
        stepsExecuted.push({ type, ok: true, totalPatients, todayAppts, todayCheckIns, unpaidInvoices, summary });
        speechParts.push(`Clinic sitrep: ${summary}.`);
      } else if (type === 'checkin_patient') {
        const list = await smartFindPatients(step.query, patScope, resolvedPatient ? resolvedPatient._id : patientId);
        if (!list.length) {
          stepsExecuted.push({ type, ok: false, summary: `Patient not found for check-in: "${step.query || ''}"` });
          speechParts.push(`Unable to check in "${step.query || 'patient'}" — record not found.`);
        } else {
          const p0 = list[0];
          const nowIso = new Date().toISOString().slice(0, 19);
          await CheckNotes.create({
            pId: String(p0._id),
            doc_id: req.user,
            checkInDate: nowIso,
            date: todayStr,
            note: step.note || 'Checked in via AIMS Voice Command',
          });
          await syncVisitCount(p0._id).catch(() => {});
          resolvedPatient = p0;
          stepsExecuted.push({ type, ok: true, patientId: String(p0._id), summary: `Checked in ${p0.fullName} (${todayStr})` });
          speechParts.push(`Copy that — ${p0.fullName} is checked in for ${todayStr} and visit count updated.`);
        }
      } else if (type === 'book_appointment') {
        const list = await smartFindPatients(step.query, patScope, resolvedPatient ? resolvedPatient._id : patientId);
        if (!list.length) {
          stepsExecuted.push({ type, ok: false, summary: `Patient not found for booking: "${step.query || ''}"` });
          speechParts.push(`Cannot schedule yet — I could not locate "${step.query || 'that patient'}".`);
        } else if (!confirm && !step.confirmed) {
          const p0 = list[0];
          requiresConfirmation = true;
          pendingAction = { type: 'book_appointment', patientId: String(p0._id), name: p0.fullName, datetime: step.datetime || `${tomorrowStr} 10:00` };
          primaryAction = 'confirm_required';
          stepsExecuted.push({ type, ok: true, pending: true, summary: `Awaiting confirmation to book ${p0.fullName} at ${pendingAction.datetime}` });
          speechParts.push(`Ready to book ${p0.fullName} for ${pendingAction.datetime}. Say "confirm" or tap Confirm to lock it in, Doctor.`);
        } else {
          const p0 = list[0];
          const dtStr = String(step.datetime || `${tomorrowStr} 10:00`);
          const appt = await Appointment.create({
            patientID: String(p0._id),
            doctorID: req.user,
            name: p0.fullName,
            email: p0.email || 'N/A',
            time: dtStr,
            status: 'Scheduled',
            userTimezone: process.env.CLINIC_TZ || 'America/New_York',
          });
          stepsExecuted.push({ type, ok: true, appointmentId: String(appt._id), summary: `Booked ${p0.fullName} for ${dtStr}` });
          speechParts.push(`Mission accomplished — ${p0.fullName} is scheduled for ${dtStr}.`);
        }
      } else if (type === 'sms_campaign') {
        const camp = String(step.campaignId || 'reactivation_60d');
        const audience = String(step.audience || (camp === 'reactivation_60d' ? 'inactive_60d' : camp === 'post_visit_review' ? 'completed_recent_7d' : 'all_with_phone'));
        const phoneCount = await Patient.countDocuments({ ...patScope, phoneNumber: { $exists: true, $ne: '' } }).catch(() => 0);
        smsCampaignId = camp;
        navPath = `/sms-center/?campaign=${encodeURIComponent(camp)}`;
        primaryAction = 'navigate';
        stepsExecuted.push({ type, ok: true, campaignId: camp, audience, phoneCount, summary: `Prepared SMS campaign "${camp}" (${phoneCount} patients with phone on file)` });
        speechParts.push(`Opening SMS Command Center with the ${camp.replace(/_/g, ' ')} campaign loaded. ${phoneCount} patients have a mobile number on file — review the dry-run before firing live.`);
      } else if (type === 'navigate') {
        const targetPath = String(step.path || '').trim();
        if (VALID_ROUTE_PATHS.has(targetPath) || /^\/[a-zA-Z0-9/_-]+$/.test(targetPath)) {
          navPath = targetPath;
          if (primaryAction === 'answer' || primaryAction === 'appointments') primaryAction = 'navigate';
          const meta = FULL_AIMS_ROUTES.find((r) => r.path === targetPath);
          stepsExecuted.push({ type, ok: true, path: targetPath, summary: `Navigate to ${meta ? meta.label : targetPath}` });
          speechParts.push(`Opening ${meta ? meta.label : targetPath}.`);
        }
      } else if (type === 'translate') {
        const targetLang = step.targetLang === 'es' ? 'Spanish' : step.targetLang === 'ht' ? 'Haitian Creole' : 'English';
        const tr = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: `Translate the following medical/clinic phrase accurately and naturally into ${targetLang}. Return ONLY the translated text.` },
            { role: 'user', content: String(step.text || utterance) },
          ],
        });
        const translated = (tr.choices && tr.choices[0] && tr.choices[0].message && tr.choices[0].message.content || '').trim();
        stepsExecuted.push({ type, ok: true, targetLang, translated, summary: `Translated to ${targetLang}` });
        speechParts.push(translated || 'Translation complete.');
      } else if (type === 'answer') {
        const txt = String(step.text || '').trim();
        if (txt) {
          stepsExecuted.push({ type, ok: true, summary: txt });
          speechParts.push(txt);
        }
      }
    }

    const intro = plan.spokenIntro && !speechParts.length ? String(plan.spokenIntro).trim() : '';
    const finalMessage = [intro, ...speechParts].filter(Boolean).join(' ').trim() || 'Copy that, Doctor. Command executed.';

    return res.json({
      response: true,
      action: primaryAction,
      path: navPath,
      patientId: resolvedPatient ? String(resolvedPatient._id) : (patientId || undefined),
      name: resolvedPatient ? resolvedPatient.fullName : undefined,
      openScribe,
      smsCampaignId: smsCampaignId || undefined,
      requiresConfirmation,
      pendingAction,
      stepsExecuted,
      language: plan.language || 'en',
      message: finalMessage,
    });
  } catch (e) {
    console.error('voiceCommandPro error:', e && e.message);
    return res.status(500).json({ response: false, action: 'unknown', message: 'Comms interrupted, Doctor. Please repeat your command.' });
  }
});

/**
 * POST /api/post/voiceSpeak
 * Natural human AI voice synthesis (OpenAI Neural TTS, default "onyx" = calm, crisp professional soldier voice).
 */
const voiceSpeak = asyncHandler(async (req, res) => {
  try {
    const rawText = String((req.body && req.body.text) || '').trim();
    if (!rawText) return res.status(400).json({ response: false, msg: 'text is required' });
    const text = rawText.slice(0, 900);
    const reqVoice = String((req.body && req.body.voice) || 'onyx').toLowerCase();
    const voice = ALLOWED_TTS_VOICES.has(reqVoice) ? reqVoice : 'onyx';
    const rawSpeed = Number((req.body && req.body.speed) || 1.04);
    const speed = Number.isFinite(rawSpeed) ? Math.min(1.3, Math.max(0.85, rawSpeed)) : 1.04;

    const mp3 = await openai.audio.speech.create({
      model: process.env.AIMS_TTS_MODEL || 'tts-1',
      voice,
      input: text,
      speed,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store',
    });
    return res.send(buffer);
  } catch (e) {
    console.error('voiceSpeak error:', e && e.message);
    return res.status(500).json({ response: false, msg: 'TTS synthesis unavailable' });
  }
});

module.exports = {
  FULL_AIMS_ROUTES,
  SOLDIER_SYSTEM_PROMPT,
  voiceCommandPro,
  voiceSpeak,
};
