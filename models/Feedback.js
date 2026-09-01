const mongoose = require('mongoose')
const { Schema } = mongoose;
const { getCurrentDateGlobally , getCurrentTimeGlobally } = require('../Helper/getLocalDates')

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
    date:{
        type:String,
    },
    time:{
        type:String,
    }
    
    

    },{timestamps:true})

        // Middleware to set getLocalDate before saving the document
        FeedBackSchema.pre('save', function (next) {
    if (this.isNew) {
        this.time = getCurrentTimeGlobally()// Set to current local date
        this.date = getCurrentDateGlobally() 
    }
    next();
});

module.exports =  mongoose.model('FeedBack',FeedBackSchema) 