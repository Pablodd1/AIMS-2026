const asyncHandler = require("express-async-handler");
const Visit = require('../../models/Visit')
const User = require('../../models/User')
const Patient = require("../../models/Patients");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const puppeteer = require('puppeteer');
const mammoth = require('mammoth');
const { getTodayDateInTimeZone, getCurrentDateGlobally, getCurrentTimeGlobally } = require("../../Helper/getLocalDates");
const { ConversationsMessageFileImageInfo } = require("sib-api-v3-sdk");


async function loadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
}
async function createDocx(visitId,userId) {
    try {
        const [report,user] = await Promise.all([
           Visit.findOne({_id:visitId}),
           User.findOne({_id:userId})
        ])
        const patient = await Patient.findOne({_id:report.pId})

        const originFile = fs.readFileSync(path.resolve('public','template.docx'), 'binary');
        const zip = new PizZip(originFile);
        let doc;
        // Fetch the image data before setting it in the template
        const imageUrl = user.signature; // Replace with your image URL
        if(imageUrl!="")
        {
            const imageBuffer = await loadImage(imageUrl); // Load image data
            
            const imageModule = new ImageModule({
                // centered: true,
                getImage: () => imageBuffer, // Return the loaded image buffer
                getSize: () => [200, 200]
            });
            
            doc = new Docxtemplater(zip, {
                modules: [imageModule]
            });
        }else{
            doc = new Docxtemplater(zip);
        }


        const formatCodes = (codes) =>
        codes.map((item) => ({
          code: `${item['code']} ${item['description']} `
        }));

        let ROS = JSON.parse(report.ROS)
      
      doc.setData({
        drFullName: user.first_name + ' ' + user.last_name,
        signature: imageUrl,
        clinicName: user.clinicName || 'N/A',
        name: patient.fullName || 'N/A',
        age: patient.dateOfBirth || 'N/A',
        date: report.date || 'N/A',
        time: report.time || 'N/A',
        phone: patient.phoneNumber || 'N/A',
        soapNotesSummary: report.soapNotesSummary || 'N/A',
        assessment: report.Assessment || 'N/A',
        plan: report.Plan || 'N/A',
        Allergy: report.Allergy || 'N/A',
        HPI: report.HPI || 'N/A',
        PMH: report.PMH || 'N/A',
        subjective: report.subjective || 'N/A',
        objective: report.objective || 'N/A',
        chiefComplaint: report.chiefComplaint || 'N/A',
        physicalExamination: report.physicalExamination || 'N/A',
        cptCodes: formatCodes(report.cptCodes) || 'N/A',
        ictCodes: formatCodes(report.icdCodes) || 'N/A',
        medication: report.med || 'N/A',
        Constitutional: ROS['Constitutional'] || 'N/A',
        Eyes: ROS['Eyes'] || 'N/A',
        ENT: ROS['ENT'] || 'N/A',
        Cardiovascular: ROS['Cardiovascular'] || 'N/A',
        Respiratory: ROS['Respiratory'] || 'N/A',
        Gastrointestinal: ROS['Gastrointestinal'] || 'N/A',
        Genitourinary: ROS['Genitourinary'] || 'N/A',
        Musculoskeletal: ROS['Musculoskeletal'] || 'N/A',
        Skin: ROS['Skin'] || 'N/A',
        Neurological: ROS['Neurological'] || 'N/A',
        Psychiatric: ROS['Psychiatric'] || 'N/A'

      });

        // Render the document
        doc.render();

        return {buffer:doc.getZip().generate({ type: 'nodebuffer' }),response:true}
    } catch (error) {
        return {response:false}
    }
}
const reportDocx = asyncHandler(async(req,res)=>{
    try
    {
      const { visitId } =  req.query

      const data = await createDocx(visitId,req.user)

    if(data.response == true)
    {
        res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        return res.send(data.buffer) 
    }else{
        return res.send('File corrupt')
    }
    
    }
    catch(e)
    {
      return res.json({response:false})
    }
})
async function createDocxToPdf(visitId, userId) {
    try {
        const [report, user] = await Promise.all([
            Visit.findOne({ _id: visitId }),
            User.findOne({ _id: userId })
        ]);
        const patient = await Patient.findOne({ _id: report.pId });

        const originFile = fs.readFileSync(path.resolve('public', 'template.docx'), 'binary');
        const zip = new PizZip(originFile);
        let doc;
        const imageUrl = user.signature;

        if (imageUrl != "") {
            const imageBuffer = await loadImage(imageUrl);
            const imageModule = new ImageModule({
                getImage: () => imageBuffer,
                getSize: () => [100, 100]
            });

            doc = new Docxtemplater(zip, { modules: [imageModule] });
        } else {
            doc = new Docxtemplater(zip);
        }

        const formatCodes = (codes) =>
            codes.map((item) => ({
                code: `${item['code']} ${item['description']} `
            }));

        let ROS = JSON.parse(report.ROS);

        doc.setData({
            drFullName: user.first_name + ' ' + user.last_name,
            signature: imageUrl,
            clinicName: user.clinicName || 'N/A',
            name: patient.fullName || 'N/A',
            age: patient.dateOfBirth || 'N/A',
            date: report.date || 'N/A',
            time: report.time || 'N/A',
            phone: patient.phoneNumber || 'N/A',
            soapNotesSummary: report.soapNotesSummary || 'N/A',
            assessment: report.Assessment || 'N/A',
            plan: report.Plan || 'N/A',
            Allergy: report.Allergy || 'N/A',
            HPI: report.HPI || 'N/A',
            PMH: report.PMH || 'N/A',
            subjective: report.subjective || 'N/A',
            objective: report.objective || 'N/A',
            chiefComplaint: report.chiefComplaint || 'N/A',
            physicalExamination: report.physicalExamination || 'N/A',
            cptCodes: formatCodes(report.cptCodes) || 'N/A',
            ictCodes: formatCodes(report.icdCodes) || 'N/A',
            medication: report.med || 'N/A',
            Constitutional: ROS['Constitutional'] || 'N/A',
            Eyes: ROS['Eyes'] || 'N/A',
            ENT: ROS['ENT'] || 'N/A',
            Cardiovascular: ROS['Cardiovascular'] || 'N/A',
            Respiratory: ROS['Respiratory'] || 'N/A',
            Gastrointestinal: ROS['Gastrointestinal'] || 'N/A',
            Genitourinary: ROS['Genitourinary'] || 'N/A',
            Musculoskeletal: ROS['Musculoskeletal'] || 'N/A',
            Skin: ROS['Skin'] || 'N/A',
            Neurological: ROS['Neurological'] || 'N/A',
            Psychiatric: ROS['Psychiatric'] || 'N/A'
        });

        doc.render();

        // Await the conversion to HTML
        const result = await mammoth.convertToHtml({ buffer: doc.getZip().generate({ type: 'nodebuffer' }) });
        const html = result.value; // The generated HTML
        const pdfBuffer = await createPdfFromHtml(html);
        return { response: true, pdfBuffer }; // Return the PDF buffer on success

    } catch (error) {
        console.error('Error creating DOCX to PDF:', error);
        return { response: false }; // Return false on error
    }
}
async function createPdfFromHtml(html) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setContent(html);
    const pdfBuffer =  await page.pdf({
        format: 'A4',
        printBackground: true,
    });

    await browser.close();
    return pdfBuffer
}

const reportPdf = asyncHandler(async (req, res) => {
    try {
        const { visitId } = req.query;
        const pdf = await createDocxToPdf(visitId, req.user);
        if (pdf.response) {
            res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdf.pdfBuffer.length);
            res.end(pdf.pdfBuffer); // Send the actual PDF buffer
        } else {
            return res.json({ response: false, message: 'File corrupt' });
        }
    } catch (e) {
        console.error(e);
        return res.json({ response: false });
    }
});

async function createDocxToPdf(visitId, userId) {
    try {
        const [report, user] = await Promise.all([
            Visit.findOne({ _id: visitId }),
            User.findOne({ _id: userId })
        ]);
        const patient = await Patient.findOne({ _id: report.pId });

        const originFile = fs.readFileSync(path.resolve('public', 'template.docx'), 'binary');
        const zip = new PizZip(originFile);
        let doc;
        const imageUrl = user.signature;

        if (imageUrl != "") {
            const imageBuffer = await loadImage(imageUrl);
            const imageModule = new ImageModule({
                getImage: () => imageBuffer,
                getSize: () => [100, 100]
            });

            doc = new Docxtemplater(zip, { modules: [imageModule] });
        } else {
            doc = new Docxtemplater(zip);
        }

        const formatCodes = (codes) =>
            codes.map((item) => ({
                code: `${item['code']} ${item['description']} `
            }));

        let ROS = JSON.parse(report.ROS);

        doc.setData({
            drFullName: user.first_name + ' ' + user.last_name,
            signature: imageUrl,
            clinicName: user.clinicName || 'N/A',
            name: patient.fullName || 'N/A',
            age: patient.dateOfBirth || 'N/A',
            date: report.date || 'N/A',
            time: report.time || 'N/A',
            phone: patient.phoneNumber || 'N/A',
            soapNotesSummary: report.soapNotesSummary || 'N/A',
            assessment: report.Assessment || 'N/A',
            plan: report.Plan || 'N/A',
            Allergy: report.Allergy || 'N/A',
            HPI: report.HPI || 'N/A',
            PMH: report.PMH || 'N/A',
            subjective: report.subjective || 'N/A',
            objective: report.objective || 'N/A',
            chiefComplaint: report.chiefComplaint || 'N/A',
            physicalExamination: report.physicalExamination || 'N/A',
            cptCodes: formatCodes(report.cptCodes) || 'N/A',
            ictCodes: formatCodes(report.icdCodes) || 'N/A',
            medication: report.med || 'N/A',
            Constitutional: ROS['Constitutional'] || 'N/A',
            Eyes: ROS['Eyes'] || 'N/A',
            ENT: ROS['ENT'] || 'N/A',
            Cardiovascular: ROS['Cardiovascular'] || 'N/A',
            Respiratory: ROS['Respiratory'] || 'N/A',
            Gastrointestinal: ROS['Gastrointestinal'] || 'N/A',
            Genitourinary: ROS['Genitourinary'] || 'N/A',
            Musculoskeletal: ROS['Musculoskeletal'] || 'N/A',
            Skin: ROS['Skin'] || 'N/A',
            Neurological: ROS['Neurological'] || 'N/A',
            Psychiatric: ROS['Psychiatric'] || 'N/A'
        });

        doc.render();

        // Await the conversion to HTML
        const result = await mammoth.convertToHtml({ buffer: doc.getZip().generate({ type: 'nodebuffer' }) });
        const html = result.value; // The generated HTML
        const pdfBuffer = await createPdfFromHtml(html);
        return { response: true, pdfBuffer }; // Return the PDF buffer on success

    } catch (error) {
        console.error('Error creating DOCX to PDF:', error);
        return { response: false }; // Return false on error
    }
}

const createQuickDocx = asyncHandler(async(req,res)=>{
    try
    {
        // console.log('hello')
    //   const { soapNotesSummary,assessment,plan,Allergy,HPI,PMH,subjective,objective,chiefComplaint,physicalExamination,cptCodes,icdCodes,med,ROS,userTimezone } = req.body
      const data = await reportQuickDocx(req.user)

    if(data.response == true)
    {
        res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        return res.send(data.buffer) 
    }else{
        return res.send('File corrupt')
    }
    
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

async function reportQuickDocx(userId) {
    try {
        // console.log(drFullName,clinicName,soapNotesSummary,assessment,plan,Allergy,HPI,PMH,subjective,objective,chiefComplaint,physicalExamination,cptCodes,icdCodes,med,ros,userTimezone,userId)
        const user = await User.findOne({_id:userId})
        // console.log(user)
        const originFile = fs.readFileSync(path.resolve('public','quickTemplate.docx'), 'binary');
        const zip = new PizZip(originFile);
        let doc;
        // Fetch the image data before setting it in the template
        const imageUrl = user.signature; // Replace with your image URL
        if(imageUrl!="")
        {

            const imageBuffer = await loadImage(imageUrl); // Load image data
            
            const imageModule = new ImageModule({
                // centered: true,
                getImage: () => imageBuffer, // Return the loaded image buffer
                getSize: () => [200, 200]
            });
            
            doc = new Docxtemplater(zip, {
                modules: [imageModule]
            });
        }else{
            doc = new Docxtemplater(zip);
        }

        
        // const formatCodes = (codes) =>
        // codes.map((item) => ({
        //   code: `${item['code']} ${item['description']} `
        // }));

        // let ROS = JSON.parse(ros)

        // console.log(getCurrentDateGlobally(userTimezone))
      
      doc.setData({
        // drFullName: user.first_name+user.last_name,
        // signature: imageUrl,
        // clinicName: user.clinicName || 'N/A',
        // date: getCurrentDateGlobally(userTimezone) || 'N/A',
        // time: getCurrentTimeGlobally(userTimezone) || 'N/A',
        soapNotesSummary: 'soapNotesSummary' || 'N/A',
        // assessment: assessment || 'N/A',
        // plan: plan || 'N/A',
        // Allergy: Allergy || 'N/A',
        // HPI: HPI || 'N/A',
        // PMH: PMH || 'N/A',
        // subjective: subjective || 'N/A',
        // objective: objective || 'N/A',
        // chiefComplaint: chiefComplaint || 'N/A',
        // physicalExamination: physicalExamination || 'N/A',
        // cptCodes: formatCodes(cptCodes) || 'N/A',
        // ictCodes: formatCodes(icdCodes) || 'N/A',
        // medication: med || 'N/A',
        // Constitutional: ROS['Constitutional'] || 'N/A',
        // Eyes: ROS['Eyes'] || 'N/A',
        // ENT: ROS['ENT'] || 'N/A',
        // Cardiovascular: ROS['Cardiovascular'] || 'N/A',
        // Respiratory: ROS['Respiratory'] || 'N/A',
        // Gastrointestinal: ROS['Gastrointestinal'] || 'N/A',
        // Genitourinary: ROS['Genitourinary'] || 'N/A',
        // Musculoskeletal: ROS['Musculoskeletal'] || 'N/A',
        // Skin: ROS['Skin'] || 'N/A',
        // Neurological: ROS['Neurological'] || 'N/A',
        // Psychiatric: ROS['Psychiatric'] || 'N/A'

      });

        // Render the document
        doc.render();

        return {buffer:doc.getZip().generate({ type: 'nodebuffer' }),response:true}
    } catch (error) {
        return {response:false}
    }
}

module.exports = {
    reportDocx,
    reportPdf,
    createQuickDocx
};