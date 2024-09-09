const nodemailer = require("nodemailer");
const { appointmentCreated } = require('../Template/Appointments/appointmentcreated');
const { appointmentCancelled } = require('../Template/Appointments/appointmentCancelled');
const { appointmentUpdate } = require('../Template/Appointments/appointmentUpdate');
const { addInstantPatient } = require('../Template/Patients/addInstantPatient')

const appMail = async (businessMail,appCode,userEmail,time,phone_number,clinicname,patient) => {
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
      subject: "Appointment",
      html: appointmentCreated(time,phone_number,clinicname,patient),
    });

    return true
  } catch (error) {
    return false
  }
}
const appCancel = async (businessMail,appCode,userEmail,time,number) => {
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
      subject: "Appointment",
      html: appointmentCancelled(time,number),
    });

    return true
  } catch (error) {
    return false
  }
}
const appUpdate = async (businessMail,appCode,userEmail,prevt,newt,number) => {
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
      subject: "Appointment",
      html: appointmentUpdate(prevt,newt,number),
    });

    return true
  } catch (error) {
    return false
  }
}
const addPatient = async (businessMail,appCode,userEmail,link) => {
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
      subject: "Appointment",
      html: addInstantPatient(link),
    });

    return true
  } catch (error) {
    return false
  }
}

module.exports = {
    appMail,
    appCancel,
    appUpdate,
    addPatient
};
