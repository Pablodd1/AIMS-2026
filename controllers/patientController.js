const asyncHandler = require("express-async-handler");
const Patient = require('../models/Patients')


const createPatient = asyncHandler(async(req,res)=>{

    try{

        const { doc_id , FullName , birthDate , gender , address , phoneNumber , email , provider , policyName , groupNB , memberid } = req.body
        
        if(!FullName)
        return res.status(200).send({ msg:"Enter FullName", response: false });
      else if(!birthDate)
        return res.status(200).send({ msg:"Enter birthDate", response: false });
      else if(!email || !email.includes("@"))
        return res.status(200).send({ msg:"Enter email", response: false });
      else if(!gender)
        return res.status(200).send({ msg:"Enter gender", response: false });
      else if(!phoneNumber)
        return res.status(200).send({ msg:"Enter phoneNumber", response: false });
      else if(!address)
        return res.status(200).send({ msg:"Enter address", response: false });
      else if(!provider)
        return res.status(200).send({ msg:"Enter provider", response: false });
      else if(!policyName)
        return res.status(200).send({ msg:"Enter policyName", response: false });
      else if(!groupNB)
        return res.status(200).send({ msg:"Enter groupNB", response: false });
      else if(!memberid)
        return res.status(200).send({ msg:"Enter memberid", response: false });
      else{
        const patientExists = await Patient.findOne({email})

        if(patientExists!=null){
            return res.json({response:false,msg:"Patient already exists in you patient list"});
        }
       console.log(doc_id)
       let p =  await Patient.create({
            doc_id,
            FullName,
            birthDate,
            gender,
            address,
            phoneNumber,
            email,
            provider,
            policyName,
            groupNB,
            memberid
        });
        p.save()
        
         res.json({response:true,msg:"Patient added in your list",id:p._id});
      }
    }
    catch(e){
        res.status(500).json({response:false})
    }
});

const getPatients = asyncHandler(async(req,res)=>{
  try
  {
    const patiens = await Patient.find({doc_id:req.query.id})
    res.status(200).json({patiens,response:true})
  }
  catch(e)
  {
    res.json({response:false})
  }
})





module.exports = {
    createPatient,
    getPatients
};
