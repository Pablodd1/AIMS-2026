const asyncHandler = require("express-async-handler");
const Patient = require("../models/Patients");
const Appointment = require("../models/Appointment");
const Visit = require("../models/Visit");
const User = require("../models/User");
const { getTodayDateInTimeZone } = require("../Helper/getLocalDates");

// Helper: resolve patient by name/phone/email
async function resolvePatient(query, doctorId) {
  const q = query.trim();
  const isPhone = /^[\d\s\-+()]{7,}$/.test(q);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);

  let filter = { doc_id: doctorId };
  if (isPhone) filter.phoneNumber = q.replace(/\D/g, "");
  else if (isEmail) filter.email = q;
  else filter.fullName = { $regex: q, $options: "i" };

  const patient = await Patient.findOne(filter).select("_id fullName dateOfBirth gender phoneNumber email");
  return patient;
}

// Helper: parse relative date to YYYY-MM-DD
function parseDate(input, timezone = "America/New_York") {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  const lower = input.toLowerCase().trim();

  if (lower === "today") return now.toISOString().slice(0, 10);
  if (lower === "tomorrow") {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayIdx = days.findIndex(d => lower.startsWith(d));
  if (dayIdx !== -1) {
    const target = new Date(now);
    const diff = (dayIdx - now.getDay() + 7) % 7 || 7;
    target.setDate(now.getDate() + diff);
    return target.toISOString().slice(0, 10);
  }

  // Try direct parse
  const parsed = new Date(input);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return now.toISOString().slice(0, 10);
}

// 1. Search patient
const searchPatientFn = asyncHandler(async (req, res) => {
  try {
    const { query } = req.body;
    const doctorId = req.user;
    if (!query) return res.status(400).json({ success: false, msg: "query required" });
    const patient = await resolvePatient(query, doctorId);
    if (!patient) return res.json({ success: true, data: null, msg: "No patient found" });
    res.json({ success: true, data: patient });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 2. Get patient calendar
const getPatientCalendarFn = asyncHandler(async (req, res) => {
  try {
    const { patient_id, date } = req.body;
    const doctorId = req.user;
    if (!patient_id || !date) return res.status(400).json({ success: false, msg: "patient_id and date required" });

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const appts = await Appointment.find({
      patientID: patient_id,
      doctorID: doctorId,
      time: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() },
    }).select("_id time status name");

    res.json({ success: true, data: appts });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 3. Schedule appointment
const scheduleAppointmentFn = asyncHandler(async (req, res) => {
  try {
    const { patient_id, datetime, timezone, clinic_name, phone } = req.body;
    const doctorId = req.user;
    if (!patient_id || !datetime || !timezone || !clinic_name || !phone) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const patient = await Patient.findOne({ _id: patient_id, doc_id: doctorId });
    if (!patient) return res.status(404).json({ success: false, msg: "Patient not found" });

    // Format time for appointmentController
    const formattedTime = new Date(datetime).toLocaleString("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).replace(",", "");

    const appt = await Appointment.create({
      patientID: patient_id,
      doctorID: doctorId,
      name: patient.fullName,
      email: patient.email || "N/A",
      time: formattedTime,
      userTimezone: timezone,
      reminder: new Date(new Date(datetime).getTime() - 3600000), // 1hr before
    });

    res.json({ success: true, data: appt, msg: `Appointment scheduled for ${formattedTime}` });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 4. Start medical scribe (create visit)
const startMedicalScribeFn = asyncHandler(async (req, res) => {
  try {
    const { patient_id, visit_type, chief_complaint } = req.body;
    const doctorId = req.user;
    if (!patient_id || !visit_type || !chief_complaint) {
      return res.status(400).json({ success: false, msg: "patient_id, visit_type, chief_complaint required" });
    }

    const patient = await Patient.findOne({ _id: patient_id, doc_id: doctorId });
    if (!patient) return res.status(404).json({ success: false, msg: "Patient not found" });

    const today = getTodayDateInTimeZone("America/New_York");
    const visit = new Visit({
      doc_id: doctorId,
      pId: patient_id,
      date: today.slice(0, 10),
      time: new Date().toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" }),
      chiefComplaint: chief_complaint,
      reportType: "2.0",
      mode: "generate",
    });

    await visit.save();
    await Patient.updateOne({ _id: patient_id }, { $inc: { visitCount: 1 } });

    res.json({ success: true, data: { visitId: visit._id, patientName: patient.fullName }, msg: `Visit started for ${patient.fullName}` });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 5. Create payment
const createPaymentFn = asyncHandler(async (req, res) => {
  try {
    const { patient_id, amount, method, note } = req.body;
    const doctorId = req.user;
    if (!patient_id || !amount || !method) {
      return res.status(400).json({ success: false, msg: "patient_id, amount, method required" });
    }

    const patient = await Patient.findOne({ _id: patient_id, doc_id: doctorId });
    if (!patient) return res.status(404).json({ success: false, msg: "Patient not found" });

    // Use existing invoice/payment logic - create minimal invoice with payment
    const Invoice = require("../models/Invoice");
    const invoice = new Invoice({
      doc_id: doctorId,
      pId: patient_id,
      patientName: patient.fullName,
      subTotal: amount,
      total: amount,
      paidAmount: amount,
      balance: 0,
      status: "paid",
      paymentMethod: method,
      paymentNote: note || "",
      date: new Date().toISOString().slice(0, 10),
    });
    await invoice.save();

    res.json({ success: true, data: { invoiceId: invoice._id }, msg: `Payment of $${amount} recorded via ${method}` });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 6. Get patient info
const getPatientInfoFn = asyncHandler(async (req, res) => {
  try {
    const { patient_id } = req.body;
    const doctorId = req.user;
    const patient = await Patient.findOne({ _id: patient_id, doc_id: doctorId });
    if (!patient) return res.status(404).json({ success: false, msg: "Patient not found" });
    res.json({ success: true, data: patient });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// 7. List today's appointments
const listTodayAppointmentsFn = asyncHandler(async (req, res) => {
  try {
    const { date } = req.body;
    const doctorId = req.user;
    const targetDate = date || getTodayDateInTimeZone("America/New_York").slice(0, 10);

    const dayStart = new Date(`${targetDate}T00:00:00`);
    const dayEnd = new Date(`${targetDate}T23:59:59`);

    const appts = await Appointment.find({
      doctorID: doctorId,
      time: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() },
      status: { $in: ["Scheduled", "Pending", "Confirmed"] },
    }).select("_id time name patientID status").sort({ time: 1 });

    res.json({ success: true, data: appts, date: targetDate });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

module.exports = {
  searchPatientFn,
  getPatientCalendarFn,
  scheduleAppointmentFn,
  startMedicalScribeFn,
  createPaymentFn,
  getPatientInfoFn,
  listTodayAppointmentsFn,
};