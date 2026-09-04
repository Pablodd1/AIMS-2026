
const asyncHandler = require("express-async-handler");
const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY, 
});

async function speechToText(file)
{
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(file.path),
            model: "whisper-1",
        });
        return {response:true , msg: transcription.text} 
        // return transcription.text;
    } catch (e) {
        // return e.toString();
        return {response:false , msg: e.error.message} 
    } finally {
        fs.unlink(file.path, (err) => {
            if (err) console.error(err);
        });
    }
}

function extractArrayKey(data) {
    if (Array.isArray(data)) {
        return data; 
    }
    
    if (typeof data === "object" && data !== null) {
        for (const key in data) {
            if (Array.isArray(data[key])) {
                return data[key]; 
            }
        }
    }
    
    return [];
}

async function extractAnswers(text){
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
                    Extracts answers and formats them into a JSON object. Always return an array of 33 question-answer objects.
                    If the transcription does not contain the answer to a question, set its answer to null.
                    The output must be in English and datte of birth must be in this format YYYY-MM-DD  
                    "questions": [
                     { "id": 1, "question": "Please state your full name." },
                     { "id": 2, "question": "What is your date of birth?" },
                     { "id": 3, "question": "What is your gender?" },
                     { "id": 4, "question": "What is your email address?" },
                     { "id": 5, "question": "What is your phone number?" },
                     { "id": 6, "question": "Please provide the phone number of an emergency contact." },
                     { "id": 7, "question": "what is your address?" },
                     { "id": 8, "question": "Who is your insurance provider?" },
                     { "id": 9, "question": "What is your insurance policy number?" },
                     { "id": 10, "question": "What is your Policy Holder Name?" },
                     { "id": 11, "question": "What is your group number?" },
                     { "id": 12, "question": "Who is your primary care physician?" },
                     { "id": 13, "question": "Please list any medications you are currently taking." },
                     { "id": 14, "question": "Do you have any allergies to medications, food, or other substances?" },
                     { "id": 15, "question": "Do you have any chronic medical conditions?" },
                     { "id": 16, "question": "Have you had any surgeries in the past?" },
                     { "id": 17, "question": "Is there any significant family medical history we should be aware of?" },
                     { "id": 18, "question": "What brings you in today?" },
                     { "id": 19, "question": "Can you describe your symptoms in detail?" },
                     { "id": 20, "question": "How long have you been experiencing these symptoms?" },
                     { "id": 21, "question": "On a scale of 1 to 10, how severe are your symptoms?" },
                     { "id": 22, "question": "Have you experienced these symptoms before?" },
                     { "id": 23, "question": "Is there anything that makes the symptoms better or worse?" },
                     { "id": 24, "question": "What is your current occupation?" },
                     { "id": 25, "question": "Do you smoke, drink alcohol, or use recreational drugs?" },
                     { "id": 26, "question": "How often do you exercise, and what does your diet typically consist of?" },
                     { "id": 27, "question": "Do you live alone, with family, or in another arrangement?" },
                     { "id": 28, "question": "Have you experienced any weight loss, fever, or fatigue recently?" },
                     { "id": 29, "question": "Any history of chest pain, palpitations, or swelling in the legs?" },
                     { "id": 30, "question": "Any cough, shortness of breath, or wheezing?" },
                     { "id": 31, "question": "Any nausea, vomiting, diarrhea, or constipation?" },
                     { "id": 32, "question": "Any joint pain, muscle aches, or weakness?" },
                     { "id": 33, "question": "Any headaches, dizziness, or numbness?" }
                 ],
                 "answers": [
                     {
                         "id": 1,
                         "question": "Please state your full name.",
                         "answer": "Anderson"
                     },
                     {
                         "id": 2,
                         "question": "What is your date of birth?",
                         "answer": 'YYYY-MM-DD'
                     },
                     {
                         "id": 3,
                         "question": "What is your gender?",
                         "answer": "Male"
                     },
                    {
                         "id": 4,
                         "question": "What is your email address?",
                         "answer": 'example@gmail.com'
                     },
                     {
                         "id": 5,
                         "question": "What is your phone number?",
                         "answer": "3364569588"
                     },
                     {
                         "id": 6,
                         "question": "Please provide the phone number of an emergency contact.",
                         "answer": '3364569588'
                     },
                     {
                        "id": 7,
                        "question": "What is your address?",
                        "answer": "Miami beach florida"
                    },
                     {
                         "id": 8,
                         "question": "Who is your insurance provider?",
                         "answer": "ABC Insurance"
                     },
                     {
                         "id": 9,
                         "question": "What is your insurance policy number?",
                         "answer": "123456789"
                     },
                     {
                         "id": 10,
                         "question": "What is your Policy Holder Name?",
                         "answer": "John Doe"
                     },
                     {
                         "id": 11,
                         "question": "What is your group number?",
                         "answer": "G123"
                     },
                     {
                         "id": 12,
                         "question": "Who is your primary care physician?",
                         "answer": "Dr. Smith"
                     },
                     {
                         "id": 13,
                         "question": "Please list any medications you are currently taking.",
                         "answer": "Medication A, Medication B"
                     },
                     {
                         "id": 14,
                         "question": "Do you have any allergies to medications, food, or other substances?",
                         "answer": "Penicillin"
                     },
                     {
                         "id": 15,
                         "question": "Do you have any chronic medical conditions?",
                         "answer": "Diabetes"
                     },
                     {
                         "id": 16,
                         "question": "Have you had any surgeries in the past?",
                         "answer": "Appendectomy"
                     },
                     {
                         "id": 17,
                         "question": "Is there any significant family medical history we should be aware of?",
                         "answer": "Heart disease"
                     },
                     {
                         "id": 18,
                         "question": "What brings you in today?",
                         "answer": "Persistent cough"
                     },
                     {
                         "id": 19,
                         "question": "Can you describe your symptoms in detail?",
                         "answer": "Cough with mucus, occasional fever"
                     },
                     {
                         "id": 20,
                         "question": "How long have you been experiencing these symptoms?",
                         "answer": "2 weeks"
                     },
                     {
                         "id": 21,
                         "question": "On a scale of 1 to 10, how severe are your symptoms?",
                         "answer": "7"
                     },
                     {
                         "id": 22,
                         "question": "Have you experienced these symptoms before?",
                         "answer": "No"
                     },
                     {
                         "id": 23,
                         "question": "Is there anything that makes the symptoms better or worse?",
                         "answer": "Worse with cold weather"
                     },
                     {
                         "id": 24,
                         "question": "What is your current occupation?",
                         "answer": "Engineer"
                     },
                     {
                         "id": 25,
                         "question": "Do you smoke, drink alcohol, or use recreational drugs?",
                         "answer": "No"
                     },
                     {
                         "id": 26,
                         "question": "How often do you exercise, and what does your diet typically consist of?",
                         "answer": "Exercise 3 times a week, balanced diet"
                     },
                     {
                         "id": 27,
                         "question": "Do you live alone, with family, or in another arrangement?",
                         "answer": "With family"
                     },
                     {
                         "id": 28,
                         "question": "Have you experienced any weight loss, fever, or fatigue recently?",
                         "answer": "No"
                     },
                     {
                         "id": 29,
                         "question": "Any history of chest pain, palpitations, or swelling in the legs?",
                         "answer": "No"
                     },
                     {
                         "id": 30,
                         "question": "Any cough, shortness of breath, or wheezing?",
                         "answer": "Cough"
                     },
                     {
                         "id": 31,
                         "question": "Any nausea, vomiting, diarrhea, or constipation?",
                         "answer": "No"
                     },
                     {
                         "id": 32,
                         "question": "Any joint pain, muscle aches, or weakness?",
                         "answer": "Joint pain"
                     },
                     {
                         "id": 33,
                         "question": "Any headaches, dizziness, or numbness?",
                         "answer": "Headaches occasionally"
                     },
                     
                 ]
                `
                },
                {
                    role: "user",
                    content: text
                }
            ]
        });
        let cleanedString = response.choices[0].message.content.replace(/```/g, '').replace(/json/g, '');
        return cleanedString;
    } catch (error) {
        console.error(`Error processing: ${error}`);
        return { error: "Error processing" };
    }
}

async function extractAnswersforUpdate(text){
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `
                    Extracts answers and formats them into a JSON object. Always return an array of 31 question-answer objects.
                    If the transcription does not contain the answer to a question, set its answer to null.
                    The output must be in English and datte of birth must be in this format YYYY-MM-DD  
                    "questions": [
                     { "id": 1, "question": "What is your date of birth? format YYYY-MM-DD" },
                     { "id": 2, "question": "What is your gender?" },
                     { "id": 3, "question": "What is your phone number?" },
                     { "id": 4, "question": "Please provide the phone number of an emergency contact." },
                     { "id": 5, "question": "What is your address?" },
                     { "id": 6, "question": "What is your insurance provider?" },
                     { "id": 7, "question": "What is your insurance policy number?" },
                     { "id": 8, "question": "What is your Policy Holder Name?" },
                     { "id": 9, "question": "What is your group number?" },
                     { "id": 10, "question": "Who is your primary care physician?" },
                     { "id": 11, "question": "Please list any medications you are currently taking." },
                     { "id": 12, "question": "Do you have any allergies to medications, food, or other substances?" },
                     { "id": 13, "question": "Do you have any chronic medical conditions?" },
                     { "id": 14, "question": "Have you had any surgeries in the past?" },
                     { "id": 15, "question": "Is there any significant family medical history we should be aware of?" },
                     { "id": 16, "question": "What brings you in today?" },
                     { "id": 17, "question": "Can you describe your symptoms in detail?" },
                     { "id": 18, "question": "How long have you been experiencing these symptoms?" },
                     { "id": 19, "question": "On a scale of 1 to 10, how severe are your symptoms?" },
                     { "id": 20, "question": "Have you experienced these symptoms before?" },
                     { "id": 21, "question": "Is there anything that makes the symptoms better or worse?" },
                     { "id": 22, "question": "What is your current occupation?" },
                     { "id": 23, "question": "Do you smoke, drink alcohol, or use recreational drugs?" },
                     { "id": 24, "question": "How often do you exercise, and what does your diet typically consist of?" },
                     { "id": 25, "question": "Do you live alone, with family, or in another arrangement?" },
                     { "id": 26, "question": "Have you experienced any weight loss, fever, or fatigue recently?" },
                     { "id": 27, "question": "Any history of chest pain, palpitations, or swelling in the legs?" },
                     { "id": 28, "question": "Any cough, shortness of breath, or wheezing?" },
                     { "id": 29, "question": "Any nausea, vomiting, diarrhea, or constipation?" },
                     { "id": 30, "question": "Any joint pain, muscle aches, or weakness?" },
                     { "id": 31, "question": "Any headaches, dizziness, or numbness?" },
                     
                 ],
                 "example": [
                     {
                         "id": 1,
                         "question": "What is your date of birth?",
                         "answer": 'YYYY-MM-DD'
                     },
                     {
                         "id": 2,
                         "question": "What is your gender?",
                         "answer": "Male"
                     },
                     {
                         "id": 3,
                         "question": "What is your phone number?",
                         "answer": "3364569588"
                     },
                     {
                         "id": 4,
                         "question": "Please provide the phone number of an emergency contact.",
                         "answer": '3364569588'
                     },
                     {
                        "id": 5,
                        "question": "What is your address?",
                        "answer": "Miami beach florida"
                     },
                     {
                         "id": 6,
                         "question": "Who is your insurance provider?",
                         "answer": "ABC Insurance"
                     },
                     {
                         "id": 7,
                         "question": "What is your insurance policy number?",
                         "answer": "123456789"
                     },
                     {
                         "id": 8,
                         "question": "What is your Policy Holder Name?",
                         "answer": "John Doe"
                     },
                     {
                         "id": 9,
                         "question": "What is your group number?",
                         "answer": "G123"
                     },
                     {
                         "id": 10,
                         "question": "Who is your primary care physician?",
                         "answer": "Dr. Smith"
                     },
                     {
                         "id": 11,
                         "question": "Please list any medications you are currently taking.",
                         "answer": "Medication A, Medication B"
                     },
                     {
                         "id": 12,
                         "question": "Do you have any allergies to medications, food, or other substances?",
                         "answer": "Penicillin"
                     },
                     {
                         "id": 13,
                         "question": "Do you have any chronic medical conditions?",
                         "answer": "Diabetes"
                     },
                     {
                         "id": 14,
                         "question": "Have you had any surgeries in the past?",
                         "answer": "Appendectomy"
                     },
                     {
                         "id": 15,
                         "question": "Is there any significant family medical history we should be aware of?",
                         "answer": "Heart disease"
                     },
                     {
                         "id": 16,
                         "question": "What brings you in today?",
                         "answer": "Persistent cough"
                     },
                     {
                         "id": 17,
                         "question": "Can you describe your symptoms in detail?",
                         "answer": "Cough with mucus, occasional fever"
                     },
                     {
                         "id": 18,
                         "question": "How long have you been experiencing these symptoms?",
                         "answer": "2 weeks"
                     },
                     {
                         "id": 19,
                         "question": "On a scale of 1 to 10, how severe are your symptoms?",
                         "answer": "7"
                     },
                     {
                         "id": 20,
                         "question": "Have you experienced these symptoms before?",
                         "answer": "No"
                     },
                     {
                         "id": 21,
                         "question": "Is there anything that makes the symptoms better or worse?",
                         "answer": "Worse with cold weather"
                     },
                     {
                         "id": 22,
                         "question": "What is your current occupation?",
                         "answer": "Engineer"
                     },
                     {
                         "id": 23,
                         "question": "Do you smoke, drink alcohol, or use recreational drugs?",
                         "answer": "No"
                     },
                     {
                         "id": 24,
                         "question": "How often do you exercise, and what does your diet typically consist of?",
                         "answer": "Exercise 3 times a week, balanced diet"
                     },
                     {
                         "id": 25,
                         "question": "Do you live alone, with family, or in another arrangement?",
                         "answer": "With family"
                     },
                     {
                         "id": 26,
                         "question": "Have you experienced any weight loss, fever, or fatigue recently?",
                         "answer": "No"
                     },
                     {
                         "id": 27,
                         "question": "Any history of chest pain, palpitations, or swelling in the legs?",
                         "answer": "No"
                     },
                     {
                         "id": 28,
                         "question": "Any cough, shortness of breath, or wheezing?",
                         "answer": "Cough"
                     },
                     {
                         "id": 29,
                         "question": "Any nausea, vomiting, diarrhea, or constipation?",
                         "answer": "No"
                     },
                     {
                         "id": 30,
                         "question": "Any joint pain, muscle aches, or weakness?",
                         "answer": "Joint pain"
                     },
                     {
                         "id": 31,
                         "question": "Any headaches, dizziness, or numbness?",
                         "answer": "Headaches occasionally"
                     },
                 ]
                `
                },
                {
                    role: "user",
                    content: text
                }
            ]
        });
        let cleanedString = response.choices[0].message.content.replace(/```/g, '').replace(/json/g, '');
        return cleanedString;
    } catch (error) {
        console.error(`Error processing: ${error}`);
        return { error: "Error processing" };
    }
}

async function extractSummary(text){
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `make a detailed summary of given text. it's a patient detail and also correct grammer if any mistake in it. return as a string paragraph`
                },
                {
                    role: "user",
                    content:JSON.stringify(text)
                }
            ]
        });
        return {
            success:true,
            summary:response.choices[0].message.content
        }
        
    } catch (error) {
        return {
            success:false,
            summary:"",
        }
    }
}

function encodeImage(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
}
  
const extractDataFromImage = async (filepath)=> {
  
    

    const mimeType = filepath.mimetype 
  
    const base64Image = encodeImage(filepath.path)
  
    const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!supportedMimeTypes.includes(mimeType)) {
        fs.unlinkSync(filepath.path);
       return { response: false, msg: "Unsupported image format. Allowed formats: png, jpeg, gif, webp." }
    }

  
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract the text data in the image" },
                        { 
                            type: "image_url", 
                            image_url: { url: `data:${mimeType};base64,${base64Image}` },
                        },
                    ],
                },
            ],
        });
  
        return {msg:response.choices[0].message.content,response:true}
    } catch (e) {
        return {response:false,msg:e.error.message}
    }
    finally{
        if(filepath)
        {
            fs.unlinkSync(filepath.path)
        }
    }
}

const speechToTextForm =  asyncHandler(async(req,res)=>{
    try
    {
        const uploadMethod = req.body.method 
        const type = req.body.type

       
        if(uploadMethod == "voice")
        {
          const result = await voiceMethod(req.file,type)

          if(result.response === false)
          {
            return res.status(400).json({success:false, msg:result.msg});
          }

           return res.json({success:true,data:result.msg});
        }
        else if(uploadMethod == "image")
        {
            const result = await imageMethod(req.file,type)

            console.log(result)
            
            if(result.response === false)
            {
              return res.status(400).json({success:false,msg:result.msg});
            }
  
             return res.json({success:true,data:result.msg});
        }

        
        
        
    }catch(e)
    {
        res.send({success:false,msg:"Error in processing inforrmation"})
    }
    
})

const speechToTextFormWithOcr =  asyncHandler(async(req,res)=>{
    try
    {
        const uploadMethod = req.body.method 
        const type = req.body.type
        const audioFile = req.files['file1'][0]
        const imageFile = req.files['file2'][0]

        if (!audioFile || !imageFile) {
            return res.status(400).json({success:false,msg:"'No file uploaded.'"})
        }

        if(uploadMethod == "both")
        {
            const result = await imageAndVoiceMethod(audioFile,imageFile,type)

            if(result.response === false)
            {
              return res.status(400).send({success:false,msg:result.msg});
            }
  
             return res.json({success:true,data:result.msg});
        }

        return res.json({success:false,msg:"Condition failed"});

        
    }catch(e)
    {
        res.send({success:false,msg:"Error in processing inforrmation"})
    }
    
})

async function voiceMethod (file,type){
    if (!file) {
        return {response:false,msg:"'No file uploaded.'"}
    }


    const result = await speechToText(file)


    if(result.response == false)
    {
        return { response:false , msg:result.msg}
    }
    if(type=="create")
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswers(result.msg),
        ]);
        
        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}
    }
    else
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswersforUpdate(result.msg),
        ]);

        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}

    }
}

async function imageMethod (file,type){
    if (!file) {
        return {success:false,msg:"'No file uploaded.'"}
    }
  
    const result = await extractDataFromImage(file)
    
    if(result.response == false)
    {
       return { response: result.response, msg: result.msg }
    }

    if(type=="create")
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswers(result.msg),
        ]);
        
        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}
    }
    else
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswersforUpdate(result.msg),
        ]);
        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}

    }
}

async function imageAndVoiceMethod (audioFile,imageFile,type){
    
    const audioData = await speechToText(audioFile)


    if(audioData.response == false)
    {
        return { response:false , msg:audioData.msg}
    }

    const imageData = await extractDataFromImage(imageFile)

    

    if(imageData.response == false)
    {
        return { response:false , msg:imageData.msg}
    }

    let finalTransaciption = audioData.msg + " " + imageData.msg;


    if(type=="create")
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswers(finalTransaciption),
        ]);
        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}
    }
    else
    {
        const [
            answers, 
        ] = await Promise.all([
            extractAnswersforUpdate(finalTransaciption),
        ]);
        const parsed = parseData(answers)
        return {response:true,msg:extractArrayKey(parsed)}

    }
}

const patientDataToSummary =  asyncHandler(async(req,res)=>{
    try
    {
        
        const result = await extractSummary(req.body)
        if (!result.success) {
            return res.json({success:false, msg:"Failed to generate summary"});
        }
        res.json({success:true, summary: result.summary});
        
    }catch(e)
    {
        res.send({success:false,msg:"Error in processing inforrmation"})
    }
    
})

function parseData(input) {
    if (typeof input === "string") {
        try {
            return JSON.parse(input); // Parse if it's a valid JSON string
        } catch (error) {
            console.error("Failed to parse JSON:", error);
            return null; // Return null if parsing fails
        }
    }
    return input; // Return as-is if not a string
}














// Extract patient data from insurance card / ID image — replaces dead Flask/Django endpoint
const extractPatientDataFromImage = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mimeType = req.file.mimetype;
    const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!supportedMimeTypes.includes(mimeType)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Unsupported image format. Use PNG, JPEG, GIF, or WebP." });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a medical OCR assistant. Extract ALL visible patient information from this insurance card or ID image thoroughly.

Return ONLY valid JSON with these exact field names (use null for missing):
{
  "FullName": "First Last",
  "fullName": "First Last",
  "birthDate": "YYYY-MM-DD",
  "gender": "Male/Female/Other",
  "address": "patient street address",
  "primaryInsuranceAddress": "insurance company address",
  "phoneNumber": "patient phone",
  "email": "email",
  "provider": "insurance company name",
  "insuranceProvider": "same as provider",
  "policyName": "policy/subscriber name",
  "policyHolderName": "same as policyName",
  "memberid": "member ID number",
  "memberId": "same as memberid",
  "memberID": "same as memberid",
  "groupNB": "group number",
  "groupNumber": "same as groupNB",
  "policyNumber": "policy or contract number"
}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all visible patient and insurance information from this image." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ]
    });

    fs.unlinkSync(req.file.path);

    const content = response.choices[0].message.content;
    const jsonMatch = content.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(jsonMatch);
      return res.json(parsed);
    } catch {
      return res.json({ error: "Failed to parse extracted data", raw: content });
    }
  } catch (error) {
    console.error("Image extraction error:", error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: error.message || "Error processing image" });
  }
});

// Audio download for medical notes — TTS
const downloadNoteAsAudio = asyncHandler(async (req, res) => {
  try {
    const { text, voice = "alloy" } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, msg: "No text provided for audio generation" });
    }

    const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = allowedVoices.includes(voice) ? voice : "alloy";

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const filename = `aims-note-${Date.now()}.mp3`;

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error("TTS audio download error:", error);
    return res.status(500).json({ success: false, msg: error.message || "Error generating audio" });
  }
});

// Red-flag validation for patient intake / symptoms
const validateRedFlags = asyncHandler(async (req, res) => {
  try {
    const { text, answers } = req.body;
    const inputText = text || JSON.stringify(answers);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a medical triage assistant for a chiropractic clinic. Analyze patient intake data or symptom descriptions and identify any RED FLAGS — signs or symptoms that require immediate medical attention or contraindicate chiropractic treatment.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "redFlags": [\n    {\n      "severity": "critical|warning|caution",\n      "category": "cardiovascular|neurological|infectious|trauma|psychiatric|other",\n      "description": "What was found",\n      "recommendation": "What action to take"\n    }\n  ],\n  "safeToTreat": true|false,\n  "summary": "Brief assessment summary"\n}\n\nIf no red flags are found, return an empty redFlags array and safeToTreat: true.`
        },
        {
          role: "user",
          content: inputText
        }
      ]
    });

    const content = response.choices[0].message.content;
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.json({ success: true, data: parsed });
    } catch {
      return res.json({ success: false, msg: "Failed to parse red-flag data", raw: content });
    }
  } catch (error) {
    console.error("Red-flag validation error:", error);
    return res.status(500).json({ success: false, msg: error.message || "Error validating red flags" });
  }
});

// Auto treatment suggestions based on SOAP / medical notes
const suggestTreatment = asyncHandler(async (req, res) => {
  try {
    const { notes, diagnosis, symptoms } = req.body;
    const input = notes || `Diagnosis: ${diagnosis || 'N/A'}\nSymptoms: ${symptoms || 'N/A'}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are a chiropractic treatment planning assistant. Based on the provided patient notes, diagnosis, and symptoms, suggest appropriate chiropractic treatment modalities.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "treatments": [\n    {\n      "modality": "Name of treatment (e.g. Spinal Manipulation, Flexion-Distraction, EMS, Therapeutic Exercise)",\n      "targetArea": "Body region",\n      "rationale": "Why this treatment is appropriate",\n      "frequency": "Recommended frequency",\n      "contraindications": ["Any contraindications to check"]\n    }\n  ],\n  "homeCare": [\n    {\n      "instruction": "What the patient should do at home",\n      "frequency": "How often"\n    }\n  ],\n  "followUp": "Recommended follow-up plan",\n  "warnings": ["Any warnings or precautions"]\n}\n\nFocus on evidence-based chiropractic care. Do not suggest treatments outside chiropractic scope.`
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const content = response.choices[0].message.content;
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.json({ success: true, data: parsed });
    } catch {
      return res.json({ success: false, msg: "Failed to parse treatment data", raw: content });
    }
  } catch (error) {
    console.error("Auto treatment error:", error);
    return res.status(500).json({ success: false, msg: error.message || "Error generating treatment suggestions" });
  }
});

// DX / CPT code extraction and suggestion
const extractDxCptCodes = asyncHandler(async (req, res) => {
  try {
    const { notes, diagnosis, procedures } = req.body;
    const input = notes || `Diagnosis: ${diagnosis || 'N/A'}\nProcedures performed: ${procedures || 'N/A'}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a medical coding assistant specializing in chiropractic billing. Extract or suggest appropriate ICD-10 (diagnosis) and CPT (procedure) codes from the provided clinical notes.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "dxCodes": [\n    {\n      "code": "ICD-10 code (e.g. M54.5)",\n      "description": "Full description",\n      "primary": true|false\n    }\n  ],\n  "cptCodes": [\n    {\n      "code": "CPT code (e.g. 98940)",\n      "description": "Full description",\n      "units": 1,\n      "modifier": "Modifier if applicable"\n    }\n  ],\n  "complianceNotes": [\n    "Any billing compliance notes or documentation requirements"\n  ],\n  "confidence": "high|medium|low"\n}\n\nCommon chiropractic CPT codes to consider: 98940 (1-2 regions), 98941 (3-4 regions), 98942 (5 regions), 98943 (extraspinal), 97110 (therapeutic exercise), 97014 (EMS), 97140 (manual therapy), 99213-99215 (E/M).\nCommon chiropractic ICD-10 codes: M99.01-M99.05 (somatic dysfunction), M54.5 (low back pain), M54.2 (cervicalgia), M25.50 (joint pain), M79.1 (myalgia).`
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const content = response.choices[0].message.content;
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return res.json({ success: true, data: parsed });
    } catch {
      return res.json({ success: false, msg: "Failed to parse coding data", raw: content });
    }
  } catch (error) {
    console.error("DX/CPT extraction error:", error);
    return res.status(500).json({ success: false, msg: error.message || "Error extracting codes" });
  }
});

// ===== Smart AI Assistant — generates note with previous visit context =====
const Visit = require('../models/Visit');
const Patient = require('../models/Patients');

const generateNoteWithHistory = asyncHandler(async (req, res) => {
  try {
    const { patientId, transcription, type } = req.body;
    if (!patientId || !transcription) {
      return res.status(400).json({ response: false, msg: 'Patient ID and transcription required' });
    }

    // Fetch patient info
    const patient = await Patient.findById(patientId).select('fullName dateOfBirth gender visitCount');

    // Fetch last 3 visits for context
    const previousVisits = await Visit.find({ pId: patientId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('soapNotesSummary subjective objective Assessment Plan dxCodes cptCodes date');

    // Build history context
    let historyContext = '';
    if (previousVisits && previousVisits.length > 0) {
      historyContext = 'PREVIOUS VISIT HISTORY:\n';
      previousVisits.forEach((v, i) => {
        historyContext += `\n--- Visit ${i + 1} (${v.date || 'unknown date'}) ---\n`;
        if (v.soapNotesSummary) historyContext += `Summary: ${v.soapNotesSummary}\n`;
        if (v.subjective) historyContext += `Subjective: ${v.subjective}\n`;
        if (v.objective) historyContext += `Objective: ${v.objective}\n`;
        if (v.Assessment) historyContext += `Assessment: ${v.Assessment}\n`;
        if (v.Plan) historyContext += `Plan: ${v.Plan}\n`;
        if (v.dxCodes?.length) historyContext += `DX Codes: ${v.dxCodes.map(d => d.code || d).join(', ')}\n`;
      });
    } else {
      historyContext = 'No previous visits found. This appears to be a new patient.';
    }

    const patientInfo = patient
      ? `Patient: ${patient.fullName}, DOB: ${patient.dateOfBirth || 'N/A'}, Total visits: ${patient.visitCount || 0}`
      : '';

    // Generate enhanced note with context
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a medical scribe AI. Generate a structured SOAP note from the current visit transcription.
          
${patientInfo}

${historyContext}

INSTRUCTIONS:
1. Use the previous visit history to understand context, track changes, and avoid repeating information
2. Highlight any changes or lack of progress since the last visit
3. Extract ICD-10 codes and CPT codes where applicable
4. Return ONLY valid JSON with this structure:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "soapNotesSummary": "2-3 sentence summary",
  "dxCodes": [{"code": "M54.5", "description": "Low back pain"}],
  "cptCodes": [{"code": "99213", "description": "Office visit"}],
  "changesSinceLastVisit": "What changed or didn't change since last visit"
}`
        },
        {
          role: 'user',
          content: transcription
        }
      ]
    });

    const content = response.choices[0].message.content
      .replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        soapNotesSummary: content.substring(0, 500),
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
      };
    }

    res.json({
      response: true,
      note: parsed,
      historyUsed: previousVisits?.length || 0,
    });
  } catch (e) {
    console.error('Smart assistant error:', e);
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== 3-Agent Quality Check =====
const runQualityCheck = asyncHandler(async (req, res) => {
  try {
    const { visitId, subjective, objective, assessment, plan, dxCodes, cptCodes } = req.body;

    if (!subjective && !assessment && !plan) {
      return res.status(400).json({ response: false, msg: 'Note content required for quality check' });
    }

    const noteText = `
SUBJECTIVE: ${subjective || 'N/A'}
OBJECTIVE: ${objective || 'N/A'}
ASSESSMENT: ${assessment || 'N/A'}
PLAN: ${plan || 'N/A'}
DX CODES: ${dxCodes ? (typeof dxCodes === 'string' ? dxCodes : dxCodes.map(d => d.code || d).join(', ')) : 'N/A'}
CPT CODES: ${cptCodes ? (typeof cptCodes === 'string' ? cptCodes : cptCodes.map(d => d.code || d).join(', ')) : 'N/A'}
`;

    // Run 3 agents in parallel
    const [agent1, agent2, agent3] = await Promise.all([
      // Agent 1: Medical Accuracy
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a medical accuracy reviewer. Check for contradictions, missing critical information, or clinically implausible statements. Return ONLY JSON: {"score": 0-100, "issues": [{"severity": "high|medium|low", "description": "..."}], "summary": "1 sentence"}' },
          { role: 'user', content: `Review this SOAP note for medical accuracy:\n${noteText}` }
        ]
      }),
      // Agent 2: Completeness
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a medical documentation completeness reviewer. Check for missing required elements: chief complaint, HPI, exam findings, assessment, plan. Return ONLY JSON: {"score": 0-100, "missing": [{"field": "...", "importance": "high|medium"}], "summary": "1 sentence"}' },
          { role: 'user', content: `Check this SOAP note for completeness:\n${noteText}` }
        ]
      }),
      // Agent 3: Coding Accuracy
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a medical coding reviewer. Check if ICD-10 codes match the diagnosis and if CPT codes match the visit complexity. Return ONLY JSON: {"score": 0-100, "codeIssues": [{"code": "...", "issue": "..."}], "summary": "1 sentence"}' },
          { role: 'user', content: `Review coding for this SOAP note:\n${noteText}` }
        ]
      }),
    ]);

    const parseJson = (content) => {
      try {
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch {
        return { score: 0, issues: [], summary: 'Parse error' };
      }
    };

    const result1 = parseJson(agent1.choices[0].message.content);
    const result2 = parseJson(agent2.choices[0].message.content);
    const result3 = parseJson(agent3.choices[0].message.content);

    const allIssues = [
      ...(result1.issues || []).map(i => ({ ...i, agent: 'accuracy' })),
      ...(result2.missing || []).map(m => ({ severity: m.importance, description: `Missing: ${m.field}`, agent: 'completeness' })),
      ...(result3.codeIssues || []).map(c => ({ severity: 'medium', description: `${c.code}: ${c.issue}`, agent: 'coding' })),
    ];

    const overallScore = Math.round((result1.score + result2.score + result3.score) / 3);

    res.json({
      response: true,
      overallScore,
      agents: {
        accuracy: result1,
        completeness: result2,
        coding: result3,
      },
      issues: allIssues,
      pass: overallScore >= 70,
    });
  } catch (e) {
    console.error('Quality check error:', e);
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Translate Spanish/Creole to English =====
const translateToEnglish = asyncHandler(async (req, res) => {
  try {
    const { text, sourceLang } = req.body;
    if (!text) return res.status(400).json({ response: false, msg: 'Text required' });

    // If already English, return as-is
    if (sourceLang === 'en') return res.json({ response: true, translated: text, detected: 'en' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: 'Translate the following text to English. Preserve medical terminology. Return ONLY the translated text, no explanations.' },
        { role: 'user', content: text }
      ]
    });

    const translated = response.choices[0].message.content.trim();
    res.json({ response: true, translated, detected: sourceLang || 'es' });
  } catch (e) {
    console.error('Translation error:', e);
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== AI Command Interpreter =====
const interpretCommand = asyncHandler(async (req, res) => {
  try {
    const { text, availableButtons } = req.body;
    if (!text) return res.status(400).json({ response: false, msg: 'Text required' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You interpret voice commands for a medical EHR app. The user said: "${text}".
Available buttons/links on current page: ${(availableButtons || []).join(', ')}

Return ONLY JSON:
{
  "action": "navigate|click|search|create|translate|unknown",
  "target": "exact button text to click, or page name, or patient name",
  "page": "route path if navigation",
  "message": "confirmation message"
}`
        },
      ]
    });

    const content = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json({ response: true, interpretation: JSON.parse(content) });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});


// @route POST /api/post/generateReportFromAudioFile
// Quick (Copy-and-Paste / audio upload) report flow.
// Frontend posts FormData: text|file, type: "text"|"upload", practice.
// Expects: {success, code, data:{Subjective,Objective,Assessment,Plan,Medications,...}, Ros, original}
const generateReportFromAudioFile = asyncHandler(async (req, res) => {
  const { text, type } = req.body || {};
  let transcript = type === 'upload' ? null : text;
  if (type === 'upload' && req.file) {
    const r = await voiceMethod(req.file, 'quick-upload').catch(() => null);
    transcript = r && r.msg;
  }
  if (!transcript || !String(transcript).trim()) {
    return res.status(400).json({ success: false, msg: 'No consultation text provided' });
  }
  // Full response contract the deployed frontend expects (minified bundle reads all of these):
  const ROS_SYS = ['Constitutional', 'Eyes', 'ENT', 'Cardiovascular', 'Respiratory', 'Gastrointestinal',
                   'Genitourinary', 'Musculoskeletal', 'Skin', 'Neurological', 'Psychiatric'];
  const rosObj = {};
  ROS_SYS.forEach(k => { rosObj[k] = { type: 'Not discussed', description: 'Not discussed during the consultation.' }; });
  const blank = () => ({
    Subjective: '', Objective: '', Assessment: '', Plan: '', Medications: '', Allergies: '', SUMMARY: '',
    'History of Present Illness (HPI)': '', 'Past Medical History (PMH)': '', 'Chief Complaint': '',
    'Physical Examination': '', Constitutional: rosObj,
  });
  try {
    const prompt = 'You are a medical scribe. Convert the consultation transcript into a structured clinical note. Return ONLY valid JSON with keys: Subjective, Objective, Assessment, Plan, Medications, Allergies, SUMMARY, "History of Present Illness (HPI)", "Past Medical History (PMH)", "Chief Complaint", "Physical Examination". Fill each with the relevant content from the transcript, empty string if not discussed.';
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt + '\n\nTranscript:\n' + transcript }],
      response_format: { type: 'json_object' },
    });
    let parsed = {};
    try { parsed = JSON.parse(completion.choices[0].message.content); } catch {}
    const data = blank();
    Object.keys(data).forEach(k => { if (parsed[k]) data[k] = parsed[k]; });
    data.Constitutional = rosObj;
    return res.json({ success: true, code: { 'ICD-10 Codes': [], 'CPT Codes': [] }, data, Ros: rosObj, original: transcript });
  } catch (e) {
    console.error('generateReportFromAudioFile error:', e.message);
    return res.status(500).json({ success: false, msg: (e && e.message) || 'generation failed' });
  }
});


// Patient self-intake: free-order voice/text -> structured createPatient fields
const extractIntakeEntities = asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ success: false, msg: 'No text provided' });
  const fields = "fullName,dateOfBirth(YYYY-MM-DD),gender(Male/Female/Other),phoneNumber,email,address,occupation,medications,allergies,chronicConditions,pastSurgeries,familyMedicalHistory,primaryCarePhysician,visitReason,symptomDescription,symptomDuration,symptomSeverity,symptomTriggers,painScale(0-10),painLocation,insuranceProvider,insurancePolicyNumber,policyHolderName,groupNumber,secondaryInsurance,smoking,alcohol,exerciseAndDiet,livingArrangement,recentHealthChanges,emergencyContactName,emergencyContactRelationship,emergencyContactPhoneNumber";
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You extract patient intake information from spoken or written free-form text given in ANY order. Return ONLY a JSON object whose keys are field names from this list: ' + fields + '. Set a key ONLY if the text clearly provides it; omit keys not mentioned. Normalize dates to YYYY-MM-DD, phone numbers to digits only.' },
        { role: 'user', content: String(text).slice(0, 4000) }
      ]
    });
    let data = {};
    try { data = JSON.parse(completion.choices[0].message.content); } catch {}
    Object.keys(data).forEach(k => { if (data[k] === 'null' || data[k] === null) delete data[k]; });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, msg: (e && e.message) || 'extraction failed' });
  }
});

module.exports = {
    extractIntakeEntities,
    patientDataToSummary,
    speechToTextForm,
    speechToTextFormWithOcr,
    extractSummary,
    extractPatientDataFromImage,
    downloadNoteAsAudio,
    validateRedFlags,
    suggestTreatment,
    extractDxCptCodes,
    generateNoteWithHistory,
    runQualityCheck,
    translateToEnglish,
    interpretCommand,
    generateReportFromAudioFile,
};
