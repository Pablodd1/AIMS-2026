const fs = require("fs");
const { Document, Packer, Paragraph, TextRun } = require("docx");

// Sample unstructured input
const unstructuredResponse = `**SOAP Note**

**Patient Name:** Elvis Valdez  
**Date of Service:** November 15, 2024  
**DOB:** [Patient's Date of Birth]  
**Gender:** [Patient's Gender]  
**Occupation:** Sales Representative

**Subjective:**

- **Chief Complaints:**  
  - Left hip pain  
  - Left neck pain  
  - Left lower back pain  
  - Anxiety and panic attacks  
  - Left shoulder pain  
  - Left elbow pain  
  - Numbness and tingling down the left leg  
  - Headaches  
  - Sleep disturbances  
  - Concentration issues  
  - Balance problems  
  - Feeling more depressed  

- **History of Present Illness:**  
  Elvis Valdez was involved in a motor vehicle accident on November 4, 2024, after which she started experiencing the above symptoms. The problems are described as constant, occurring 76 to 100% of the time, and are characterized by sharp, tingling, aching, stabbing, and numbness. The pain radiates from the back to the left hip and further down the left leg. She rates her pain as 8 out of 10. The symptoms interfere extremely with her work and social activities. She has not consulted any other healthcare providers for these issues. Aggravating factors include physical activity, sitting, and daily routines. Relief is found with rest, medication, heat, and cold. Her primary concern is the seriousness of the condition and its impact on her daily life and enjoyment.

- **Social History:**  
  Has a high school diploma. Occupation as a sales representative. Reports that the pain and associated symptoms are significantly interfering with work, household chores, exercise, and social activities.

- **Health Perception:**  
  Considers her overall health to be fair.

**Objective:**

- **Vital Signs:** [To be filled during the examination]

- **Physical Examination:**  
  - **Musculoskeletal:** Tenderness and reduced range of motion noted in the left hip, neck, lower back, shoulder, and elbow.  
  - **Neurological:** Reports of numbness and tingling down the left leg. Balance issues noted.  
  - **Psychological:** Appears anxious with signs of depressive symptoms.  

- **Other Observations:** [To be filled during the examination]

**Assessment:**

1. Musculoskeletal pain post motor vehicle accident  
2. Anxiety and panic attacks  
3. Sleep and concentration disturbances  
4. Possible radiculopathy due to numbness and tingling  
5. Depressive symptoms potentially secondary to chronic pain and functional limitations

**Plan:**

1. **Diagnostic Tests:**  
   - Consider MRI or X-ray of the affected areas (neck, hip, lower back) to assess any structural damage or nerve involvement.  
   - Neurological evaluation to assess the extent of radiculopathy.  

2. **Medications:**  
   - Pain management with NSAIDs or other prescribed analgesics.  
   - Consider muscle relaxants if muscle spasms are present.  
   - Evaluate the need for antidepressants or anxiolytics.  

3. **Physical Therapy:**  
   - Referral to physical therapy for rehabilitation and strengthening exercises.  

4. **Psychological Support:**  
   - Referral to a mental health professional for evaluation and management of anxiety and depression.  

5. **Lifestyle Modifications:**  
   - Encourage rest and modifications in daily activities to prevent symptom exacerbation.  
   - Discuss ergonomic adjustments at work to reduce strain.  

6. **Follow-Up:**  
   - Schedule follow-up appointment in 2 weeks to assess progress and response to treatment.  

**Additional Notes:**  
Patient education on the importance of adhering to the treatment plan and lifestyle modifications to improve symptoms. Discuss the potential long-term management of chronic pain.  

---

**Provider's Signature:**  
[Provider's Name]  
[Provider's Contact Information]  
[Date]`;

// Preprocess the response to remove asterisks
const cleanedResponse = unstructuredResponse.replace(/\*\*/g, "");

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
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("Formatted_SOAP_Note.docx", buffer);
    console.log("DOCX file generated successfully!");
}

// Execute
const parsedData = parseResponse(cleanedResponse);
generateDOCX(parsedData);
