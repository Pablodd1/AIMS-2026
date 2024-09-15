const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');
const { Schema } = mongoose;

const VisitSchema = new Schema({
    pId:{
        type:String,
        required:true,
    },
    doc_id:{
        type:String,
    },
    all:{
        type:String,
    },
    soapNotesSummary:{
        type:String,
    },
    subjective:{
        type:String,
    },
    objective:{
        type:String,
    },
    chiefComplaint:{
        type:String,
    },
    HPI:{
        type:String,
    },
    PMH:{
        type:String,
    },
    Allergy:{
        type:String,
    },
    ROS:{
        type:String,
    },
    physicalExamination:{
        type:String,
    },
    Assessment:{
        type:String,
    },
    med:{
        type:String,
    },
    Plan:{
        type:String,
    },
    Rationale:{
        type:String,
    },
    cptCodes:[{type:Object}],
    icdCodes:[{type:Object}],
    dxCodes: [{type:Object}]

    },{timestamps:true})
    mongoose.models={}

const Visit = mongoose.model("Visit", VisitSchema);

module.exports = Visit;

