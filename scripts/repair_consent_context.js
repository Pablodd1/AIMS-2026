// Idempotent repair for signed consent records captured before the context fields existed.
// Fills ONLY missing fields; nothing is overwritten. Never invents text: the text either
// comes from the version registry (generated from the /consent/ page) or stays as stored,
// with an honest label saying we could not prove it against the registry.
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const CF = require("/home/aims/aims-backend-node.js/controllers/consentForms");

const sha = (s) => crypto.createHash("sha256").update(s || "", "utf8").digest("hex");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const P = mongoose.connection.db.collection("patients");
  const docs = await P.find({ consents: { $exists: true, $ne: [] } }).project({ fullName: 1, consents: 1 }).toArray();
  let touched = 0, fields = 0;
  for (const d of docs) {
    let changed = false;
    for (const c of d.consents) {
      const f = CF[c.consentVersion];
      const note = [];
      if (!c.consentText && f) {
        c.consentText = f.text;
        note.push("text(" + f.text.length + "c, registry)");
      }
      if (c.consentText && !c.consentTextSha256) {
        c.consentTextSha256 = sha(c.consentText);
        note.push("sha256");
      }
      if (c.consentText && !c.consentTextSource) {
        c.consentTextSource = f && c.consentTextSha256 === sha(f.text) ? "backfill-registry-match" : "legacy-client-unverified";
        note.push("source=" + c.consentTextSource);
      }
      if (!c.formKey && f) { c.formKey = f.key; note.push("formKey"); }
      if (!c.patientName && d.fullName) { c.patientName = d.fullName; note.push("patientName"); }
      if (!c.capturedAt && c.signedAt) {
        const ts = Date.parse(c.signedAt);
        if (!isNaN(ts)) { c.capturedAt = new Date(ts).toISOString(); note.push("capturedAt"); }
      }
      if (c.procedureDate === undefined) { c.procedureDate = ""; }
      if (c.area === undefined) { c.area = ""; }
      if (c.screening === undefined) { c.screening = ""; }
      if (note.length) {
        console.log(" ", d.fullName, "|", c.procedure, "->", note.join(", "));
        changed = true; fields += note.length;
      }
    }
    if (changed) { await P.updateOne({ _id: d._id }, { $set: { consents: d.consents } }); touched++; }
  }
  console.log("fields filled:", fields, "in", touched, "patient(s)");
  await mongoose.disconnect();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
