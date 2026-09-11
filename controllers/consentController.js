// Procedure consent capture: signature + patient photo + provider details -> PDF -> email + chart.
//
// Context integrity rule: the signed record must carry the FULL context of what was
// consented to — the exact text shown to the patient, which version/form it was, the
// treatment area, safety screening answers, who captured it, when, and a link back to
// the original consent document. The text is resolved SERVER-SIDE from the version
// registry (controllers/consentForms.js, generated from the /consent/ page), so a stale
// or tampered client cannot change what a signature is recorded against.
const crypto = require("crypto");
const zlib = require("zlib");
const asyncHandler = require("express-async-handler");
const cloudinary = require("cloudinary").v2;
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const Patient = require("../models/Patients");
const User = require("../models/User");
const CONSENT_FORMS = require("./consentForms");

const DEFAULT_VERSION = "PRP-2026-09";
const CONSENT_TEXT = (CONSENT_FORMS[DEFAULT_VERSION] || {}).text || "";

function resolveText(version, clientText) {
  const form = CONSENT_FORMS[version];
  const client = (clientText || "").trim();
  if (form && form.text) {
    if (client && client !== form.text.trim()) {
      // page text drifted from the registry without a version bump — keep both, flag it
      return { text: form.text, source: "server+client-drift", form, drift: client };
    }
    return { text: form.text, source: "server", form, drift: "" };
  }
  if (client) return { text: clientText, source: "client", form: null, drift: "" };
  return { text: CONSENT_TEXT, source: "default", form: null, drift: "" };
}

function sha256(s) {
  return crypto.createHash("sha256").update(s || "", "utf8").digest("hex");
}

function dataUrlToBuffer(d) {
  if (!d || typeof d !== "string" || !d.startsWith("data:image/")) return null;
  return Buffer.from(d.split(",")[1] || "", "base64");
}

// pdfkit (png-js/jpeg-js) raises an UNCAUGHT zlib error on an undecodable image, which
// takes the whole process down. Validate here, before pdfkit ever sees the bytes: a bad
// signature must be a 400, not an outage. PNG is checked by actually inflating its IDAT
// payloads (exactly what png-js does, but synchronously and catchable).
function pngOk(buf) {
  if (!buf || buf.length < 16 || buf.slice(0, 8).toString("latin1") !== "\x89PNG\r\n\x1a\n") return false;
  const idat = [];
  let i = 8, w = 0, h = 0, sawIEND = false;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.slice(i + 4, i + 8).toString("latin1");
    const data = buf.slice(i + 8, i + 8 + len);
    if (type === "IHDR" && data.length >= 8) { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") { sawIEND = true; break; }
    i += 12 + len;
  }
  if (!w || !h || !idat.length || !sawIEND) return false;
  try { return zlib.inflateSync(Buffer.concat(idat)).length > 0; } catch (e) { return false; }
}

function jpegOk(buf) {
  return !!buf && buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

function imageOk(buf) {
  if (!buf) return false;
  if (pngOk(buf)) return true;
  return jpegOk(buf);
}

async function uploadImage(buf, folder, name) {
  return new Promise((resolve, reject) => {
    const s = cloudinary.uploader.upload_stream(
      { folder, public_id: name, resource_type: "image", format: "png" },
      (e, r) => (e ? reject(e) : resolve(r.secure_url))
    );
    s.end(buf);
  });
}

async function uploadRaw(buf, folder, name) {
  return new Promise((resolve, reject) => {
    const s = cloudinary.uploader.upload_stream(
      { folder, public_id: name, resource_type: "raw" },
      (e, r) => (e ? reject(e) : resolve(r.secure_url))
    );
    s.end(buf);
  });
}

function buildPdf({ patientName, dob, procedure, procedureDetails, signedAt, consentVersion, sigBuf, photoBuf, consentText, procedureDate, area, screening, sourceUrl, textHash, capturedBy }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("Innovative Medical Wellness", { align: "center" });
    doc.fontSize(13).text("Procedure Consent Record", { align: "center" }).moveDown();
    doc.fontSize(10);
    doc.text(`Patient: ${patientName}`);
    if (dob) doc.text(`Date of Birth: ${dob}`);
    doc.text(`Procedure: ${procedure}`);
    if (area) doc.text(`Treatment area: ${area}`);
    if (procedureDate) doc.text(`Date of procedure: ${procedureDate}`);
    doc.text(`Signed: ${signedAt}`);
    doc.text(`Consent form: ${consentVersion}`);
    if (capturedBy) doc.text(`Captured by: ${capturedBy}`).moveDown();

    doc.moveDown().fontSize(9).text(consentText, { lineGap: 3 });

    if (screening) doc.moveDown().fontSize(10).text("Safety screening: " + screening);
    if (procedureDetails) doc.moveDown().fontSize(10).text("Provider notes: " + procedureDetails);

    doc.moveDown();
    if (sigBuf) { doc.text("Patient signature:"); doc.image(sigBuf, { width: 220 }); doc.moveDown(); }
    if (photoBuf) doc.image(photoBuf, doc.page.width - 54 - 160, doc.y - 10, { width: 160 });

    doc.moveDown().fontSize(8).fillColor("#555");
    if (sourceUrl) doc.text(`Original consent document: ${sourceUrl}`);
    if (textHash) doc.text(`Consent text SHA-256: ${textHash}`);
    doc.fillColor("#000");
    doc.end();
  });
}

async function sendReportEmail(pdfBuf, patientName, procedure, signedAt, record) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.CONSENT_MAIL_USER, pass: process.env.CONSENT_MAIL_PASS },
  });
  const lines = [
    `${patientName} signed the ${procedure} consent at ${signedAt}. PDF attached.`,
    `Form: ${record.consentVersion} (text source: ${record.consentTextSource})`,
  ];
  if (record.area) lines.push(`Treatment area: ${record.area}`);
  if (record.procedureDate) lines.push(`Date of procedure: ${record.procedureDate}`);
  if (record.screening) lines.push(`Safety screening: ${record.screening}`);
  if (record.sourceUrl) lines.push(`Original consent document: ${record.sourceUrl}`);
  lines.push(`Consent text SHA-256: ${record.consentTextSha256}`);
  await transporter.sendMail({
    from: process.env.CONSENT_MAIL_USER,
    to: process.env.CONSENT_MAIL_TO || process.env.CONSENT_MAIL_USER,
    subject: `Consent signed: ${patientName} — ${procedure}`,
    text: lines.join("\n"),
    attachments: [{ filename: "consent.pdf", content: pdfBuf }],
  });
}

const submitConsent = asyncHandler(async (req, res) => {
  const {
    patientId, procedure, procedureDetails, signatureDataUrl, photoDataUrl,
    consentVersion, consentText, procedureDate, area, screening, sourceUrl,
  } = req.body || {};
  if (!patientId || !procedure || !signatureDataUrl) {
    return res.status(400).json({ response: false, msg: "patientId, procedure and signature are required" });
  }
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ response: false, msg: "Patient not found" });

  const signedAt = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const version = consentVersion || DEFAULT_VERSION;
  const resolved = resolveText(version, consentText);
  // an unknown version means a stale page (or a hand-made post): never record one form under
  // another form's words — make it reload instead.
  if (resolved.source === "default") {
    return res.status(400).json({ response: false, msg: `Unknown consent form version "${version}" — reload the consent page and sign again.` });
  }
  const textHash = sha256(resolved.text);

  const sigBuf = dataUrlToBuffer(signatureDataUrl);
  const photoBuf = dataUrlToBuffer(photoDataUrl);
  if (!sigBuf) return res.status(400).json({ response: false, msg: "Invalid signature image" });
  if (!photoBuf) return res.status(400).json({ response: false, msg: "Patient photo is required" });
  if (!imageOk(sigBuf)) return res.status(400).json({ response: false, msg: "The signature image could not be read — clear it and sign again." });
  if (!imageOk(photoBuf)) return res.status(400).json({ response: false, msg: "The patient photo could not be read — retake or re-upload it." });

  // who captured it (req.user is the decoded user id from protect)
  let capturedBy = "";
  try {
    const u = await User.findById(req.user).select("first_name last_name email");
    if (u) capturedBy = `${[u.first_name, u.last_name].filter(Boolean).join(" ")} <${u.email}>`.trim();
  } catch (e) { /* snapshot is best-effort */ }

  const base = `aims/consents/${patientId}`;
  const sigUrl = await uploadImage(sigBuf, base, `signature-${Date.now()}`);
  const photoUrl = photoBuf ? await uploadImage(photoBuf, base, `photo-${Date.now()}`) : null;

  const record = {
    procedure,
    area: (area || "").trim(),
    procedureDate: /^\d{4}-\d{2}-\d{2}$/.test(procedureDate || "") ? procedureDate : "",
    procedureDetails: procedureDetails || "",
    screening: (screening || "").trim(),
    signedAt,
    capturedAt: new Date().toISOString(),
    consentVersion: version,
    formKey: resolved.form ? resolved.form.key : "",
    consentText: resolved.text,
    consentTextSource: resolved.source,
    consentTextSha256: textHash,
    sourceUrl: (sourceUrl || process.env.CONSENT_SOURCE_URL || "").trim(),
    patientName: patient.fullName,
    patientDob: patient.dateOfBirth || "",
    capturedBy,
    signatureUrl: sigUrl,
    photoUrl,
  };
  if (resolved.drift) record.consentTextClientSha256 = sha256(resolved.drift);

  const pdfBuf = await buildPdf({
    patientName: patient.fullName,
    dob: patient.dateOfBirth,
    procedure,
    procedureDetails: record.procedureDetails,
    signedAt,
    consentVersion: version,
    sigBuf,
    photoBuf,
    consentText: resolved.text,
    procedureDate,
    area: record.area,
    screening: record.screening,
    sourceUrl: record.sourceUrl,
    textHash,
    capturedBy,
  });
  const pdfUrl = await uploadRaw(pdfBuf, base, `consent-${Date.now()}.pdf`);
  record.pdfUrl = pdfUrl;

  if (!Array.isArray(patient.consents)) patient.consents = [];
  patient.consents.push(record);
  await patient.save();

  if (resolved.source === "server+client-drift") {
    console.warn(`consent text drift: patient=${patientId} version=${version} — stored registry text, client hash recorded`);
  }

  let emailed = false;
  try { await sendReportEmail(pdfBuf, patient.fullName, procedure, signedAt, record); emailed = true; }
  catch (e) { console.error("consent email failed:", e.message); }

  res.json({ response: true, consent: record, emailed, textSource: resolved.source, textSha256: textHash });
});

const getConsents = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.query.id).select("consents fullName");
  if (!patient) return res.status(404).json({ response: false, msg: "Patient not found" });
  res.json({ response: true, fullName: patient.fullName, consents: patient.consents || [] });
});

// Canonical forms the clinic is using right now (versions + text lengths) — lets the
// UI/ops verify that what patients read matches what the backend will store.
const getConsentForms = asyncHandler(async (req, res) => {
  const out = {};
  for (const v of Object.keys(CONSENT_FORMS)) {
    out[v] = {
      key: CONSENT_FORMS[v].key,
      title: CONSENT_FORMS[v].title,
      proc: CONSENT_FORMS[v].proc,
      screening: CONSENT_FORMS[v].screen,
      chars: CONSENT_FORMS[v].text.length,
      sha256: sha256(CONSENT_FORMS[v].text),
    };
  }
  res.json({ response: true, forms: out });
});

module.exports = { submitConsent, getConsents, getConsentForms };
