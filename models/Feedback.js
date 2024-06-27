const mongoose = require('mongoose')
const { Schema } = mongoose;

const FeedBackSchema = new Schema({
    __v: { type: Number, default: 0 }, 
    username:{
        type:String,
         required:true
        },
    email:{
        type:String,
        required:true,
        unique:true,
        trim: true
    },
    msg:{
        type:String,
        required:true,
    },
    
    

    },{timestamps:true})
    mongoose.models={}

module.exports =  mongoose.model('FeedBack',FeedBackSchema) 