const nodemailer = require("nodemailer");
const { appointmentCreated } = require('../Template/Appointments/appointmentcreated');
const { appointmentCancelled } = require('../Template/Appointments/appointmentCancelled');
const { appointmentUpdate } = require('../Template/Appointments/appointmentUpdate');
const { addInstantPatient } = require('../Template/Patients/addInstantPatient')

const appMail = async (businessMail,appCode,userEmail,time,phone_number,clinicname,patient,website,address,pic) => {
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
      subject: `Welcome to ${clinicname}`,
      html: appointmentCreated(time,phone_number,clinicname,patient,website,address,pic),
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
const addPatient = async (businessMail,appCode,userEmail,link,name,number,clinic,website) => {
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
      html: addInstantPatient(link,name,number,clinic,website),
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
