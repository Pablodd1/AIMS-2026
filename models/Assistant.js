const mongoose = require('mongoose');
const { Schema } = mongoose;
// const { getCurrentDateGlobally, getCurrentTimeGlobally } = require('../Helper/getLocalDates');

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

  access: {
    type: Boolean,
    default: false, // Optional: set default value
  },

}, { timestamps: true });

mongoose.models = {};

module.exports = mongoose.model('Assistant', AssistantSchema);
