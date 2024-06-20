const asyncHandler = require("express-async-handler");
const Visit = require('../models/Visit')
const Patient = require('../models/Patients')

const createVisit = asyncHandler(async (req, res) => {
    try {
        const {
            doc_id,
            pId,
            all,
            soapNotesSummary,
            subjective,
            objective,
            chiefComplaint,
            HPI,
            PMH,
            Allergy,
            ROS,
            physicalExamination,
            Assessment,
            med,
            cptCodes,
            icdCodes,
            dxCodes,
            Plan
        } = req.body;

        // if (!FullName)
        //     return res.status(200).send({ msg: "Enter FullName", response: false });
        // else if (!birthDate)
        //     return res.status(200).send({ msg: "Enter birthDate", response: false });
        // else if (!email || !email.includes("@"))
        //     return res.status(200).send({ msg: "Enter email", response: false });
        // else if (!gender)
        //     return res.status(200).send({ msg: "Enter gender", response: false });
        // else if (!phoneNumber)
        //     return res.status(200).send({ msg: "Enter phoneNumber", response: false });
        // else if (!address)
        //     return res.status(200).send({ msg: "Enter address", response: false });
        // else if (!provider)
        //     return res.status(200).send({ msg: "Enter provider", response: false });
        // else if (!policyName)
        //     return res.status(200).send({ msg: "Enter policyName", response: false });
        // else if (!groupNB)
        //     return res.status(200).send({ msg: "Enter groupNB", response: false });
        // else if (!memberid)
        //     return res.status(200).send({ msg: "Enter memberid", response: false });
        // else {
            // const patientExists = await Patient.findOne({ email });

            // if (patientExists) {
            //     return res.json({ response: false, msg: "Patient already exists in your patient list" });
            // }

            const visit = new Visit({
                doc_id,
                pId,
                all,
                soapNotesSummary,
                subjective,
                objective,
                chiefComplaint,
                HPI,
                PMH,
                Allergy,
                ROS,
                physicalExamination,
                Assessment,
                med,
                cptCodes,
                icdCodes,
                dxCodes,
                Plan
            });

            await visit.save();

            res.json({ response: true, msg: "Visited registered",id:visit._id });
        // }
    } catch (e) {
        res.status(500).json({ response: false, error: e.message });
    }
});


const viewReport = asyncHandler(async(req,res)=>{

   try
   {

       const { visitId } = req.query


       const visit = await Visit.findOne({_id:visitId})
       
       const patient = await Patient.findOne({_id:visit.pId})
       
       return res.status(200).json({response:true,patient,visit})
       
    }
    catch(e)
    {
        return res.json({response:false})
    }
})


const getVists = asyncHandler(async(req,res)=>{
    try
    {
      const visits = await Visit.find({pId:req.query.id})
      res.status(200).json({visits,response:true})
    }
    catch(e)
    {
      res.json({response:false})
    }
  })







module.exports = {
    createVisit,
    viewReport,
    getVists
};
