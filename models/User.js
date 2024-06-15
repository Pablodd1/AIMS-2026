const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    first_name:{
        type:String,
        default:'',
        },
    last_name:{
        type:String,
        default:'',
    },
    email:{
        type:String,
        default:'',
    },
    phone_number:{
        type:String,
        default:'',
    },
    base:{
        type:String,
        default:'',
    },
    title:{
        type:String,
        default:'',
    },
    responsible:{
        type:String,
        default:'',
    },
    speciality:{
        type:String,
        default:'',
    },
    Address:{
        type:String,
        default:'',
    },
    password:{
        type:String,
        default:'',
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
    // profile_picture:{
    //     type:String,
    //     default:"none"
    // },
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

