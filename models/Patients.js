const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');
const { Schema } = mongoose;

const PatientSchema = new Schema({
    doc_id:{
        type:String,
        required:true,
        },
    FullName:{
        type:String,
        required:true,
    },
    birthDate:{
        type:String,
        required:true,
    },
    gender:{
        type:String,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    phoneNumber:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
    },
    provider:{
        type:String,
        required:true,
    },
    policyName:{
        type:String,
        required:true,
    },
    groupNB:{
        type:String,
        required:true,
    },
    memberid:{
        type:String,
        required:true,
    }


    
    

    },{timestamps:true})
    mongoose.models={}

const Patient = mongoose.model("Patient", PatientSchema);

module.exports = Patient;

