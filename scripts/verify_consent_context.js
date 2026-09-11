// Verifies the consent trail end to end:
//  1. every stored record's consentText hashes to its stored consentTextSha256
//  2. that hash equals the text the LIVE /consent/ page hands to patients
//  3. the newest generated PDF actually carries the context (area, screening, hash, source link)
require("dotenv").config();
const crypto = require("crypto");
const https = require("https");
const zlib = require("zlib");
const mongoose = require("mongoose");

const sha = (s) => crypto.createHash("sha256").update(s || "", "utf8").digest("hex");
const get = (u) => new Promise((res, rej) => {
  https.get(u, (r) => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return res(get(r.headers.location));
    const c = []; r.on("data", (d) => c.push(d)); r.on("end", () => res(Buffer.concat(c)));
  }).on("error", rej);
});
const getText = async (u) => (await get(u)).toString("utf8"); // page is UTF-8 (em dashes etc.)

(async () => {
  // ---- 1/2. live page text vs stored hashes
  const html = await getText("https://aimedicalscriber.com/consent/");
  const start = html.indexOf("const CONSENTS = {");
  let depth = 0, end = -1;
  for (let i = html.indexOf("{", start); i < html.length; i++) {
    const ch = html[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (!depth) { end = i + 1; break; } }
  }
  const forms = eval("(" + html.slice(html.indexOf("{", start), end) + ")");
  console.log("live page forms:", Object.keys(forms).map((k) => k + "=" + forms[k].ver).join(", "));

  await mongoose.connect(process.env.MONGO_URI);
  const P = mongoose.connection.db.collection("patients");
  const docs = await P.find({ consents: { $exists: true, $ne: [] } }).project({ fullName: 1, consents: 1 }).toArray();
  let ok = 0, bad = 0;
  const pdfs = [];
  for (const d of docs) {
    for (const c of d.consents) {
      if (!c.consentText || !c.consentTextSha256) { console.log("  [MISSING text/hash]", d.fullName, "|", c.procedure); bad++; continue; }
      const live = Object.values(forms).find((f) => f.ver === c.consentVersion);
      const storedOk = sha(c.consentText) === c.consentTextSha256;
      const liveOk = live ? sha(live.text) === c.consentTextSha256 : null;
      if (!storedOk || liveOk === false) {
        console.log("  [DRIFT]", d.fullName, "|", c.consentVersion, "| stored:", storedOk, "| live:", liveOk);
        bad++;
      } else ok++;
      if (c.pdfUrl) pdfs.push(Object.assign({ patient: d.fullName }, c));
    }
  }
  console.log("records: text+hash verified:", ok, "| problems:", bad);

  // ---- 3. every stored PDF carries its own record's context
  let pdfBad = 0;
  for (const rec of pdfs) {
    console.log("PDF:", rec.patient, "|", rec.procedure, "|", rec.consentVersion, "|", rec.pdfUrl.slice(-32));
    const pdf = await get(rec.pdfUrl);
    console.log("pdf bytes:", pdf.length);
    if (pdf.slice(0, 4).toString("latin1") !== "%PDF") {
      console.log("  => legacy file (not a PDF — stored as an image when the record was signed); skipped");
      continue;
    }
    let content = "", streams = 0, inflated = 0;
    let from = 0;
    while (true) {
      const s = pdf.indexOf(Buffer.from("stream"), from);
      if (s < 0) break;
      const prev = pdf[s - 1], next = pdf[s + 6];
      const isKeyword = (prev === 0x0a || prev === 0x0d) && (next === 0x0d || next === 0x0a);
      if (!isKeyword) { from = s + 6; continue; }           // skip "endstream"
      let start = s + 6;
      if (pdf[start] === 0x0d) start++;
      if (pdf[start] === 0x0a) start++;
      const e = pdf.indexOf(Buffer.from("endstream"), start);
      if (e < 0) break;
      const raw = pdf.slice(start, e);
      streams++;
      try { const out = zlib.inflateSync(raw); content += out.toString("latin1"); inflated += out.length; }
      catch (x) { content += raw.toString("latin1"); }      // uncompressed stream
      from = e + 9;
    }
    // pdfkit embeds a subset font and writes page text as <hex> glyph groups — decode them
    let text = "";
    const hexRe = /<([0-9A-Fa-f]{2,})>/g;
    let hm;
    while ((hm = hexRe.exec(content))) {
      try { text += Buffer.from(hm[1], "hex").toString("latin1"); } catch (x) {}
    }
    const flat = text.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "");   // glyphs are WinAnsi bytes; drop non-ASCII (em dashes etc.) on both sides
    console.log("streams:", streams, "| inflated bytes:", inflated, "| decoded text bytes:", text.length);
    const checks = {
      "patient name": rec.patientName,
      "treatment area": rec.area,
      "form version": rec.consentVersion,
      "captured by": (rec.capturedBy || "").split(" <")[0],
      "text hash": rec.consentTextSha256,
      "consent body": (rec.consentText || "").slice(0, 60),
      "screening": rec.screening,
      "source document": rec.sourceUrl,
    };
    const missing = [];
    for (const k of Object.keys(checks)) {
      if (!checks[k]) { console.log("  -", k, "(not set on record, skipped)"); continue; }
      // subset fonts write WinAnsi glyph bytes, not UTF-8: compare ASCII-only, with whitespace stripped
      const target = String(checks[k]).replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "");
      const found = !!target && flat.indexOf(target) > -1;
      if (!found) missing.push(k);
      console.log("  -", k, "in PDF:", found ? "YES" : "NO");
    }
    if (missing.length) pdfBad++;
    console.log("  => context complete:", missing.length ? "NO (missing " + missing.join(", ") + ")" : "YES");
  }
  console.log("PDFs checked:", pdfs.length, "| with missing context:", pdfBad);
  await mongoose.disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
