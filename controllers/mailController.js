const nodemailer = require("nodemailer");
const QRCode = require('qrcode');
const { appointmentCreated } = require('../Template/Appointments/appointmentcreated');
const { appointmentCancelled } = require('../Template/Appointments/appointmentCancelled');
const { appointmentUpdate } = require('../Template/Appointments/appointmentUpdate');
const { addInstantPatient , addInstantPatientICare } = require('../Template/Patients/addInstantPatient')
const { appointmentComplete} = require('../Template/Appointments/appoitmentComplete');
const { innovativeGoogleReviewUrl } = require("../constants/global");
const fs = require('fs')

const appMail = async (businessMail,appCode,userEmail,time,phone_number,clinicname,patient,website,address,pic,link,apptID) => {
  try {
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    const confirmLink = `https://www.aiscribers.com/AppointmentConfirmation/${apptID}`
      await transporter.sendMail({
        from: businessMail,
        to: userEmail,
        subject: `Your Appointment is Confirmed`,
        html: appointmentCreated(time,phone_number,clinicname,patient,website,address,pic,link,confirmLink),
      });
    

    return true
  } catch (error) {
    return false
  }
}
const appCancel = async (businessMail,appCode,userEmail,time,number,website,clinic,name) => {
  try {
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Appointment Cancellation`,
      html: appointmentCancelled(time,number,website,clinic,name),
    });

    return true
  } catch (error) {
    return false
  }
}
const appUpdate = async (businessMail,appCode,userEmail,newt,number,website,clinic,name) => {
  try {
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Appointment Time`,
      html: appointmentUpdate(newt,number,website,clinic,name),
    });

    return true
  } catch (error) {
    return false
  }
}
const addPatient = async (businessMail,appCode,userEmail,link,name,number,clinic,website,address,clinicNumber) => {
  try {
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    
    if(clinic == "Icare" || clinic == "icare" || clinic == "Icare Mobile Medicine")
    {
      await transporter.sendMail({
        from: businessMail,
        to: userEmail,
        subject: `Welcome to ${clinic}`,
        html: addInstantPatientICare(link,name,clinic,number,website,address,clinicNumber),
      });

    }else
    {
      await transporter.sendMail({
        from: businessMail,
        to: userEmail,
        subject: `Welcome to ${clinic}`,
        html: addInstantPatient(link,name,number,clinic,website,address,clinicNumber),
      });
    }

    return true
  } catch (error) {
    return false
  }
}
const onComplete = async (businessMail,appCode,userEmail,number, clinicname, patientName, website, address, pic) => {
  try {
    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    let googleUrl = ""
    if(businessMail == "drjeffreydraesel@gmail.com")
    {
      googleUrl = innovativeGoogleReviewUrl
    }
    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Thank you for Visiting  ${clinicname}`,
      html: appointmentComplete(number, clinicname, patientName, website, address, pic, googleUrl),
    });

    return true
  } catch (error) {
    return false
  }
}
const sendQrCodeToPatient = async (businessMail, appCode, link, userEmail) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(link);

    // Convert the Data URL to a buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const transporter = nodemailer.createTransport({
      port: 465,
      host: "smtp.gmail.com",
      service: "Gmail",
      auth: {
        user: businessMail,
        pass: appCode,
      },
      secure: true,
    });

    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Your QR Code`,
      html: `<h1>Your QR Code</h1><p>Here is your QR Code:</p><img src="cid:qrcode" alt="QR Code" />`,
      attachments: [
        {
          filename: 'qrcode.png',
          content: imageBuffer,
          cid: 'qrcode', // same as the cid in the <img> tag
        },
      ],
    });

    console.log('QR code sent successfully to:', userEmail);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// const sendPatientDocumentToDoctor = async (documentPath,docterMail) => {


//     const transporter = nodemailer.createTransport({
//       port: 465,
//       host: "smtp.gmail.com",
//       service: "Gmail",
//       auth: {
//         user: process.env.NODE_MAILER_USER,
//         pass: process.env.NODE_MAILER_PASS,
//       },
//       secure: true,
//     })

//     await transporter.sendMail({
//       from: process.env.NODE_MAILER_USER,
//       to: docterMail,
//       subject: `Patient VoiceIntake Document`,
//       text: "Attached is the requested patient document.",
//       attachments: [
//         {
//             filename: "patient_document.docx",
//             path: documentPath
//         }
//     ]
//     }).then((result)=>{
//       fs.unlinkSync(documentPath);
//       console.log('result',result)
//       return true;
//     }).catch((e)=>{
//       fs.unlinkSync(documentPath);
//       console.log('error',e)
//       return false;
//     })

  
// };


const sendPatientDocumentToDoctor = async (buffer, doctorMail) => {
    try {
        const transporter = nodemailer.createTransport({
            port: 465,
            host: "smtp.gmail.com",
            service: "Gmail",
            auth: {
                user: process.env.NODE_MAILER_USER,
                pass: process.env.NODE_MAILER_PASS,
            },
            secure: true,
        });

        await transporter.sendMail({
            from: process.env.NODE_MAILER_USER,
            to: doctorMail,
            subject: `Patient VoiceIntake Document`,
            text: "Attached is the requested patient document.",
            attachments: [
                {
                    filename: "patient_document.docx",
                    content: buffer
                }
            ]
        });

        console.log('Email sent');
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};





module.exports = {
    appMail,
    appCancel,
    appUpdate,
    addPatient,
    onComplete,
    sendQrCodeToPatient,
    sendPatientDocumentToDoctor
};
