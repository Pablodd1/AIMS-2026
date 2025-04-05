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
const { sendPatientDocumentToDoctor , sendInpectionDocumentToDoctor} = require('../mailController')
const { extractSummary } = require('../openaiController')
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



//Americare Wellness Document
const ameriarePatientDocument = asyncHandler(async (req, res) => {

    const { formData, doctorMail } = req.body

    try {

        const originFile = fs.readFileSync(path.resolve('public','americare.docx'), 'binary');
        const zip = new PizZip(originFile);
        const doc = new Docxtemplater(zip);
        const { summary } = await extractSummary(formData)
        // const summary = "test"
      doc.setData({
        "firstName": formData.firstName || "N/A",
        "middleName": formData.middleName || "N/A",
        "lastName": formData.lastName || "N/A",
        "dob": formData.dob || "N/A",
        "gender": formData.gender || "N/A",
        "homePhone": formData.homePhone || "N/A",
        "mobilePhone": formData.mobilePhone || "N/A",
        "email": formData.email || "N/A",
        "address1": formData.address1 || "N/A",
        "address2": formData.address2 || "N/A",
        "city": formData.city || "N/A",
        "state": formData.state || "N/A",
        "zip": formData.zip || "N/A",
        "preferredContact": formData.preferredContact || "N/A",
        "insuranceProvider": formData.insuranceProvider || "N/A",
        "policyMemberId": formData.policyMemberId || "N/A",
        "groupNumber": formData.groupNumber || "N/A",
        "policyHolderName": formData.policyHolderName || "N/A",
        "policyHolderDob": formData.policyHolderDob || "N/A",
        "primaryCarePhysician": formData.primaryCarePhysician || "N/A",
        "currentMedications": formData.currentMedications || "N/A",
        "allergies": formData.allergies || "N/A",
        "chronicConditions": formData.chronicConditions || "N/A",
        "pastSurgeries": formData.pastSurgeries || "N/A",
        "familyHistory": formData.familyHistory || "N/A",
        "reasonForVisit": formData.reasonForVisit || "N/A",
        "symptomsDetail": formData.symptomsDetail || "N/A",
        "symptomsDuration": formData.symptomsDuration || "N/A",
        "symptomsSeverity": formData.symptomsSeverity || "N/A",
        "experiencedBefore": formData.experiencedBefore || "N/A",
        "symptomsBeforeWhen": formData.symptomsBeforeWhen || "N/A",
        "symptomsAggravators": formData.symptomsAggravators || "N/A",
        "occupation": formData.occupation || "N/A",
        "livingArrangement": formData.livingArrangement || "N/A",
        "tobaccoUse": formData.tobaccoUse || "N/A",
        "alcoholUse": formData.alcoholUse || "N/A",
        "recreationalDrugs": formData.recreationalDrugs || "N/A",
        "weightLossFeverFatigue": formData.weightLossFeverFatigue || "N/A",
        "chestPainPalpitationsLegSwelling": formData.chestPainPalpitationsLegSwelling || "N/A",
        "coughShortnessBreathWheezing": formData.coughShortnessBreathWheezing || "N/A",
        "nauseaVomitingDiarrheaConstipation": formData.nauseaVomitingDiarrheaConstipation || "N/A",
        "jointPainMuscleAchesWeakness": formData.jointPainMuscleAchesWeakness || "N/A",
        "headachesDizzinessNumbness": formData.headachesDizzinessNumbness || "N/A",
        "physicalActivity": formData.physicalActivity || "N/A",
        "nutrition": formData.nutrition || "N/A",
        "seatBeltUse": formData.seatBeltUse || "N/A",
        "depression": formData.depression || "N/A",
        "anxiety": formData.anxiety || "N/A",
        "stress": formData.stress || "N/A",
        "socialEmotionalSupport": formData.socialEmotionalSupport || "N/A",
        "pain": formData.pain || "N/A",
        "generalHealth": formData.generalHealth || "N/A",
        "activitiesOfDailyLiving": formData.activitiesOfDailyLiving || "N/A",
        "sleep": formData.sleep || "N/A",
        "bloodPressure": formData.bloodPressure || "N/A",
        "cholesterol": formData.cholesterol || "N/A",
        "bloodGlucose": formData.bloodGlucose || "N/A",
        "height": formData.height || "N/A",
        "weight": formData.weight || "N/A",
        "waistCircumference": formData.waistCircumference || "N/A",
        "comment": formData.comment || "N/A",
        "summary":summary || "N/A"
    });

        // Render the document
        try {
            doc.render();
        } catch (error) {
            console.error("Template Rendering Error:", error);
        }

         // Generate buffer
         const buffer = Buffer.from(doc.getZip().generate({ type: "nodebuffer" }));


        const result = await sendPatientDocumentToDoctor(buffer, doctorMail)
        if (!result) {
            return res.json({ 
                success: false,
                msg: "Failed to generate the document. Please try again or contact support."
            });
        }

        return res.json({ 
            success: true,
            msg: "The document has been successfully sent to the doctor."
        });
        

    } catch (error) {
        return res.json({ 
            success: false,
            msg: "An error occurred while sending the document. Please check the details and try again."
        });
    }
})



//inspection - apis

async function inspectionCreateDocx(data) {
    try {
        let originFile;
        if(data.type == "inspection"){
            originFile =  fs.readFileSync(path.resolve('public','inspection.docx'), 'binary');
        }else if(data.type == "fluff"){
            originFile =  fs.readFileSync(path.resolve('public','fluff.docx'), 'binary');
        }else{
            originFile =  fs.readFileSync(path.resolve('public','walk.docx'), 'binary');
        }
        const zip = new PizZip(originFile);

        let doc;
        doc = new Docxtemplater(zip);

      
      if(data.type == "inspection")
      {
        console.log(data.inspectionSections[7]['items'])
        // return {response:false}
          doc.setData({
            propertyname: data.inspectionSections[0]['items'][0].value,
            inspectiondate: data.inspectionSections[0]['items'][1].value,
            inspectorname: data.inspectionSections[0]['items'][2].value,
            housekeepername: data.inspectionSections[0]['items'][3].value,

            //1

            internetconnected: data.inspectionSections[2]['items'][0].value,
            tvworking: data.inspectionSections[2]['items'][1].value,
            trashcanschecked: data.inspectionSections[2]['items'][3].value,

            filterdatewritten: data.inspectionSections[3]['items'][0].value,
            filterchanged: data.inspectionSections[3]['items'][1].value,
            filterdatenoted: data.inspectionSections[3]['items'][2].value,
            filterclean: data.inspectionSections[3]['items'][3].value,
            filtergratechecked: data.inspectionSections[3]['items'][4].value,
            scrfilterused: data.inspectionSections[3]['items'][5].value,
            ownerfilterused: data.inspectionSections[3]['items'][6].value,
            ownerneedsfilters: data.inspectionSections[3]['items'][7].value,
            cantreachfilter: data.inspectionSections[3]['items'][8].value,

            ceilingsmoldfree: data.inspectionSections[4]['items'][0].value,
            closetsmoldfree: data.inspectionSections[4]['items'][1].value,
            floorventsmoldfree: data.inspectionSections[4]['items'][2].value,
            ceilingventsmoldfree: data.inspectionSections[4]['items'][3].value,
            furnituremoldfree: data.inspectionSections[4]['items'][4].value,
            wallsmoldfree: data.inspectionSections[4]['items'][5].value,

            thermostatsetting: data.inspectionSections[5]['items'][0].value,
            ownerclosetlocked: data.inspectionSections[5]['items'][1].value,
            ownerclosetreason: data.inspectionSections[5]['items'][2].value,

            damagenoted: data.inspectionSections[6]['items'][0].value,
            stainsnoted: data.inspectionSections[6]['items'][1].value,
            notes: data.inspectionSections[6]['items'][2].value,

            entrycobwebfree: data.inspectionSections[7]['items'][0].value,
            outdoormatclean: data.inspectionSections[7]['items'][1].value,
            stormdoorglassclean: data.inspectionSections[7]['items'][2].value,
            indoormatclean: data.inspectionSections[7]['items'][3].value,
            entrydeckbulbworking: data.inspectionSections[7]['items'][4].value,
            entryblindsdusted: data.inspectionSections[7]['items'][5].value,
            entryblindsworking: data.inspectionSections[7]['items'][6].value,

            sinkcleanorganized: data.inspectionSections[8]['items'][0].value,
            dishsoapfilled: data.inspectionSections[8]['items'][1].value,
            plasticbagsremoved: data.inspectionSections[8]['items'][2].value,
            sinkclean: data.inspectionSections[8]['items'][3].value,
            faucetworking: data.inspectionSections[8]['items'][4].value,
            garbagedisposalworking: data.inspectionSections[8]['items'][5].value,
            fireextinguisherchecked: data.inspectionSections[8]['items'][6].value,
            needsfireextinguisher: data.inspectionSections[8]['items'][7].value,
            dishwasherclean: data.inspectionSections[8]['items'][8].value,
            coffeemakerclean: data.inspectionSections[8]['items'][9].value,
            toasterclean: data.inspectionSections[8]['items'][10].value,
            microwaveclean: data.inspectionSections[8]['items'][11].value,
            stovetopclean: data.inspectionSections[8]['items'][12].value,
            ovenclean: data.inspectionSections[8]['items'][13].value,
            fridgeclean: data.inspectionSections[8]['items'][14].value,
            freezerclean: data.inspectionSections[8]['items'][15].value,
            freezerfloorclean: data.inspectionSections[8]['items'][16].value,
            fridgemagnet: data.inspectionSections[8]['items'][17].value,
            fridgetopclean: data.inspectionSections[8]['items'][18].value,
            trashcanclean: data.inspectionSections[8]['items'][19].value,
            kitchenfloorsclean: data.inspectionSections[8]['items'][20].value,


            diningblindsdusted: data.inspectionSections[9]['items'][0].value,
            diningblindsworking: data.inspectionSections[9]['items'][1].value,
            diningtableclean: data.inspectionSections[9]['items'][2].value,
            diningglasstop: data.inspectionSections[9]['items'][3].value,
            placematsclean: data.inspectionSections[9]['items'][4].value,
            diningchairs: data.inspectionSections[9]['items'][5].value,
            diningfloor: data.inspectionSections[9]['items'][6].value,
            diningbulbs: data.inspectionSections[9]['items'][7].value,
            diningwindowsills: data.inspectionSections[9]['items'][8].value,

            remoteswork: data.inspectionSections[10]['items'][0].value,
            livingwindowsills: data.inspectionSections[10]['items'][1].value,
            tvcablework: data.inspectionSections[10]['items'][2].value,
            olditemsremoved: data.inspectionSections[10]['items'][3].value,
            furnitureclean: data.inspectionSections[10]['items'][4].value,
            underfurnitureclean: data.inspectionSections[10]['items'][5].value,
            sleepersofaclean: data.inspectionSections[10]['items'][6].value,
            tabletops: data.inspectionSections[10]['items'][7].value,
            sofacushions: data.inspectionSections[10]['items'][8].value,
            chaircushions: data.inspectionSections[10]['items'][9].value,
            ceilingfanliving: data.inspectionSections[10]['items'][10].value,
            livingblindsdusted: data.inspectionSections[10]['items'][11].value,
            livingblindsworking: data.inspectionSections[10]['items'][12].value,
            livingfloor: data.inspectionSections[10]['items'][13].value,
            lampsliving: data.inspectionSections[10]['items'][14].value,
            sgdclean: data.inspectionSections[10]['items'][15].value,
            sgdtrack: data.inspectionSections[10]['items'][16].value,

            deckfurniture: data.inspectionSections[11]['items'][0].value,
            deckglasstop: data.inspectionSections[11]['items'][1].value,
            decktrash: data.inspectionSections[11]['items'][2].value,
            deckbulbs: data.inspectionSections[11]['items'][3].value,
            deckdamage: data.inspectionSections[11]['items'][4].value,

            utilityorganized: data.inspectionSections[12]['items'][0].value,
            utilitydustfree: data.inspectionSections[12]['items'][1].value,
            utilitybulbs: data.inspectionSections[12]['items'][2].value,
            utilitydoors: data.inspectionSections[12]['items'][3].value,
            utilityfloor: data.inspectionSections[12]['items'][4].value,
            broomdustpan: data.inspectionSections[12]['items'][5].value,
            ironingboard: data.inspectionSections[12]['items'][6].value,

            vacuumempty: data.inspectionSections[13]['items'][0].value,
            laundryneat: data.inspectionSections[13]['items'][1].value,
            laundrydust: data.inspectionSections[13]['items'][2].value,
            laundryfloor: data.inspectionSections[13]['items'][3].value,
            washerclean: data.inspectionSections[13]['items'][4].value,
            dryerlintclean: data.inspectionSections[13]['items'][5].value,
            lintnorum: data.inspectionSections[13]['items'][6].value,
            modelserial: data.inspectionSections[13]['items'][7].value,

            blanketsclean: data.inspectionSections[14]['items'][0].value,
            hangerscount: data.inspectionSections[14]['items'][1].value,
            pillowsclean: data.inspectionSections[14]['items'][2].value,
            blanketsorganized: data.inspectionSections[14]['items'][3].value,
            closetdoors: data.inspectionSections[14]['items'][4].value,
            closetblindsdusted: data.inspectionSections[14]['items'][5].value,

            bedroomfurniture: data.inspectionSections[15]['items'][0].value,
            lampsbedroom: data.inspectionSections[15]['items'][1].value,
            ceilingfansbedroom: data.inspectionSections[15]['items'][2].value,
            mattresspad: data.inspectionSections[15]['items'][3].value,
            comforter: data.inspectionSections[15]['items'][4].value,
            underbed: data.inspectionSections[15]['items'][5].value,
            drawerschecked: data.inspectionSections[15]['items'][6].value,
            bedroomfloor: data.inspectionSections[15]['items'][7].value,
            bedroomblindsdusted: data.inspectionSections[15]['items'][8].value,
            bedroomwindowsills: data.inspectionSections[15]['items'][9].value,
            bedroomsgd: data.inspectionSections[15]['items'][10].value,
            bedroomtvremotes: data.inspectionSections[15]['items'][11].value,
            bedpillows: data.inspectionSections[15]['items'][12].value,
            bedmade: data.inspectionSections[15]['items'][13].value,
            bedroomblindsworking: data.inspectionSections[15]['items'][14].value,
            bedroombulbs: data.inspectionSections[15]['items'][15].value,

            bathroommirror: data.inspectionSections[16]['items'][0].value,
            bathroomfixtures: data.inspectionSections[16]['items'][1].value,
            toiletclean: data.inspectionSections[16]['items'][2].value,
            toiletring: data.inspectionSections[16]['items'][3].value,
            tubclean: data.inspectionSections[16]['items'][4].value,
            showerliner: data.inspectionSections[16]['items'][5].value,
            bathbulbs: data.inspectionSections[16]['items'][6].value,
            bathblindsdusted: data.inspectionSections[16]['items'][7].value,
            bathmats: data.inspectionSections[16]['items'][8].value,
            bathwindowsills: data.inspectionSections[16]['items'][9].value,
            bathfloor: data.inspectionSections[16]['items'][10].value,
            bathcabinets: data.inspectionSections[16]['items'][11].value,

            garageclean: data.inspectionSections[17]['items'][0].value,
            garagebulbs: data.inspectionSections[17]['items'][1].value,

            exittrashcans: data.inspectionSections[18]['items'][0].value,
            doorslocked: data.inspectionSections[18]['items'][1].value,
            windowslocked: data.inspectionSections[18]['items'][2].value,
            endnote: data.inspectionSections[18]['items'][3].value
                    
    
          });
      }else if(data.type == "fluff"){
        console.log(data.inspectionSections[7]['items'])
        doc.setData({
            propertyname: data.propertyIdentifier,
            inspectiondate: data.inspectionDate,
            inspectorname: data.inspector,
            //1
            alreadycleaned:data.inspectionSections[0]['items'][0].value === "na" ? "N/A" : data.inspectionSections[0]['items'][0].value,
            //2
            thermostatsummer: data.inspectionSections[1]['items'][0].value === "na" ? "N/A" : data.inspectionSections[1]['items'][0].value,
            //3
            filterschecked:data.inspectionSections[2]['items'][0].value === "na" ? "N/A" : data.inspectionSections[2]['items'][0].value,
            scrfilter:data.inspectionSections[2]['items'][1].value === "na" ? "N/A" : data.inspectionSections[2]['items'][1].value,
            ownerfilter:data.inspectionSections[2]['items'][2].value === "na" ? "N/A" : data.inspectionSections[2]['items'][2].value,
            //4
            internettv:data.inspectionSections[3]['items'][0].value === "na" ? "N/A" : data.inspectionSections[3]['items'][0].value,
            hubcheck:data.inspectionSections[3]['items'][1].value === "na" ? "N/A" : data.inspectionSections[3]['items'][1].value,
            //5
            garbagepails:data.inspectionSections[4]['items'][0].value === "na" ? "N/A" : data.inspectionSections[4]['items'][0].value,
            deadbugs:data.inspectionSections[4]['items'][1].value === "na" ? "N/A" : data.inspectionSections[4]['items'][1].value,
            //6
            curtainsopened:data.inspectionSections[5]['items'][0].value === "na" ? "N/A" : data.inspectionSections[5]['items'][0].value,
            moldchecked:data.inspectionSections[5]['items'][1].value === "na" ? "N/A" : data.inspectionSections[5]['items'][1].value,
            glassdoorscleaned:data.inspectionSections[5]['items'][2].value === "na" ? "N/A" : data.inspectionSections[5]['items'][2].value,
            entrychecked:data.inspectionSections[5]['items'][3].value === "na" ? "N/A" : data.inspectionSections[5]['items'][3].value,
            deckscleaned:data.inspectionSections[5]['items'][4].value === "na" ? "N/A" : data.inspectionSections[5]['items'][4].value,
            toiletready:data.inspectionSections[5]['items'][5].value === "na" ? "N/A" : data.inspectionSections[5]['items'][5].value,
            //7 
            icebins:data.inspectionSections[6]['items'][0].value === "na" ? "N/A" : data.inspectionSections[6]['items'][0].value,
            //8
            hotwater:data.inspectionSections[7]['items'][0].value === "na" ? "N/A" : data.inspectionSections[7]['items'][0].value,
            keysreturned:data.inspectionSections[7]['items'][1].value === "na" ? "N/A" : data.inspectionSections[7]['items'][1].value,
          });
      }else{
        console.log(data.inspectionSections[0]['items'])
        doc.setData({
            propertyname: data.propertyName,
            inspectiondate: data.inspectionDate,
            inspectorname: data.inspectorName,
            //1
            alreadycleaned:data.inspectionSections[0]['items'][0].value === "na" ? "N/A" : data.inspectionSections[0]['items'][0].value,
            thermostat: data.inspectionSections[0]['items'][1].value === "na" ? "N/A" : data.inspectionSections[0]['items'][1].value,
            //2
            filterschecked:data.inspectionSections[1]['items'][0].value === "na" ? "N/A" : data.inspectionSections[1]['items'][0].value,
            scrfilter:data.inspectionSections[1]['items'][1].value === "na" ? "N/A" : data.inspectionSections[1]['items'][1].value,
            ownerfilter:data.inspectionSections[1]['items'][2].value === "na" ? "N/A" : data.inspectionSections[1]['items'][2].value,
            //4
            internetandtv:data.inspectionSections[2]['items'][0].value === "na" ? "N/A" : data.inspectionSections[2]['items'][0].value,
            hubplugged:data.inspectionSections[2]['items'][1].value === "na" ? "N/A" : data.inspectionSections[2]['items'][1].value,
            //5
            deadbugschecked:data.inspectionSections[3]['items'][0].value === "na" ? "N/A" : data.inspectionSections[3]['items'][0].value,
            icebinschecked:data.inspectionSections[3]['items'][1].value === "na" ? "N/A" : data.inspectionSections[3]['items'][1].value,
            moldchecked:data.inspectionSections[3]['items'][1].value === "na" ? "N/A" : data.inspectionSections[3]['items'][1].value,
            //6
            toiletchecked:data.inspectionSections[4]['items'][0].value === "na" ? "N/A" : data.inspectionSections[4]['items'][0].value,
            toiletscrubbed:data.inspectionSections[4]['items'][1].value === "na" ? "N/A" : data.inspectionSections[4]['items'][1].value,
           
            entrychecked:data.inspectionSections[5]['items'][0].value === "na" ? "N/A" : data.inspectionSections[5]['items'][0].value,
            furniturechecked:data.inspectionSections[5]['items'][1].value === "na" ? "N/A" : data.inspectionSections[5]['items'][1].value,
            
            note:data.inspectionSections[6]['items'][0].value === "na" ? "N/A" : data.inspectionSections[6]['items'][0].value,
        })
      }

        // Render the document
        doc.render();

        return {buffer:doc.getZip().generate({ type: 'nodebuffer' }),response:true}
    } catch (error) {
        return {response:false}
    }
}

const inspectionDownload = asyncHandler(async(req,res)=>{
    try
    {

      const data = await inspectionCreateDocx(req.body)

      if(req.body.email == true){
        try{
           const status =  sendInpectionDocumentToDoctor(data.buffer)
           if(status){
            return res.status(200).json({response:true})
           }else{
            return res.status(500).json({response:false})
           }
        }catch(e){
            return res.status(500).json({response:false})
        }
      }

    if(data.response == true)
    {
        res.setHeader('Content-Disposition', 'attachment; filename="output.docx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        return res.status(200).send(data.buffer) 

    }else{
        return res.status(500).send('File corrupt')
    }
    
    }
    catch(e)
    {
      return res.json({response:false})
    }
})

//pludo

module.exports = {
    reportDocx,
    reportPdf,
    createQuickDocx,
    reportDocxDirectDownload,
    ameriarePatientDocument,
    inspectionDownload
    
};