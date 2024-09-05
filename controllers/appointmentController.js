const asyncHandler = require("express-async-handler");
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patients')
const {appMail,appCancel,appUpdate} = require('./mailController')

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
  
 const { patientID , time  } = req.body;
 try
 {     
     const isPatientAppointmentAlreadyBooked = await Appointment.findOne({patientID})
     if(isPatientAppointmentAlreadyBooked)
     {
         return res.json({success:false,msg:"Patient appointment is already scheduled. If you want to make new appointment. Please remove previous one"})
    }
 
        const paienInfo = await Patient.findOne({_id:patientID}) 
        console.log(paienInfo)
        if(paienInfo)
        {
            

            await Appointment.create({
                patientID,
                doctorID:req.user,
                email:paienInfo.email,
                name:paienInfo.fullName,
                // time:getOriginalAndReminderDates(time).originalDate,
                // time:formatCreatedAt(time),
                time,
                reminder:getOriginalAndReminderDates(time).reminderDate
            })
            await appMail(paienInfo.email,formatDateString(time))
            return res.json({success:true,msg:"Appoinntment scheduled"});
        }else{
            return res.json({success:false,msg:"Facing issues. Please try again later"});
        }
    }catch(e)
    {
        return res.json({success:false,msg:"Facing issues. Please try again later"});
    }
})

const getbyDateAppointment = asyncHandler(async (req,res)=>{
    try{

        let { date } = req.body
        
        date = date.slice(0,10)
        const query = { time: {
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
    const { appId , number } = req.body
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
    await appCancel(p.email,formatDateString(appResult.time),number)
   }
})

const editAppTime = asyncHandler(async(req,res)=>{
    const { appId , time , number } = req.body
   try{
    let appt = await Appointment.findOne({_id:appId})
    await Appointment.updateOne({_id:appId},{ $set: { createdAt: new Date(time), time } });
    await appUpdate(appt.email,formatDateString(appt.time),formatDateString(time),number)
    return res.json({success:true})
   }catch(e)
   {
    return res.json({success:false})
   }
})

module.exports = {
    createAppointment,
    getbyDateAppointment,
    delAppointment,
    editAppTime
}