const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');

const DocumentSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  fileOriginalName: {
    type: String,
    required: true,
  },
  pId: {
    type: String,
    required: true,
  },
  secure_url: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    default: () => getCurrentDateGlobally(), // Default to current date
  },
  time: {
    type: String,
    default: () => getCurrentTimeGlobally(), // Default to current time
  },
  userTimezone: {
    type: String, // Store the timezone
}
}, { timestamps: true });

mongoose.models = {};

// Middleware to set date and time before saving the document
DocumentSchema.pre('save', function (next) {
  console.log('Pre-save middleware executed for Document');

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

module.exports = mongoose.model('Document', DocumentSchema);
