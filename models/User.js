const mongoose = require('mongoose');
const { Schema } = mongoose;

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
    publicIds:{
        signature_publicId:"",
        clinic_logo_publicId:"",
        signature_publicId:""
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
    website:{
        type:String,
        default:""
    }


    
    

    },{timestamps:true})
    mongoose.models={}

const User = mongoose.model("User", UserSchema);

module.exports = User;

