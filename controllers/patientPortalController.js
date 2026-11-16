const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const Patient = require('../models/Patients');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');
const Document = require('../models/Document');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createPatient } = require('./patientController');
const { UPLOAD_ROOT } = require('./localstorage');

// Patient tokens MUST use the same secret the rest of the app verifies with.
// Falling back to a hardcoded string lets anyone forge a token from the source.
function secret() {
  const s = process.env.JWTSECRET;
  if (!s) throw new Error('JWTSECRET not configured');
  return s;
}

// Stored DOB is a free-text string ("02/02/2002", "2002-02-02", ...). Compare
// calendar parts, never the raw string, or every MM/DD/YYYY patient is locked out.
function dobParts(v) {
  if (!v) return null;
  const t = String(v).trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return { y: +m[1], m: +m[2], d: +m[3] };
  if ((m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) return { y: +m[3], m: +m[1], d: +m[2] };
  return null;
}

function dobMatches(input, stored) {
  const a = dobParts(input), b = dobParts(stored);
  return !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
}

function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

// ponytail: 10 failed logins per IP per 15 min, in-memory. Email+DOB is guessable,
// so a lockout is the whole brute-force defence. Move to Redis if we run >1 node.
const attempts = new Map();
function locked(ip) {
  const r = attempts.get(ip);
  if (!r) return false;
  if (Date.now() - r.first > 15 * 60 * 1000) { attempts.delete(ip); return false; }
  return r.n >= 10;
}
function fail(ip) {
  const r = attempts.get(ip);
  if (!r || Date.now() - r.first > 15 * 60 * 1000) attempts.set(ip, { n: 1, first: Date.now() });
  else r.n++;
}

const patientLogin = asyncHandler(async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (locked(ip)) {
      return res.status(429).json({ response: false, msg: 'Too many attempts. Try again in 15 minutes or call the clinic.' });
    }

    const { email, phone, dateOfBirth } = req.body;
    const idInput = String(dateOfBirth || '').trim();
    if ((!email && !phone) || !idInput) {
      return res.status(400).json({ response: false, msg: 'Email or phone + date of birth (MM/DD/YYYY) required' });
    }
    const isFullDob = !!dobParts(idInput);
    const isLast4 = /^\d{4}$/.test(idInput);
    if (!isFullDob && !isLast4) {
      return res.status(400).json({ response: false, msg: 'Enter your date of birth (e.g. 03/14/1980), or the last 4 digits of the phone number we have on file.' });
    }

    let patient = null;
    if (email) {
      const e = String(email).trim();
      patient = await Patient.findOne({ email: { $regex: '^' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' } }).lean();
    }
    if (!patient && phone) {
      const d = digits(phone);
      if (d.length >= 7) {
        patient = await Patient.findOne({ phoneNumber: { $regex: d + '$' } }).lean();
      }
    }
    if (!patient) {
      fail(ip);
      return res.status(401).json({ response: false, msg: 'No patient found with this information' });
    }
    if (patient.dateOfBirth) {
      if (!isFullDob || !dobMatches(idInput, patient.dateOfBirth)) {
        fail(ip);
        return res.status(401).json({ response: false, msg: 'Date of birth does not match' });
      }
    } else {
      // No birth date on this chart yet — fall back to the last 4 digits of the
      // phone we have on file, so the patient is not locked out of their own record.
      const last4 = digits(patient.phoneNumber).slice(-4);
      if (!last4) {
        return res.status(403).json({ response: false, msg: 'Online access is not set up for this record yet. Please call the clinic: 305-864-1373.' });
      }
      if (!isLast4 || idInput !== last4) {
        fail(ip);
        return res.status(401).json({ response: false, msg: 'Last 4 digits of the phone number do not match. Call the clinic: 305-864-1373.' });
      }
    }

    attempts.delete(ip);
    const token = jwt.sign(
      { patientId: String(patient._id), role: 'patient' },
      secret(),
      { expiresIn: '24h' }
    );

    return res.json({
      response: true,
      token,
      patient: {
        _id: patient._id,
        fullName: patient.fullName,
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        dateOfBirth: patient.dateOfBirth,
        doc_id: patient.doc_id,
      },
    });
  } catch (error) {
    console.error('Patient login error:', error.message);
    return res.status(500).json({ response: false, msg: 'Login is temporarily unavailable.' });
  }
});

const getPatientAppointments = asyncHandler(async (req, res) => {
  try {
    const patientId = req.patient.patientId;
    const appointments = await Appointment.find({ patientID: patientId })
      .sort({ time: -1 })
      .limit(30)
      .select('time status doctor comment visitReason')
      .lean();
    return res.json({ response: true, appointments });
  } catch (error) {
    console.error('Get patient appointments error:', error.message);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

const getPatientVisitHistory = asyncHandler(async (req, res) => {
  try {
    const visits = await Visit.find({ pId: req.patient.patientId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('soapNotesSummary subjective objective assessment plan date createdAt chiefComplaint cptCodes icdCodes prescriptions ePrescription')
      .lean();
    return res.json({ response: true, visits });
  } catch (error) {
    console.error('Get patient visit history error:', error.message);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Documents belong to the patient. S3 is signed with a placeholder key on this
// host, so resolve to the local copy (same rule as AWS/GetObject) and hand back
// a token-bearing localFile URL the browser can open directly.
const getPatientDocuments = asyncHandler(async (req, res) => {
  try {
    const docs = await Document.find({ pId: req.patient.patientId })
      .sort({ date: -1 })
      .limit(100)
      .select('fileOriginalName secure_url date time')
      .lean();

    const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
    const out = docs.map((d) => {
      let url = null;
      const key = String(d.secure_url || '');
      if (/^https?:\/\//i.test(key)) url = key;
      else if (key && fs.existsSync(path.join(UPLOAD_ROOT, key))) {
        url = '/aims-service1/api/get/localFile?key=' + encodeURIComponent(key) + '&token=' + encodeURIComponent(tok);
      }
      return { name: d.fileOriginalName, date: d.date, url };
    });

    return res.json({ response: true, documents: out });
  } catch (error) {
    console.error('Get patient documents error:', error.message);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Patient-side upload (ID card, insurance card, signed forms). Stores on the VPS
// next to doctor uploads and files a Document record so it lands in the chart.
const patientUploadDocument = asyncHandler(async (req, res) => {
  try {
    const { fileName, dataBase64 } = req.body;
    if (!dataBase64 || !fileName) {
      return res.status(400).json({ response: false, msg: 'File data required' });
    }
    const patient = await Patient.findById(req.patient.patientId).lean();
    if (!patient) return res.status(401).json({ response: false, msg: 'Patient not found' });

    let buf;
    try { buf = Buffer.from(String(dataBase64).split(',').pop(), 'base64'); }
    catch (e) { return res.status(400).json({ response: false, msg: 'Unreadable file' }); }
    if (!buf.length) return res.status(400).json({ response: false, msg: 'Empty file' });
    if (buf.length > 15 * 1024 * 1024) return res.status(413).json({ response: false, msg: 'File too large (15 MB max)' });

    const safe = String(fileName).replace(/[^\w.\- ]+/g, '_').slice(-120) || 'upload';
    const key = 'Document/' + patient.doc_id + '/' + patient._id + '/' + Date.now() + '-' + safe;
    const fp = path.join(UPLOAD_ROOT, key);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, buf);

    await Document.create({
      userId: String(patient.doc_id),
      pId: String(patient._id),
      fileOriginalName: safe,
      secure_url: key,
    });

    return res.json({ response: true, msg: 'Uploaded', key });
  } catch (error) {
    console.error('Patient upload error:', error.message);
    return res.status(500).json({ response: false, msg: 'Upload failed' });
  }
});

// Public intake submit: the /intake/<docId> link is opened by patients, so it has
// no session. createPatient trusts doc_id from the body, so validate it is a real
// clinic and reuse the controller rather than duplicating 90 lines of it.
const publicIntake = asyncHandler(async (req, res) => {
  const docId = String((req.body && req.body.doc_id) || '');
  if (!/^[a-f0-9]{24}$/i.test(docId)) {
    return res.status(400).json({ response: false, msg: 'Invalid registration link. Please ask the clinic for a new one.' });
  }
  const clinic = await User.findById(docId).select('_id').lean();
  if (!clinic) {
    return res.status(400).json({ response: false, msg: 'Invalid registration link. Please ask the clinic for a new one.' });
  }
  req.user = docId;
  return createPatient(req, res);
});

const patientAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ response: false, msg: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], secret());
    if (decoded.role !== 'patient') {
      return res.status(403).json({ response: false, msg: 'Access denied' });
    }
    req.patient = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ response: false, msg: 'Invalid or expired token' });
  }
});


// ---------------------------------------------------------------------------
// Patient-facing medications. Prescriptions are written on the visit by the
// provider/scribe; the patient sees exactly those, plus a plain-language guide
// grounded ONLY in what was documented (no invented doses, no invented timing).
// ---------------------------------------------------------------------------
const okMed = (p) => p && p.medication && String(p.medication).trim();

const getPatientMedications = asyncHandler(async (req, res) => {
  const pId = String(req.patient.patientId || req.patient.id || '');
  const visits = await Visit.find({ pId }).sort({ date: -1, _id: -1 }).limit(60).lean();
  const out = [];
  for (const v of visits) {
    const rx = Array.isArray(v.prescriptions) ? v.prescriptions.filter(okMed) : [];
    const guides = Array.isArray(v.medicationGuides) ? v.medicationGuides : [];
    rx.forEach((p, i) => {
      const g = guides.find(x => x && x.medication === p.medication);
      out.push({
        visitId: String(v._id),
        date: v.date || (v.createdAt ? String(v.createdAt).slice(0, 10) : ''),
        index: i,
        medication: p.medication,
        dosage: p.dosage || '',
        frequency: p.frequency || '',
        duration: p.duration || '',
        instructions: p.instructions || '',
        refills: p.refills != null ? p.refills : null,
        guide: g ? g.guide : null,
      });
    });
  }
  return res.json({ response: true, medications: out, count: out.length });
});

const MED_DISCLAIMER = "This is general information about your medicine, not medical advice. Always follow the directions printed on your prescription label and the instructions from your provider. If you have questions, side effects, or your symptoms get worse, call the clinic.";

const explainMedication = asyncHandler(async (req, res) => {
  const pId = String(req.patient.patientId || req.patient.id || '');
  const { visitId, index } = req.body || {};
  if (!visitId) return res.status(400).json({ response: false, msg: 'visitId is required' });
  const visit = await Visit.findById(visitId).lean().catch(() => null);
  if (!visit) return res.status(404).json({ response: false, msg: 'Visit not found' });
  if (String(visit.pId) !== String(pId)) return res.status(403).json({ response: false, msg: 'Access denied' });

  const rx = (Array.isArray(visit.prescriptions) ? visit.prescriptions : []).filter(okMed);
  const p = rx[Number(index) || 0];
  if (!p) return res.status(404).json({ response: false, msg: 'No prescription documented on this visit' });

  const cached = (visit.medicationGuides || []).find(x => x && x.medication === p.medication);
  if (cached && cached.guide) return res.json({ response: true, medication: p, guide: cached.guide, cached: true });

  const key = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '';
  if (!key) return res.status(503).json({ response: false, msg: 'Medication guide service is not configured' });

  const dx = (visit.dxCodes || visit.icdCodes || []).map(c => [c.code, c.description].filter(Boolean).join(' ')).filter(Boolean).slice(0, 8);
  const sys = [
    'You explain a prescribed medicine to a patient in plain language (6th grade reading level).',
    'Use ONLY the documented prescription below. Never invent, change, increase or decrease a dose, frequency or duration.',
    'If the documented instructions do not say how or when to take it, say exactly: "Follow the directions printed on your prescription label."',
    '"why": in plain words, what this medicine is used to treat, using the documented diagnoses when present. If no diagnosis is documented, describe the type of medicine without guessing the patient\'s condition.',
    '"sideEffects": the well-known common side effects of THIS medicine, worded as effects that may happen. Never claim the patient is having them. Maximum 6.',
    '"warnings": serious signs that mean call the provider or emergency services. Maximum 4.',
    'Return ONLY valid JSON: {"why":"...","howToTake":"...","whenToTake":"...","sideEffects":["..."],"warnings":["..."]}',
  ].join(' ');
  const usr = { prescription: p, documentedDiagnoses: dx, plan: String(visit.Plan || '').slice(0, 1200) };

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: key });
    const c = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(usr) }],
    });
    let guide = {};
    try { guide = JSON.parse(c.choices[0].message.content); } catch (e) { guide = {}; }
    guide.why = String(guide.why || '').slice(0, 900);
    guide.howToTake = String(guide.howToTake || 'Follow the directions printed on your prescription label.').slice(0, 500);
    guide.whenToTake = String(guide.whenToTake || 'Follow the directions printed on your prescription label.').slice(0, 500);
    guide.sideEffects = (Array.isArray(guide.sideEffects) ? guide.sideEffects : []).slice(0, 6).map(x => String(x).slice(0, 240));
    guide.warnings = (Array.isArray(guide.warnings) ? guide.warnings : []).slice(0, 4).map(x => String(x).slice(0, 240));
    guide.disclaimer = MED_DISCLAIMER;
    guide.documented = { dosage: p.dosage || '', frequency: p.frequency || '', duration: p.duration || '', refills: p.refills != null ? p.refills : null };

    await Visit.updateOne({ _id: visitId }, { $push: { medicationGuides: { medication: p.medication, guide, generatedAt: new Date() } } });
    return res.json({ response: true, medication: p, guide, cached: false });
  } catch (e) {
    console.error('explainMedication failed:', e.message);
    return res.status(502).json({ response: false, msg: 'Could not build the guide right now. Please try again.' });
  }
});

module.exports = {
  patientLogin,
  getPatientAppointments,
  getPatientVisitHistory,
  getPatientDocuments,
  patientUploadDocument,
  publicIntake,
  patientAuth,
  dobMatches,
  getPatientMedications,
  explainMedication,
};
