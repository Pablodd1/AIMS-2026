const mongoose = require('mongoose');
const { Schema } = mongoose;

const AppointmentSchema = new Schema({
    patientID:{
        type:String,
        required:true,
        },
    doctorID:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        trim:true,
    },
    phone_number:{
        type:String,
        required:true,
        trim:true,
    },
    time:{
        type:String,
        required:true,
    },
    reminder:{
        type:String,
        required:true,
    },
    


    
    

    },{timestamps:true})
    mongoose.models={}

const User = mongoose.model("Appointment", AppointmentSchema);

module.exports = User;

