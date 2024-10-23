const mongoose = require('mongoose');
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');
const { Schema } = mongoose;

const AppointmentSchema = new Schema({
  patientID: {
    type: String,
    required: true,
  },
  doctorID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  time: {
    type: String,
    default: () => `${getCurrentDateGlobally()} ${getCurrentTimeGlobally()}`, // Default to current date and time
  },
  reminder: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Cancelled', 'Complete', 'Pending'], // Enum for status field
    default: 'Pending', // Optional: set default value
  }
}, { timestamps: true });

mongoose.models = {};

// Middleware to set date and time before saving the document
AppointmentSchema.pre('save', function (next) {
  console.log('Pre-save middleware executed for Appointment');

  // Set date and time only for new documents
  if (this.isNew) {
    const currentDate = getCurrentDateGlobally();
    const currentTime = getCurrentTimeGlobally();

    if (!currentDate || !currentTime) {
      console.error('Error: Date or time is undefined');
    } else {
      this.time = `${currentDate} ${currentTime}`;
      console.log(`Date and time set to: ${this.time}`);
    }
  }
  next();
});

const Appointment = mongoose.model("Appointment", AppointmentSchema);

module.exports = Appointment;
