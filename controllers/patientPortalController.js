const asyncHandler = require('express-async-handler');
const Patient = require('../models/Patients');
const Appointment = require('../models/Appointment');
const Visit = require('../models/Visit');
const jwt = require('jsonwebtoken');

// Patient login via email/phone + DOB
const patientLogin = asyncHandler(async (req, res) => {
  try {
    const { email, phone, dateOfBirth } = req.body;
    if ((!email && !phone) || !dateOfBirth) {
      return res.status(400).json({ response: false, msg: 'Email or phone + date of birth required' });
    }

    const query = {};
    if (email) query.email = email.toLowerCase();
    if (phone) query.phoneNumber = phone;

    const patient = await Patient.findOne(query).lean();
    if (!patient) {
      return res.status(401).json({ response: false, msg: 'No patient found with this information' });
    }

    // Verify DOB (stored as string YYYY-MM-DD in existing system)
    if (patient.dateOfBirth !== dateOfBirth) {
      return res.status(401).json({ response: false, msg: 'Date of birth does not match' });
    }

    // Generate short-lived token for patient
    const token = jwt.sign(
      { patientId: patient._id, role: 'patient' },
      process.env.JWT_SECRET || 'patient-portal-secret',
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
      },
    });
  } catch (error) {
    console.error('Patient login error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Get patient's upcoming appointments
const getPatientAppointments = asyncHandler(async (req, res) => {
  try {
    const patientId = req.patient.patientId;
    const now = new Date().toISOString().split('T')[0];

    const appointments = await Appointment.find({
      patientID: patientId,
      status: { $ne: 'Complete' },
    })
      .sort({ time: 1 })
      .limit(20)
      .lean();

    return res.json({ response: true, appointments });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Get patient's visit history
const getPatientVisitHistory = asyncHandler(async (req, res) => {
  try {
    const patientId = req.patient.patientId;

    const visits = await Visit.find({ pId: patientId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('soapNotesSummary subjective objective Assessment Plan date createdAt chiefComplaint cptCodes icdCodes')
      .lean();

    return res.json({ response: true, visits });
  } catch (error) {
    console.error('Get patient visit history error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Middleware to verify patient token
const patientAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ response: false, msg: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patient-portal-secret');
    if (decoded.role !== 'patient') {
      return res.status(403).json({ response: false, msg: 'Access denied' });
    }
    req.patient = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ response: false, msg: 'Invalid or expired token' });
  }
});

module.exports = {
  patientLogin,
  getPatientAppointments,
  getPatientVisitHistory,
  patientAuth,
};
