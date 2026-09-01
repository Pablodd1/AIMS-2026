const asyncHandler = require("express-async-handler");
const Appointment = require('../models/Appointment')
const Patient = require('../models/Patients')
const User = require('../models/User')
const {appMail,appCancel,appUpdate,onComplete} = require('./mailController')
const { sendMessage } = require('../controllers/Twilio/twilio'); 
const { getTodayDateInTimeZone } = require('../Helper/getLocalDates');


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
function userInpuDateintoReadableFormat(dateTime,userTimeZone)
{
    const formattedDate = new Date(dateTime).toLocaleString('en-US', {
        timeZone: userTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      
      // Modify the output to match the format YYYY-MM-DD HH:MM AM/PM
      const [date, time] = formattedDate.split(', ');
      const [month, day, year] = date.split('/');
      return `${year}-${month}-${day} ${time}`;
}
const createAppointment = asyncHandler(async (req,res)=>{
  
let { patientID , time ,number,clinicname,businessMail,
        appCode,website,address,pic,
        smsChecked,emailChecked,userTimezone
 } = req.body;
    let patientInfo
    let link 
    let msg =""
    let newAppointment 
 try
 {  
    
        patientInfo = await Patient.findOne({_id:patientID})
        if(patientInfo)
        {
            if(!patientInfo.email){
                emailChecked = false;
            }

            if(!patientInfo.phoneNumber){
                smsChecked   = false; 
            }

            // Duplicate guard: check if appointment already exists for this patient today
            const todayPrefix = time ? time.toString().slice(0, 10) : new Date().toISOString().slice(0, 10);
            const existingToday = await Appointment.findOne({
                patientID,
                doctorID: req.user,
                time: { $regex: `^${todayPrefix}`, $options: 'i' }
            });
            if(existingToday){
                return res.json({success:true, msg:"Appointment already exists for today", appointment: existingToday});
            }
        
            newAppointment =  await Appointment.create({
                patientID,
                doctorID:req.user,
                email:patientInfo.email || 'N/A',
                name:patientInfo.fullName,
                reminder:getOriginalAndReminderDates(time).reminderDate,
                time:userInpuDateintoReadableFormat(time,userTimezone),
                userTimezone
            })

            const doctorDetails = await User.findOne({_id:req.user})
            link = `https://www.aiscribers.com/updatePatient/${patientID}`
            if(doctorDetails.email === "kmcneal@awclinics.com"){
                link = `https://www.aiscribers.com/americare`
            }

             const confirmLink = `https://www.aiscribers.com/AppointmentConfirmation/${newAppointment._id}`
            if(clinicname == "Icare" || clinicname == "icare" || clinicname == "Icare Mobile Medicine")
            {
                 msg = `Hi ${patientInfo.fullName},\n\nYour appointment is confirmed for ${newAppointment.time}.\n\nPlease complete the intake form ahead of time using this link: ${link}.\n\nThe form is voice-to-text enabled and works on both your phone and computer.\n\nCall us at ${number} if you need to reschedule.\n\nAddress: ${address}\nVisit us at: ${website}\nTo opt out, reply STOP.\nConfirm your appointment using this -> link\n${confirmLink} `;

            }else{
                 msg = `Hi ${patientInfo.fullName},\nYour appointment is confirmed for ${newAppointment.time}.\nTo make your visit smoother, if you haven't filled out the intake form, please complete it in advance using this link: ${link}.\nThe form supports multiple languages and allows you to use voice-to-text technology to fill it out using your voice. You can complete it from your phone or computer.\nAddress: ${address}\nVisit us at: ${website}\nCall: ${number}\n\nIf you need to reschedule.\nTo opt-out, reply STOP.\nConfirm your appointment using this -> link\n${confirmLink}`;
            }
            return res.json({success:true,msg:"Appointment scheduled"});
        }else{
            return res.json({success:false,msg:"Facing issues. Please try again later"});
        }
    }catch(e)
    {
        return res.json({success:false,msg:"Facing issues. Please try again later"});
    }finally{
            if(smsChecked)
            {
                sendMessage(msg,patientInfo.phoneNumber)
            }

            if(emailChecked)
            {

        
            if(businessMail=="" || appCode == "")
            {
                    appMail(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,patientInfo.email,newAppointment.time,number,clinicname,patientInfo.fullName,website,address,pic,link,newAppointment._id)
            }else{
                    appMail(businessMail,appCode,patientInfo.email,newAppointment.time,number,clinicname,patientInfo.fullName,website,address,pic,link,newAppointment._id)
            }
        }
    }
})
const getbyDateAppointment = asyncHandler(async (req,res)=>{
    try{

        let { date } = req.body
        
        date = date.slice(0,10)
        const status = ['Scheduled','Pending','Complete']; 
        const query = {
            doctorID:req.user,
            status: { $in: status }, // Correctly using $in for the status field
            time: { $regex: `^${date}`, $options: 'i' } // Regex to match the start of the time string (case-insensitive)
          };
        const results = await Appointment.find(query)


        return res.json({appointments:results,success:true})

    }catch(e)
    {
        return res.json({success:false,msg:"Failed to fetch appointments"})
    }
})
const delAppointment = asyncHandler(async(req,res)=>{
    const { appId } = req.body
   try{
    await Appointment.deleteOne({_id:appId});
    return res.json({success:true})
   }catch(e){
    return res.json({success:false})
   }
})

const editAppTime = asyncHandler(async(req,res)=>{
    const { appId , time , number,businessMail,userTimezone,
        appCode,website,clinic,sendMail  } = req.body
        let appt;
   try{
     appt = await Appointment.findOne({_id:appId})
    await Appointment.updateOne({_id:appId},{ $set: { createdAt: new Date(time), time, reminder: getOriginalAndReminderDates(time).reminderDate } });
    
    return res.json({success:true})
   }catch(e)
   {
    return res.json({success:false})
   }finally{
    // Always notify patient of schedule change
    if (appt && appt.patientID) {
        const patientInfo = await Patient.findOne({_id: appt.patientID}).select('email phoneNumber fullName');
        const formattedTime = userInpuDateintoReadableFormat(time, userTimezone);
        const clinicName = clinic || 'the clinic';
        
        // Send email notification
        const emailTo = appt.email || patientInfo?.email;
        if (emailTo && sendMail) {
            if(businessMail == "" || appCode == "") {
                await appUpdate(process.env.NODE_MAILER_USER, process.env.NODE_MAILER_PASS, emailTo, formattedTime, number, website, clinicName, appt.name);
            } else {
                await appUpdate(businessMail, appCode, emailTo, formattedTime, number, website, clinicName, appt.name);
            }
        }
        
        // Send SMS notification
        const phoneTo = appt.number || patientInfo?.phoneNumber;
        if (phoneTo) {
            const msg = `Your appointment at ${clinicName} has been rescheduled to ${formattedTime}. Please call ${number || 'the office'} if you have questions. Reply STOP to opt out.`;
            await sendMessage(msg, phoneTo);
        }
    }
   }
})

const calenderDates = asyncHandler(async(req,res)=>{
    const { _id} = req.body
    try{
        const status = ['Scheduled','Pending']; 
        const appts = await Appointment.find({
            doctorID: _id,
            status: { $in: status } 
        })
        .select('time name status') // Select fields for individual event display
        .exec();


        // console.log(appts) 
        return res.json({response:true,appointments:appts})
    }
    catch(e)
    {
        return res.json({response:false})
    }

})

const changeStatus = asyncHandler(async(req,res)=>{

    const { appId , status ,sendMsg , sendMail } = req.body;
    try{
        await Appointment.updateOne({_id:appId},{status})
        
        // Increment patient visit count when appointment is completed
        if (status === "Complete") {
            const appt = await Appointment.findOne({_id: appId});
            if (appt && appt.patientID) {
                await Patient.updateOne({ _id: appt.patientID }, { $inc: { visitCount: 1 } });
            }
        }
        
        return res.json({response:true})
    }
    catch(e)
    {
        return res.json({response:false})
    }
    finally{
        if(status=="Complete" && sendMsg  || sendMail)
        {
            const {businessMail, appCode, clinicName , address , website , number ,pic} = req.body 
            const appt = await Appointment.findOne({_id:appId})
            const patientInfo = await Patient.findOne({_id:appt.patientID})
            
            // const msg = `Thank you, ${paienInfo.fullName}, for visiting us today! We’d love to hear about your experience.Please leave us a review on Google under ${clinicName}. Address: ${address}.Visit us at ${website}. Call ${number}. To opt-out, reply STOP. `
            if(sendMsg){

                let msg =""
                if(clinicName == "Icare" || clinicName == "icare" || clinicName == "Icare Mobile Medicine")
                {
                    msg = `Thank you, ${patientInfo.fullName}, for visiting ${clinicName}!\n\nWe’d love to hear your feedback.\n\nPlease leave us a review on Google under "${clinicName}".\n\nCall ${number} for any follow-ups.\n\nAddress: ${address}\nVisit us at: ${website}\nTo opt out, reply STOP.`;

                }else{

                    msg = `Thank you, ${patientInfo.fullName}, for visiting us today!\nWe’d love to hear about your experience.\nPlease leave us a review on Google under ${clinicName}.\nAddress: ${address}.\nVisit us at ${website}.\nCall ${number}.\nTo opt-out, reply STOP.`;
                }

                sendMessage(msg,patientInfo.phoneNumber)
            }

            if(sendMail)
            {
                if(businessMail=="" || appCode == "")
                {
                    onComplete(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,patientInfo.email,number,clinicName,patientInfo.fullName,website,address,pic)
                }else{
                    onComplete(businessMail,appCode,patientInfo.email,number,clinicName,patientInfo.fullName,website,address,pic)
                }
            }

        }
        else if(status=="Cancelled" &&  sendMail){
            const {businessMail, appCode, clinicName  , website , number } = req.body 
            const appt = await Appointment.findOne({_id:appId})
            const patientInfo = await Patient.findOne({_id:appt.patientID})
            if(businessMail=="" || appCode == "")
            {
                await appCancel(process.env.NODE_MAILER_USER,process.env.NODE_MAILER_PASS,patientInfo.email,formatDateString(appt.time),number,website,clinicName,patientInfo.fullName)
            }else{
                await appCancel(businessMail,appCode,patientInfo.email,formatDateString(appt.time),number,website,clinicName,patientInfo.fullName)
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
        if (status && status!='All') {
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
        const appts = await Appointment.find(filter).sort({ createdAt: -1 }).limit(10);

        return res.json({ response: true, appointments: appts });
    } catch (e) {
        return res.json({ response: false, error: e.message });
    }
});

const userResponseFromEmail = asyncHandler(async (req,res)=>{
    try{
        // console.log(req.method)
    if(req.method=='GET')
    {
            const { appId } = req.query
            const isDoneConfirmation = await Appointment.findOne({_id:appId,status:"Pending"})
            if(isDoneConfirmation) {
                return res.send(true)
            }
            else{
                return res.send(false)
            } 
            
    }else{

            const { appId ,  status } = req.body
            await Appointment.updateOne({_id:appId},{status})
            return res.send(true)
            
        
    }
    }catch(e){
        // console.log('user request failed')
        return res.send(false)
    }

})

const appointmentReport = asyncHandler(async (req, res) => {
    let report;
    try {
      const [Scheduled, Cancelled, Complete, Pending] = await Promise.all([
        Appointment.find({ doctorID: req.user, status: 'Scheduled' }).countDocuments(),
        Appointment.find({ doctorID: req.user, status: 'Cancelled' }).countDocuments(),
        Appointment.find({ doctorID: req.user, status: 'Complete' }).countDocuments(),
        Appointment.find({ doctorID: req.user, status: 'Pending' }).countDocuments()
      ]);
  
      console.log(Scheduled, Cancelled, Complete, Pending);
      
      const All = Scheduled + Cancelled + Complete + Pending;
      report = { Scheduled, Cancelled, Complete, Pending, All };
      return res.json({ response: true, report });
    } catch (e) {
      report = { Scheduled: 0, Cancelled: 0, Complete: 0, Pending: 0, All: 0 };
      return res.json({ response: false, report });
    }
});

const allAppointments = asyncHandler(async(req,res)=>{
    let appointments = []
    try {
        const { status , userTimeZone } = req.query
        // Admins see ALL appointments; doctors see only their own
        const User = require('../models/User');
        const caller = await User.findById(req.user).select('admin').lean();
        const apptQuery = caller && caller.admin ? {} : { doctorID: req.user };
        if(status == 'All')
        {
            appointments = await Appointment.find(apptQuery).sort({ createdAt: -1 }).select('status email name time')
        }else if(status == 'Today') {

            appointments = await Appointment.find({...apptQuery, time: { $regex: `^${getTodayDateInTimeZone(userTimeZone)}` } // Match 'time' field starting with YYYY-MM-DD
              }).sort({ createdAt: -1 }).select('status email name time');
        }else{
             appointments = await Appointment.find({...apptQuery, status:status}).sort({ createdAt: -1 }).select('status email name time')

        }
        return res.json({ response: true, appointments });
      } catch (e) {
        return res.json({ response: false, appointments });
      }
})



  



module.exports = {
    createAppointment,
    getbyDateAppointment,
    delAppointment,
    editAppTime,
    calenderDates,
    changeStatus,
    filterAppointments,
    userResponseFromEmail,
    appointmentReport,
    allAppointments
    
}