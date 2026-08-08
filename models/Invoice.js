const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');

const InvoiceSchema = new Schema({
  docId: {
    type: String,
    required: true,
  },
  pId: {
    type: String,
    required: true,
  },
  item: {
    type: Array,
    default: [], // Default to an empty array if not provided
  },
  subTotal: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
  },
  time: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'], // Enum for status field
    default: 'Unpaid', // Optional: set default value
  },
  userTimezone: {
    type: String, // Store the timezone
    required: true, // Ensure it's always provided
}
}, { timestamps: true });

// Middleware to set date and time before saving the document
InvoiceSchema.pre('save', function (next) {
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

module.exports = mongoose.model('Invoice', InvoiceSchema);
