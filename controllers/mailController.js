const nodemailer = require("nodemailer");
const QRCode = require('qrcode');
const { appointmentCreated } = require('../Template/Appointments/appointmentcreated');
const { appointmentCancelled } = require('../Template/Appointments/appointmentCancelled');
const { appointmentUpdate } = require('../Template/Appointments/appointmentUpdate');
const { addInstantPatient } = require('../Template/Patients/addInstantPatient')
const { appointmentComplete} = require('../Template/Appointments/appoitmentComplete')

const appMail = async (businessMail,appCode,userEmail,time,phone_number,clinicname,patient,website,address,pic,link) => {
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
      subject: `Your Appointment is Confirmed`,
      html: appointmentCreated(time,phone_number,clinicname,patient,website,address,pic,link),
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
      subject: `Welcome to ${clinic}`,
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
      subject: `Welcome to ${clinic}`,
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

    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Welcome to ${clinic}`,
      html: addInstantPatient(link,name,number,clinic,website,address,clinicNumber),
    });

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

    await transporter.sendMail({
      from: businessMail,
      to: userEmail,
      subject: `Thank you for Visiting  ${clinicname}`,
      html: appointmentComplete(number, clinicname, patientName, website, address, pic),
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




module.exports = {
    appMail,
    appCancel,
    appUpdate,
    addPatient,
    onComplete,
    sendQrCodeToPatient
};
