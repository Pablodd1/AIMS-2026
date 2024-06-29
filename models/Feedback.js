const mongoose = require('mongoose')
const { Schema } = mongoose;

const FeedBackSchema = new Schema({
    __v: { type: Number, default: 0 }, 
    email:{
        type:String,
        required:true,
        trim: true
    },
    msg:{
        type:String,
        required:true,
    },
    
    

    },{timestamps:true})
    mongoose.models={}

module.exports =  mongoose.model('FeedBack',FeedBackSchema) 