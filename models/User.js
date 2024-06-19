const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');
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
    base:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    responsible:{
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
    // is_staff:{
    //     type:Boolean,
    //     default:false
    // },
    // is_active:{
    //     type:Boolean,
    //     default:false
    // },
    // date_joined:{
    //     type:Date,
    //     default:"none"
    // },
    profile_picture:{
        type:String,
        default:""
    },
    // is_superuser:{
    //     type:Boolean,
    //     default:false,
    // },
    // last_login:{
    //     type:String,
    //     default:null
    // },
    
    // name:{type:Object}


    
    

    },{timestamps:true})
    mongoose.models={}

const User = mongoose.model("User", UserSchema);

module.exports = User;

