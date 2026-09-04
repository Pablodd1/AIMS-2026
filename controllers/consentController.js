// PRP / procedure consent capture: signature + patient photo + provider details -> PDF -> email + chart
const asyncHandler = require("express-async-handler");
const cloudinary = require("cloudinary").v2;
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const Patient = require("../models/Patients");

const CONSENT_TEXT = `INFORMED CONSENT — PLATELET-RICH PLASMA (PRP) INJECTION

WHAT IT IS: Platelet-Rich Plasma (PRP) therapy uses a concentrated portion of your own blood, prepared by centrifuge, and injected into the target area to support the body's natural healing response.

POTENTIAL SIDE EFFECTS AND RISKS: Pain, soreness, bruising, swelling, or redness at the injection site; temporary stiffness; bleeding; infection (rare); nerve irritation (rare); allergic reaction to local anesthetic (if used); no guaranteed outcome — individual results vary, and multiple sessions may be needed.

By signing below, I confirm that the procedure, its purpose, and its potential side effects have been explained to me, my questions have been answered, and I voluntarily consent to the procedure.`;

function dataUrlToBuffer(d) {
  if (!d || typeof d !== "string" || !d.startsWith("data:image/")) return null;
  return Buffer.from(d.split(",")[1] || "", "base64");
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

function buildPdf({ patientName, dob, procedure, procedureDetails, signedAt, consentVersion, sigBuf, photoBuf, consentText, procedureDate }) {
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
    if (procedureDate) doc.text(`Date of procedure: ${procedureDate}`);
    doc.text(`Signed: ${signedAt}`);
    doc.text(`Consent version: ${consentVersion}`).moveDown();
    doc.moveDown().fontSize(9).text(consentText, { lineGap: 3 });
    if (procedureDetails) doc.moveDown().fontSize(10).text("Provider notes: " + procedureDetails);
    doc.moveDown();
    if (sigBuf) { doc.text("Patient signature:"); doc.image(sigBuf, { width: 220 }); doc.moveDown(); }
    if (photoBuf) doc.image(photoBuf, doc.page.width - 54 - 160, doc.y - 10, { width: 160 });
    doc.end();
  });
}

async function sendReportEmail(pdfBuf, patientName, procedure, signedAt) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.CONSENT_MAIL_USER, pass: process.env.CONSENT_MAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.CONSENT_MAIL_USER,
    to: process.env.CONSENT_MAIL_TO || process.env.CONSENT_MAIL_USER,
    subject: `Consent signed: ${patientName} — ${procedure}`,
    text: `${patientName} signed the ${procedure} consent at ${signedAt}. PDF attached.`,
    attachments: [{ filename: "consent.pdf", content: pdfBuf }],
  });
}

const submitConsent = asyncHandler(async (req, res) => {
  const { patientId, procedure, procedureDetails, signatureDataUrl, photoDataUrl, consentVersion, consentText, procedureDate } = req.body || {};
  if (!patientId || !procedure || !signatureDataUrl) {
    return res.status(400).json({ response: false, msg: "patientId, procedure and signature are required" });
  }
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ response: false, msg: "Patient not found" });

  const signedAt = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const version = consentVersion || "PRP-2026-09";
  const sigBuf = dataUrlToBuffer(signatureDataUrl);
  const photoBuf = dataUrlToBuffer(photoDataUrl);
  if (!sigBuf) return res.status(400).json({ response: false, msg: "Invalid signature image" });

  const base = `aims/consents/${patientId}`;
  const sigUrl = await uploadImage(sigBuf, base, `signature-${Date.now()}`);
  const photoUrl = photoBuf ? await uploadImage(photoBuf, base, `photo-${Date.now()}`) : null;

  const record = {
    procedure,
    procedureDetails: procedureDetails || "",
    signedAt,
    consentVersion: version,
    consentText: consentText || CONSENT_TEXT,
    procedureDate: procedureDate || "",
    signatureUrl: sigUrl,
    photoUrl,
  };

  const pdfBuf = await buildPdf({
    patientName: patient.fullName,
    dob: patient.dateOfBirth,
    procedure,
    procedureDetails: record.procedureDetails,
    signedAt,
    consentVersion: version,
    sigBuf,
    photoBuf,
    consentText: consentText || CONSENT_TEXT,
    procedureDate,
  });
  const pdfUrl = await uploadImage(pdfBuf, base, `consent-${Date.now()}`);
  record.pdfUrl = pdfUrl;

  if (!Array.isArray(patient.consents)) patient.consents = [];
  patient.consents.push(record);
  await patient.save();

  let emailed = false;
  try { await sendReportEmail(pdfBuf, patient.fullName, procedure, signedAt); emailed = true; }
  catch (e) { console.error("consent email failed:", e.message); }

  res.json({ response: true, consent: record, emailed });
});

const getConsents = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.query.id).select("consents fullName");
  if (!patient) return res.status(404).json({ response: false, msg: "Patient not found" });
  res.json({ response: true, fullName: patient.fullName, consents: patient.consents || [] });
});

module.exports = { submitConsent, getConsents };
