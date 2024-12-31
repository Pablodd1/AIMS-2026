
const asyncHandler = require("express-async-handler");
const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: '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', 
  });
async function speechToText(file)
{
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(file.path),
            model: "whisper-1",
        });
        return transcription.text;
    } catch (e) {
        return e.toString();
    } finally {
        fs.unlink(file.path, (err) => {
            if (err) console.error(err);
        });
    }
}
async function extractAnswers(text){
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `Extracts answers and formats them into JSON. Return a null answer if you don't find the answer to that question in the provided text.output must be in english language
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
                 "example": [
                     {
                         "id": 1,
                         "question": "Please state your full name.",
                         "answer": "Anderson"
                     },
                     {
                         "id": 2,
                         "question": "What is your date of birth? format YYYY-MM-DD",
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
            model: "gpt-4o",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `Extracts answers and formats them into JSON. Return a null answer if you don't find the answer to that question in the provided text.output must be in english language
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
                         "question": "What is your date of birth? format YYYY-MM-DD",
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
            model: "gpt-4o",
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
        return response.choices[0].message.content;;
    } catch (error) {
        return { error: "Error processing" };
    }
}

// function encodeImage(imagePath) {
//     const imageBuffer = fs.readFileSync(imagePath);
//     return imageBuffer.toString('base64');
//   }
  
//   const extractDataFromImage = async (filepath)=> {
  
//     if (!filepath) {
//         return res.json({ response: false, error: "No file uploaded." });
//     }
  
  
//     const mimeType = filepath.mimetype 
  
//     const base64Image = encodeImage(filepath.path)
  
//     const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
//     if (!supportedMimeTypes.includes(mimeType)) {
//         fs.unlinkSync(filepath.path);
//         return res.json({ response: false, error: "Unsupported image format. Allowed formats: png, jpeg, gif, webp." });
//     }
  
//     try {
//         const response = await client.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 {
//                     role: "user",
//                     content: [
//                         { type: "text", text: "Extract the text data in the image" },
//                         { 
//                             type: "image_url", 
//                             image_url: { url: `data:${mimeType};base64,${base64Image}` },
//                         },
//                     ],
//                 },
//             ],
//         });
  
//         return res.json({data:response.choices[0],response:true})
//     } catch (e) {
//         if(filepath)
//         return res.json({response:false,error:e.error.message})
//     }
//     finally{
//         if(filepath)
//         {
//             fs.unlinkSync(filepath.path)
//         }
//     }
//   }

// const speechToTextForm =  asyncHandler(async(req,res)=>{
//     try
//     {

//         const file = req.files['file2'][0].path;

//         console.log(file)
//         if (!req.files['file1'][0] || !req.files['file2'][0]) {
//             return res.status(400).send('No file uploaded.');
//         }

//         console.log(req.files['file1'][0] )
//         let imgData = ""
//         if(req.image)
//         {
//             imgData =  extractDataFromImage(req.image)
//         }

//         let finalText = ""

//         let audioData = await speechToText(req.file)

//         if(imgData && audioData){
//             finalText = audioData + " " + imgData
//         }

//         if(!audioData && imgData)
//         {
//             finalText = imgData
//         }


//         if(!imgData && audioData)
//         {
//             finalText = audioData
//         }

//         if(req.body.type=="create")
//         {
//             const [
//                 answers, 
//             ] = await Promise.all([
//                 extractAnswers(finalText),
//             ]);
//             res.json({'success':true,data:JSON.parse(answers)});
//         }
//         else
//         {
//             const [
//                 answers, 
//             ] = await Promise.all([
//                 extractAnswersforUpdate(finalText),
//             ]);
//             res.json({'success':true,data:JSON.parse(answers)});

//         }
        
        
//     }catch(e)
//     {
//         res.send({success:false,msg:"Error in processing inforrmation"})
//     }
    
// })

const speechToTextForm =  asyncHandler(async(req,res)=>{
    try
    {
     
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const text = await speechToText(req.file)
        if(req.body.type=="create")
        {
            const [
                answers, 
            ] = await Promise.all([
                extractAnswers(text),
            ]);
            res.json({'success':true,data:JSON.parse(answers)});
        }
        else
        {
            const [
                answers, 
            ] = await Promise.all([
                extractAnswersforUpdate(text),
            ]);
            res.json({'success':true,data:JSON.parse(answers)});

        }
        
        
    }catch(e)
    {
        res.send({success:false,msg:"Error in processing inforrmation"})
    }
    
})
const patientDataToSummary =  asyncHandler(async(req,res)=>{
    try
    {
        const summary = await extractSummary(req.body)
        res.json({success:true,summary});
        
    }catch(e)
    {
        res.send({success:false,msg:"Error in processing inforrmation"})
    }
    
})














module.exports = {
    speechToTextForm,
    patientDataToSummary
};














