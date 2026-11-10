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
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const syncVisitCount = async (patientId) => {
  if (!patientId) return;
  const [appts, notes, visits] = await Promise.all([
    Appointment.find({ patientID: patientId, status: "Complete" }, { time: 1 }),
    CheckNotes.find({ pId: patientId }, { checkInDate: 1 }),
    Visit.find({ pId: patientId }, { date: 1 }),
  ]);
  const days = new Set();
  for (const a of appts) {
    const d = dayOf(a.time);
    if (d) days.add(d);
  }
  for (const n of notes) {
    const d = dayOf(n.checkInDate);
    if (d) days.add(d);
  }
  for (const v of visits) {
    const d = dayOf(v.date);
    if (d) days.add(d);
  }
  await Patient.updateOne({ _id: patientId }, { $set: { visitCount: days.size } });
};

module.exports = { syncVisitCount, dayOf };
