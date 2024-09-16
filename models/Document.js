const mongoose = require('mongoose')
const { Schema } = mongoose;

const DocumentSchema = new Schema({
    userId:{
        type:String,
        required:true,
    },
    publicId:{
        type:String,
        required:true,
    },
    secure_url:{
        type:String,
        required:true,
    },
    
    

    },{timestamps:true})
    mongoose.models={}

module.exports =  mongoose.model('Document',DocumentSchema) 