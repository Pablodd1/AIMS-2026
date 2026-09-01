const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');


const CheckNotesSchema = new Schema({
  docId: {
    type: String,
    required: true,
  },
  pId: {
    type: String,
    required: true,
  },
  checkInTime: {
    type: String,
    required: true,
  },
  checkOutTime: {
    type: String,
    required: false,  // optional — patients can check in without checking out
    default: '',
  },
  checkInDate: {
    type: String,
    required: true,
  },
  date: {
    type: String,
  },
  time: {
    type: String,
  },
  userTimezone: {
    type: String, // Store the timezone
    required: true, // Ensure it's always provided
}
}, { timestamps: true });


// Middleware to set date and time before saving the document
CheckNotesSchema.pre('save', function (next) {
  console.log('Pre-save middleware executed for Invoice');

  // Set date and time only for new documents
  if (this.isNew) {
    const currentDate = getCurrentDateGlobally(this.userTimezone);
    const currentTime = getCurrentTimeGlobally(this.userTimezone);

    if (!currentDate || !currentTime) {
      console.error('Error: Date or time is undefined');
    } else {
      this.date = currentDate;
      this.time = currentTime;
      console.log(`Date set to: ${currentDate}, Time set to: ${currentTime}`);
    }
  }
  next();
});

module.exports = mongoose.model('CheckNotes', CheckNotesSchema);
