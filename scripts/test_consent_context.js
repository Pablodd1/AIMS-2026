// Runnable check for consent context integrity (self-cleaning).
//  A. client text that does not match the version registry cannot change what the
//     signature is recorded against (registry text stored, client hash kept).
//  B. an undecodable signature image returns 400 instead of killing the process.
// usage: node scripts/test_consent_context.js <patientId> [baseUrl]
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const CF = require("../controllers/consentForms");

const VERSION = "TPI-2026-09";
const GOOD_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAQ0lEQVR4nO3OQQ0AIAwAsflXgQhEIAsXHI8mFdA5e31l8oGQkJBQPRASEhKqB0JCQkL1QEhISKgeCAkJCdUDISGhxy5DLv0PzrIknAAAAABJRU5ErkJggg==";
const BAD_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const sha = (s) => crypto.createHash("sha256").update(s || "", "utf8").digest("hex");

const post = async (base, path, body, token) => {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

let fails = 0;
const check = (ok, label, extra) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? " — " + extra : ""}`); if (!ok) fails++; };

(async () => {
  const patientId = process.argv[2];
  const base = process.argv[3] || "http://127.0.0.1:4000";
  if (!patientId) { console.error("usage: node scripts/test_consent_context.js <patientId> [baseUrl]"); process.exit(1); }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const admin = await db.collection("users").findOne({}, { projection: { _id: 1 } });
  const token = jwt.sign({ id: String(admin._id) }, process.env.JWTSECRET);

  // ---- A. tampered text
  const tampered = "TAMPERED CONSENT TEXT - must never be what the signature records against.";
  const a = await post(base, "/api/post/submitConsent", {
    patientId, procedure: "TPI Injection", consentVersion: VERSION, consentText: tampered,
    procedureDate: "", area: "self-check", screening: "", signatureDataUrl: GOOD_PNG, photoDataUrl: GOOD_PNG,
  }, token);
  check(a.status === 200, "A: submit honoured", "http " + a.status + (a.json.msg ? " " + a.json.msg : ""));
  check(a.json.textSource === "server+client-drift", "A: drift flagged", "textSource=" + a.json.textSource);
  check(!!a.json.consent && a.json.consent.consentText === CF[VERSION].text, "A: registry text stored (not the posted text)");
  check(!!a.json.consent && a.json.consent.consentTextClientSha256 === sha(tampered), "A: client text hash recorded for the mismatch");
  check(!!a.json.consent && a.json.consent.consentTextSha256 === sha(CF[VERSION].text), "A: stored hash == registry hash");
  const p = await db.collection("patients").findOne({ _id: new mongoose.Types.ObjectId(patientId) }, { projection: { consents: 1 } });
  const saved = (p.consents || []).find((c) => c.consentTextClientSha256 === sha(tampered));
  check(!!saved && saved.area === "self-check", "A: record persisted with context fields");

  // cleanup A
  if (saved) {
    await db.collection("patients").updateOne({ _id: new mongoose.Types.ObjectId(patientId) }, { $pull: { consents: { consentTextClientSha256: sha(tampered) } } });
    const p2 = await db.collection("patients").findOne({ _id: new mongoose.Types.ObjectId(patientId) }, { projection: { consents: 1 } });
    check(!(p2.consents || []).some((c) => c.consentTextClientSha256 === sha(tampered)), "A: self-check record cleaned up");
  }

  // ---- B. undecodable signature must not kill the server
  const b = await post(base, "/api/post/submitConsent", {
    patientId, procedure: "TPI Injection", consentVersion: VERSION,
    procedureDate: "", area: "self-check", screening: "", signatureDataUrl: BAD_PNG, photoDataUrl: GOOD_PNG,
  }, token);
  check(b.status === 400, "B: bad signature rejected", "http " + b.status + " " + (b.json.msg || ""));
  await new Promise((r) => setTimeout(r, 800));
  let health = 0;
  try { health = (await fetch(base + "/api/health")).status; } catch (e) { health = -1; }
  check(health === 200, "B: server still alive after the bad image", "health " + health);

  await mongoose.disconnect();
  console.log(fails ? `\n${fails} CHECK(S) FAILED` : "\nall consent-context checks passed");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
