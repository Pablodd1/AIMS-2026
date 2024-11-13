const mongoose = require('mongoose');
const { Schema } = mongoose;
const { getCurrentDateGlobally , getCurrentTimeGlobally } = require('../Helper/getLocalDates')

const UserSchema = new Schema({
    first_name:{
        type:String,
        required:true,
        },
    last_name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    phone_number:{
        type:String,
        required:true,
        trim:true
    },
    title:{
        type:String,
        required:true,
    },
    speciality:{
        type:String,
        required:true,
    },
    Address:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
        trim:true
    },
    clinicName:{
        type:String,
        required:true,
    },
    clinic_logo:{
        type:String,
        default:""
    },
    profile_picture:{
        type:String,
        default:""
    },
   
    signature:{
        type:String,
        default:""
    },
    admin:{
        type:Boolean,
        default:false
    },
    businessMail:{
        type:String,
        default:""
    },
    appCode:{
        type:String,
        default:""
    },
    apiCredentials:[],
    date:{type:String},
    time:{type:String},
    assistants:[]


    
    

    },{timestamps:true})
    mongoose.models={}

        // Middleware to set getLocalDate before saving the document
        UserSchema.pre('save', function (next) {
    if (this.isNew) {
        this.time = getCurrentTimeGlobally()// Set to current local date
        this.date = getCurrentDateGlobally() 
    }
    next();
});

const User = mongoose.model("User", UserSchema);

module.exports = User;

