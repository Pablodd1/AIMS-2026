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
const { Document, Packer, Paragraph, TextRun } = require("docx");

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


//New openai method direct downloaad not saved patient
// async function createDocxDirect(patientId,userId,reportData) {
//     try {

//         // const [patient,user] = await Promise.all([
//         //    Patient.findOne({_id:patientId}),
//         //    User.findOne({_id:userId})
//         // ])

//         const originFile = fs.readFileSync(path.resolve('public','report-with-patient.docx'), 'binary');
//         const zip = new PizZip(originFile);
//         let doc;
//         // const imageUrl = user.signature; 
//         // if(imageUrl!="")
//         // {
//         //     const imageBuffer = await loadImage(imageUrl); // Load image data
            
//         //     const imageModule = new ImageModule({
//         //         getImage: () => imageBuffer, // Return the loaded image buffer
//         //         getSize: () => [200, 200]
//         //     });
            
//         //     doc = new Docxtemplater(zip, {
//         //         modules: [imageModule]
//         //     });
//         // }else{
//             doc = new Docxtemplater(zip);
//         // }

      
//       doc.setData({
//         // drFullName: user.first_name + ' ' + user.last_name,
//         // signature: imageUrl,
//         // clinicName: user.clinicName || 'N/A',
//         // name: patient.fullName || 'N/A',
//         // age: patient.dateOfBirth || 'N/A',
//         // date: report.date || 'N/A',
//         // time: report.time || 'N/A',
//         report:reportData || 'N/A'
//       });

//         // Render the document
//         doc.render();
//         fs.writeFileSync('example.docx', doc.getZip().generate({ type: 'nodebuffer' }));
//         return {buffer:doc.getZip().generate({ type: 'nodebuffer' }),response:true}
//     } catch (error) {
//         return {response:false}
//     }
// }

// const reportDocxDirectDownload = asyncHandler(async(req,res)=>{
//     try
//     {
//       const { patientId } =  req.query

//         const reportData = `**SOAP Note**

//         **Patient Name:** Elvis Valdez  
//         **Date of Service:** November 15, 2024  
//         **DOB:** [Patient's Date of Birth]  
//         **Gender:** [Patient's Gender]  
//         **Occupation:** Sales Representative
        
//         **Subjective:**
        
//         - **Chief Complaints:**  
//           - Left hip pain  
//           - Left neck pain  
//           - Left lower back pain  
//           - Anxiety and panic attacks  
//           - Left shoulder pain  
//           - Left elbow pain  
//           - Numbness and tingling down the left leg  
//           - Headaches  
//           - Sleep disturbances  
//           - Concentration issues  
//           - Balance problems  
//           - Feeling more depressed  
        
//         - **History of Present Illness:**  
//           Elvis Valdez was involved in a motor vehicle accident on November 4, 2024, after which she started experiencing the above symptoms. The problems are described as constant, occurring 76 to 100% of the time, and are characterized by sharp, tingling, aching, stabbing, and numbness. The pain radiates from the back to the left hip and further down the left leg. She rates her pain as 8 out of 10. The symptoms interfere extremely with her work and social activities. She has not consulted any other healthcare providers for these issues. Aggravating factors include physical activity, sitting, and daily routines. Relief is found with rest, medication, heat, and cold. Her primary concern is the seriousness of the condition and its impact on her daily life and enjoyment.
        
//         - **Social History:**  
//           Has a high school diploma. Occupation as a sales representative. Reports that the pain and associated symptoms are significantly interfering with work, household chores, exercise, and social activities.
        
//         - **Health Perception:**  
//           Considers her overall health to be fair.
        
//         **Objective:**
        
//         - **Vital Signs:** [To be filled during the examination]
        
//         - **Physical Examination:**  
//           - **Musculoskeletal:** Tenderness and reduced range of motion noted in the left hip, neck, lower back, shoulder, and elbow.  
//           - **Neurological:** Reports of numbness and tingling down the left leg. Balance issues noted.  
//           - **Psychological:** Appears anxious with signs of depressive symptoms.  
        
//         - **Other Observations:** [To be filled during the examination]
        
//         **Assessment:**
        
//         1. Musculoskeletal pain post motor vehicle accident  
//         2. Anxiety and panic attacks  
//         3. Sleep and concentration disturbances  
//         4. Possible radiculopathy due to numbness and tingling  
//         5. Depressive symptoms potentially secondary to chronic pain and functional limitations
        
//         **Plan:**
        
//         1. **Diagnostic Tests:**  
//            - Consider MRI or X-ray of the affected areas (neck, hip, lower back) to assess any structural damage or nerve involvement.  
//            - Neurological evaluation to assess the extent of radiculopathy.  
        
//         2. **Medications:**  
//            - Pain management with NSAIDs or other prescribed analgesics.  
//            - Consider muscle relaxants if muscle spasms are present.  
//            - Evaluate the need for antidepressants or anxiolytics.  
        
//         3. **Physical Therapy:**  
//            - Referral to physical therapy for rehabilitation and strengthening exercises.  
        
//         4. **Psychological Support:**  
//            - Referral to a mental health professional for evaluation and management of anxiety and depression.  
        
//         5. **Lifestyle Modifications:**  
//            - Encourage rest and modifications in daily activities to prevent symptom exacerbation.  
//            - Discuss ergonomic adjustments at work to reduce strain.  
        
//         6. **Follow-Up:**  
//            - Schedule follow-up appointment in 2 weeks to assess progress and response to treatment.  
        
//         **Additional Notes:**  
//         Patient education on the importance of adhering to the treatment plan and lifestyle modifications to improve symptoms. Discuss the potential long-term management of chronic pain.  
        
//         ---
        
//         **Provider's Signature:**  
//         [Provider's Name]  
//         [Provider's Contact Information]  
//         [Date]`
//         console.log(patientId)
//       const data = await createDocxDirect(patientId,req.user,reportData)
    
//     if(data.response == true)
//     {
//         res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
//         return res.send(data.buffer) 
//     }else{
//         return res.send('File corrupt')
//     }
    
//     }
//     catch(e)
//     {
//       return res.json({response:false})
//     }
// })




// ---direct report  

// Preprocess the response to remove asterisks


// Function to parse unstructured response
function parseResponse(response) {
    const lines = response.split("\n"); // Split by newlines
    const parsedData = [];
    let currentSection = null;

    lines.forEach((line) => {
        line = line.trim();
        if (line.endsWith(":")) {
            // Section header
            currentSection = line;
            parsedData.push({ type: "header", text: currentSection });
        } else if (line.startsWith("-")) {
            // List item
            parsedData.push({ type: "list", text: line.replace(/^-/, "").trim() });
        } else if (line) {
            // Regular text
            parsedData.push({ type: "text", text: line });
        }
    });

    return parsedData;
}

// Function to generate DOCX
async function generateDOCX(parsedData) {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: parsedData.map((item) => {
                    if (item.type === "header") {
                        return new Paragraph({
                            children: [new TextRun({ text: item.text, bold: true, size: 24 })],
                            spacing: { after: 200 },
                        });
                    } else if (item.type === "list") {
                        return new Paragraph({
                            text: item.text,
                            bullet: { level: 0 },
                            spacing: { after: 100 },
                        });
                    } else if (item.type === "text") {
                        return new Paragraph({
                            children: [new TextRun({ text: item.text })],
                            spacing: { after: 100 },
                        });
                    }
                }),
            },
        ],
    });

    // Save the DOCX file
    return await Packer.toBuffer(doc);
    // const buffer = await Packer.toBuffer(doc);
    // fs.writeFileSync("Formatted_SOAP_Note.docx", buffer);
    // console.log("DOCX file generated successfully!");
}

const reportDocxDirectDownload = asyncHandler(async(req,res)=>{

    try {
        const { unstructuredResponse } = req.body
        const cleanedResponse = unstructuredResponse.replace(/\*\*/g, "");

        const parsedData = parseResponse(cleanedResponse);
        const docBuffer = await generateDOCX(parsedData);

        // Set headers for file download
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", "attachment; filename=Formatted_SOAP_Note.docx");

        // Send the file buffer
        res.send(docBuffer);
    } catch (error) {
        console.error("Error generating DOCX:", error);
        res.status(500).send("Error generating DOCX file.");
    }
})

module.exports = {
    reportDocx,
    reportPdf,
    createQuickDocx,
    reportDocxDirectDownload
};