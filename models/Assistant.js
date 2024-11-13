const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');

const AssistantSchema = new Schema({
  docId: {
    type: String,
    required: true,
  },
  username:{
    type:String,
    required:true,
    },
    password:{
    type:String,
    required:true,
    trim:true,
    },
  date: {
    type: String,
  },
  time: {
    type: String,
  },
  access: {
    type: Boolean,
    default: false, // Optional: set default value
  },
  userTimezone: {
    type: String, // Store the timezone
    required: true, // Ensure it's always provided
}
}, { timestamps: true });

mongoose.models = {};

// Middleware to set date and time before saving the document
// AssistantSchema.pre('save', function (next) {
//   console.log('Pre-save middleware executed for Invoice');

//   // Set date and time only for new documents
//   if (this.isNew) {
//     const currentDate = getCurrentDateGlobally(this.userTimezone);
//     const currentTime = getCurrentTimeGlobally(this.userTimezone);

//     if (!currentDate || !currentTime) {
//       console.error('Error: Date or time is undefined');
//     } else {
//       this.date = currentDate;
//       this.time = currentTime;
//       console.log(`Date set to: ${currentDate}, Time set to: ${currentTime}`);
//     }
//   }
//   next();
// });

module.exports = mongoose.model('Assistant', AssistantSchema);
