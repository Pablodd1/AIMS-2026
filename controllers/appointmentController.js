const asyncHandler = require("express-async-handler");
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patients')
const {appMail,appCancel,appUpdate,onComplete} = require('./mailController')
const { sendMessage } = require('../controllers/Twilio/twilio') 

function getOriginalAndReminderDates(originalDateString) {
    // Parse the original date
    const originalDate = new Date(originalDateString);
  
    // Create a new Date object for the reminder date
    const reminderDate = new Date(originalDate);
  
    // Subtract 1 hour from the reminder date
    reminderDate.setHours(originalDate.getHours() - 1);
  
    // Format the reminder date as needed (optional)
    const formattedReminderDate = reminderDate.toISOString(); // '2024-09-02T04:15:04.000Z'
  
    // Return the original date and the reminder date
    return {
      originalDate: originalDate,
      reminderDate: reminderDate,
      formattedReminderDate: formattedReminderDate
    };
}

function formatDateString(dateString) {
    // Parse the input date string
    const date = new Date(dateString);
  
    // Extract the components of the date
    const dayOfWeek = date.toString().split(' ')[0]; // e.g., "Tue"
    const month = date.toString().split(' ')[1];     // e.g., "Sep"
    const day = date.getDate();                      // e.g., 3
    const year = date.getFullYear();                 // e.g., 2024
    
    // Convert hours to 12-hour format
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0'); // e.g., 00
    const seconds = date.getSeconds().toString().padStart(2, '0'); // e.g., 00
  
    const amOrPm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert '0' hour to '12'
  
    // Format the date string as desired
    const formattedDate = `${dayOfWeek} ${month} ${day.toString().padStart(2, '0')} ${year} ${hours}:${minutes} ${amOrPm}`;
  
    return formattedDate;
}

const createAppointment = asyncHandler(async (req,res)=>{
  
const { patientID , time ,number,clinicname,businessMail,
    appCode,website,address,pic,
    smsChecked,emailChecked
 } = req.body;
    let paienInfo
    let link 
    let msg
 try
 {     
     const isPatientAppointmentAlreadyBooked = await Appointment.findOne({patientID})
     if(isPatientAppointmentAlreadyBooked)
     {
         return res.json({success:false,msg:"Patient appointment is already scheduled. If you want to make new appointment. Please remove previous one"})
     }
 
         paienInfo = await Patient.findOne({_id:patientID})

        if(paienInfo)
        {
            

            await Appointment.create({
                patientID,
                doctorID:req.user,
                email:paienInfo.email,
                name:paienInfo.fullName,
                time,
                reminder:getOriginalAndReminderDates(time).reminderDate
            })
             link = `https://www.aiscribers.com/updatePatient/${patientID}`
            //  msg = `Hi ${paienInfo.fullName}, your appointment is confirmed  ${formatDateString(time)} To make your visit smoother, If you haven't filled out the intake form, please complete it in advance using this link: ${link}. The form supports multiple languages and allows you to use voice-to-text technology to fill it out using your voice. You can complete it from your phone or computer. Address: ${address}. Visit us at ${website}. Call ${number}. If you need to reschedule. To opt-out, reply STOP`
            msg = `Hi ${paienInfo.fullName},\nYour appointment is confirmed for ${formatDateString(time)}.\nTo make your visit smoother, if you haven't filled out the intake form, please complete it in advance using this link: ${link}.\nThe form supports multiple languages and allows you to use voice-to-text technology to fill it out using your voice. You can complete it from your phone or computer.\nAddress: ${address}\nVisit us at: ${website}\nCall: ${number}\n\nIf you need to reschedule.\nTo opt-out, reply STOP.`;
            return res.json({success:true,msg:"Appoinntment scheduled"});
        }else{
            return res.json({success:false,msg:"Facing issues. Please try again later"});
        }
    }catch(e)
    {
        return res.json({success:false,msg:"Facing issues. Please try again later"});
    }finally{
            if(smsChecked)
            {
                sendMessage(msg,paienInfo.phoneNumber)
            }

            if(emailChecked)
            {

        
            if(businessMail=="" || appCode == "")
            {
                    appMail(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,paienInfo.email,formatDateString(time),number,clinicname,paienInfo.fullName,website,address,pic,link)
            }else{
                    appMail(businessMail,appCode,paienInfo.email,formatDateString(time),number,clinicname,paienInfo.fullName,website,address,pic,link)
            }
        }
    }
})

const getbyDateAppointment = asyncHandler(async (req,res)=>{
    try{

        let { date } = req.body
        
        date = date.slice(0,10)
        const query = { status:'Scheduled', time: {
            $regex: `^${date}`
          }};
        const results = await Appointment.find(query)


        return res.json({appointments:results,success:true})

    }catch(e)
    {
        return res.json({success:false,msg:"Failed to fetch appointments"})
    }
})

const delAppointment = asyncHandler(async(req,res)=>{
    const { appId , number , businessMail,
        appCode,website,clinic } = req.body
    let p
    let appResult
   try{
    appResult = await Appointment.findOne({_id:appId})
    p = await Patient.findOne({_id:appResult.patientID})
    await Appointment.deleteOne({_id:appId});
    return res.json({success:true})
   }catch(e){
    return res.json({success:false})
   }finally{
    if(businessMail=="" || appCode == "")
            {
                await appCancel(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,p.email,formatDateString(appResult.time),number,website,clinic,p.fullName)
            }else{
                await appCancel(businessMail,appCode,p.email,formatDateString(appResult.time),number,website,clinic,p.fullName)
            }
   }
})

const editAppTime = asyncHandler(async(req,res)=>{
    const { appId , time , number,businessMail,
        appCode,website,clinic  } = req.body
        let appt;
   try{
     appt = await Appointment.findOne({_id:appId})
    await Appointment.updateOne({_id:appId},{ $set: { createdAt: new Date(time), time } });
    
    return res.json({success:true})
   }catch(e)
   {
    return res.json({success:false})
   }finally{
    if(businessMail=="" || appCode == "")
            {
                await appUpdate(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,appt.email,formatDateString(time),number,website,clinic,appt.name)
            }else{
                await appUpdate(businessMail,appCode,appt.email,formatDateString(time),number,website,clinic,appt.name)
            }
   }
})

const calenderDates = asyncHandler(async(req,res)=>{
    const { status } = req.body
    try{
        console.log(status)
        const appts = await Appointment.find({doctorID:req.body._id,status})
        .select('time') 
        .exec();

        console.log(appts)
        return res.json({response:true,appointments:appts})
    }
    catch(e)
    {
        return res.json({response:false})
    }

})

const changeStatus = asyncHandler(async(req,res)=>{

    const { appId , status } = req.body;
    try{
        await Appointment.updateOne({_id:appId},{status})
        return res.json({response:true})
    }
    catch(e)
    {
        return res.json({response:false})
    }
    finally{
        if(status=="Complete")
        {
            const {businessMail, appCode, clinicName , address , website , number ,pic} = req.body 
            const appt = await Appointment.findOne({_id:appId})
            const paienInfo = await Patient.findOne({_id:appt.patientID})
            // const msg = `Thank you, ${paienInfo.fullName}, for visiting us today! We’d love to hear about your experience.Please leave us a review on Google under ${clinicName}. Address: ${address}.Visit us at ${website}. Call ${number}. To opt-out, reply STOP. `
            const msg = `Thank you, ${paienInfo.fullName}, for visiting us today!\nWe’d love to hear about your experience.\nPlease leave us a review on Google under ${clinicName}.\nAddress: ${address}.\nVisit us at ${website}.\nCall ${number}.\nTo opt-out, reply STOP.`;

            sendMessage(msg,paienInfo.phoneNumber)
            if(businessMail=="" || appCode == "")
            {
                onComplete(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,paienInfo.email,formatDateString(time),number,clinicName,paienInfo.fullName,website,address,pic)
            }else{
                onComplete(businessMail,appCode,paienInfo.email,number,clinicName,paienInfo.fullName,website,address,pic)
            }
        }
    }

})

const filterAppointments = asyncHandler(async (req, res) => {
    try {
        const { name, email, status, time,} = req.body;

        // Create a filter object to build dynamic query conditions
        let filter = { doctorID: req.user };

        // Conditionally add other filters based on input
        if (status) {
            filter.status = status;
        }
        if (name) {
            filter['name'] = { $regex: `^${name}`, $options: 'i' };  // Start of string match for name
        }
        if (email) {
            filter['email'] = { $regex: `^${email}`, $options: 'i' };  // Start of string match for email
        }
        if (time) {
            filter.time = { $regex: `^${time}`, $options: 'i' };
        }

        // Fetch appointments based on the constructed filter
        const appts = await Appointment.find(filter);

        return res.json({ response: true, appointments: appts });
    } catch (e) {
        return res.json({ response: false, error: e.message });
    }
});


module.exports = {
    createAppointment,
    getbyDateAppointment,
    delAppointment,
    editAppTime,
    calenderDates,
    changeStatus,
    filterAppointments
}