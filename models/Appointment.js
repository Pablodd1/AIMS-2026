const mongoose = require('mongoose');
// const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');
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
  },
  reminder: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Cancelled', 'Complete', 'Pending'], // Enum for status field
    default: 'Pending', // Optional: set default value
  },
  userTimezone: {
    type: String, // Store the timezone
    required: true, // Ensure it's always provided
}

}, { timestamps: true });

mongoose.models = {};

// Middleware to set date and time before saving the document
// AppointmentSchema.pre('save', function (next) {
//   console.log('Pre-save middleware executed for Appointment');
  
//   if (this.isNew) {
//     const currentDate = getCurrentDateGlobally(this.userTimezone);
//     const currentTime = getCurrentTimeGlobally(this.userTimezone);

//     if (!currentDate || !currentTime) {
//       console.error('Error: Date or time is undefined');
//     } else {
//       this.time = `${this.time} ${currentTime}`;
//       console.log(`Date and time set to: ${this.time}`);
//     }
//   }
//   next();
// });

const Appointment = mongoose.model("Appointment", AppointmentSchema);

module.exports = Appointment;
