const nodemailer = require("nodemailer");
const { appointmentCreated } = require('../Template/Appointments/appointmentcreated');
const { appointmentCancelled } = require('../Template/Appointments/appointmentCancelled');
const { appointmentUpdate } = require('../Template/Appointments/appointmentUpdate');
const { addInstantPatient } = require('../Template/Patients/addInstantPatient')
const appMail = async (userEmail,time) => {
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
      from: "zainyshorts@gmail.com",
      to: userEmail,
      subject: "Appointment",
      html: appointmentCreated(time),
    });

    return true
  } catch (error) {
    return false
  }
}
const appCancel = async (userEmail,time,number) => {
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
      from: "zainyshorts@gmail.com",
      to: userEmail,
      subject: "Appointment",
      html: appointmentCancelled(time,number),
    });

    return true
  } catch (error) {
    return false
  }
}
const appUpdate = async (userEmail,prevt,newt,number) => {
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
      from: "zainyshorts@gmail.com",
      to: userEmail,
      subject: "Appointment",
      html: appointmentUpdate(prevt,newt,number),
    });

    return true
  } catch (error) {
    return false
  }
}
const addPatient = async (userEmail,link) => {
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
      from: "zainyshorts@gmail.com",
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
