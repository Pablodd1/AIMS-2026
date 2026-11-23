// visitCounter.js — single source of truth for Patient.visitCount.
// visitCount = distinct clinic days the patient was seen:
//   completed appointment (status "Complete"), check-in note, or visit doc.
// Recompute after EVERY mutation so the counter can never drift.
const Appointment = require("../models/Appointment");
const CheckNotes = require("../models/CheckNotes");
const Patient = require("../models/Patients");
const Visit = require("../models/Visit");

// Normalize date formats in use to YYYY-MM-DD.
// ponytail: known ceiling — handles ISO, YYYY-MM-DD[ T], M/D/YYYY, MM-DD-YYYY;
// anything else returns null and is skipped from the count.
function dayOf(v) {
  if (v == null) return null;
  const s = String(v).trim();
  const good = (mo, d) => mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return good(+m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], m[3]];
    if (a > 12 && b <= 12) [a, b] = [b, a]; // US M/D/Y slipped into a D/M/Y slot
    return good(a, b) ? `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}` : null;
  }
  return null;
}

const syncVisitCount = async (patientId) => {
  if (!patientId) return;
  const pidStr = String(patientId);
  const pat = await Patient.findById(pidStr).select("fullName").lean().catch(() => null);
  const apptOr = [{ patientID: pidStr }];
  if (pat && pat.fullName) {
    const escapedName = pat.fullName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    apptOr.push({ name: { $regex: `^${escapedName}$`, $options: "i" } });
  }
  const [appts, notes, visits] = await Promise.all([
    Appointment.find({ status: /^complet/i, $or: apptOr }, { time: 1 }).lean(),
    CheckNotes.find({ pId: pidStr }, { checkInDate: 1, date: 1, createdAt: 1 }).lean(),
    Visit.find({ pId: pidStr }, { date: 1, createdAt: 1 }).lean(),
  ]);
  const days = new Set();
  for (const a of appts) {
    const d = dayOf(a.time);
    if (d) days.add(d);
  }
  for (const n of notes) {
    const d = dayOf(n.checkInDate || n.date || (n.createdAt ? n.createdAt.toISOString() : null));
    if (d) days.add(d);
  }
  for (const v of visits) {
    const d = dayOf(v.date || (v.createdAt ? v.createdAt.toISOString() : null));
    if (d) days.add(d);
  }
  const visitDates = [...days].sort();
  await Patient.updateOne({ _id: pidStr }, { $set: { visitCount: days.size, visitDates } });
};

module.exports = { syncVisitCount, dayOf };
