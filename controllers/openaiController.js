const asyncHandler = require("express-async-handler");
const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: 'c', 
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
            model: "gpt-4o",
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
                     { "id": 7, "question": "Who is your insurance provider?" },
                     { "id": 8, "question": "What is your insurance policy number?" },
                     { "id": 9, "question": "What is your Policy Holder Name?" },
                     { "id": 10, "question": "What is your group number?" },
                     { "id": 11, "question": "Who is your primary care physician?" },
                     { "id": 12, "question": "Please list any medications you are currently taking." },
                     { "id": 13, "question": "Do you have any allergies to medications, food, or other substances?" },
                     { "id": 14, "question": "Do you have any chronic medical conditions?" },
                     { "id": 15, "question": "Have you had any surgeries in the past?" },
                     { "id": 16, "question": "Is there any significant family medical history we should be aware of?" },
                     { "id": 17, "question": "What brings you in today?" },
                     { "id": 18, "question": "Can you describe your symptoms in detail?" },
                     { "id": 19, "question": "How long have you been experiencing these symptoms?" },
                     { "id": 20, "question": "On a scale of 1 to 10, how severe are your symptoms?" },
                     { "id": 21, "question": "Have you experienced these symptoms before?" },
                     { "id": 22, "question": "Is there anything that makes the symptoms better or worse?" },
                     { "id": 23, "question": "What is your current occupation?" },
                     { "id": 24, "question": "Do you smoke, drink alcohol, or use recreational drugs?" },
                     { "id": 25, "question": "How often do you exercise, and what does your diet typically consist of?" },
                     { "id": 26, "question": "Do you live alone, with family, or in another arrangement?" },
                     { "id": 27, "question": "Have you experienced any weight loss, fever, or fatigue recently?" },
                     { "id": 28, "question": "Any history of chest pain, palpitations, or swelling in the legs?" },
                     { "id": 29, "question": "Any cough, shortness of breath, or wheezing?" },
                     { "id": 30, "question": "Any nausea, vomiting, diarrhea, or constipation?" },
                     { "id": 31, "question": "Any joint pain, muscle aches, or weakness?" },
                     { "id": 32, "question": "Any headaches, dizziness, or numbness?" }
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
                         "answer": 'Miami beach'
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
                         "question": "Who is your insurance provider?",
                         "answer": "ABC Insurance"
                     },
                     {
                         "id": 8,
                         "question": "What is your insurance policy number?",
                         "answer": "123456789"
                     },
                     {
                         "id": 9,
                         "question": "What is your Policy Holder Name?",
                         "answer": "John Doe"
                     },
                     {
                         "id": 10,
                         "question": "What is your group number?",
                         "answer": "G123"
                     },
                     {
                         "id": 11,
                         "question": "Who is your primary care physician?",
                         "answer": "Dr. Smith"
                     },
                     {
                         "id": 12,
                         "question": "Please list any medications you are currently taking.",
                         "answer": "Medication A, Medication B"
                     },
                     {
                         "id": 13,
                         "question": "Do you have any allergies to medications, food, or other substances?",
                         "answer": "Penicillin"
                     },
                     {
                         "id": 14,
                         "question": "Do you have any chronic medical conditions?",
                         "answer": "Diabetes"
                     },
                     {
                         "id": 15,
                         "question": "Have you had any surgeries in the past?",
                         "answer": "Appendectomy"
                     },
                     {
                         "id": 16,
                         "question": "Is there any significant family medical history we should be aware of?",
                         "answer": "Heart disease"
                     },
                     {
                         "id": 17,
                         "question": "What brings you in today?",
                         "answer": "Persistent cough"
                     },
                     {
                         "id": 18,
                         "question": "Can you describe your symptoms in detail?",
                         "answer": "Cough with mucus, occasional fever"
                     },
                     {
                         "id": 19,
                         "question": "How long have you been experiencing these symptoms?",
                         "answer": "2 weeks"
                     },
                     {
                         "id": 20,
                         "question": "On a scale of 1 to 10, how severe are your symptoms?",
                         "answer": "7"
                     },
                     {
                         "id": 21,
                         "question": "Have you experienced these symptoms before?",
                         "answer": "No"
                     },
                     {
                         "id": 22,
                         "question": "Is there anything that makes the symptoms better or worse?",
                         "answer": "Worse with cold weather"
                     },
                     {
                         "id": 23,
                         "question": "What is your current occupation?",
                         "answer": "Engineer"
                     },
                     {
                         "id": 24,
                         "question": "Do you smoke, drink alcohol, or use recreational drugs?",
                         "answer": "No"
                     },
                     {
                         "id": 25,
                         "question": "How often do you exercise, and what does your diet typically consist of?",
                         "answer": "Exercise 3 times a week, balanced diet"
                     },
                     {
                         "id": 26,
                         "question": "Do you live alone, with family, or in another arrangement?",
                         "answer": "With family"
                     },
                     {
                         "id": 27,
                         "question": "Have you experienced any weight loss, fever, or fatigue recently?",
                         "answer": "No"
                     },
                     {
                         "id": 28,
                         "question": "Any history of chest pain, palpitations, or swelling in the legs?",
                         "answer": "No"
                     },
                     {
                         "id": 29,
                         "question": "Any cough, shortness of breath, or wheezing?",
                         "answer": "Cough"
                     },
                     {
                         "id": 30,
                         "question": "Any nausea, vomiting, diarrhea, or constipation?",
                         "answer": "No"
                     },
                     {
                         "id": 31,
                         "question": "Any joint pain, muscle aches, or weakness?",
                         "answer": "Joint pain"
                     },
                     {
                         "id": 32,
                         "question": "Any headaches, dizziness, or numbness?",
                         "answer": "Headaches occasionally"
                     }
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
                     { "id": 5, "question": "Who is your insurance provider?" },
                     { "id": 6, "question": "What is your insurance policy number?" },
                     { "id": 7, "question": "What is your Policy Holder Name?" },
                     { "id": 8, "question": "What is your group number?" },
                     { "id": 9, "question": "Who is your primary care physician?" },
                     { "id": 10, "question": "Please list any medications you are currently taking." },
                     { "id": 11, "question": "Do you have any allergies to medications, food, or other substances?" },
                     { "id": 12, "question": "Do you have any chronic medical conditions?" },
                     { "id": 13, "question": "Have you had any surgeries in the past?" },
                     { "id": 14, "question": "Is there any significant family medical history we should be aware of?" },
                     { "id": 15, "question": "What brings you in today?" },
                     { "id": 16, "question": "Can you describe your symptoms in detail?" },
                     { "id": 17, "question": "How long have you been experiencing these symptoms?" },
                     { "id": 18, "question": "On a scale of 1 to 10, how severe are your symptoms?" },
                     { "id": 19, "question": "Have you experienced these symptoms before?" },
                     { "id": 20, "question": "Is there anything that makes the symptoms better or worse?" },
                     { "id": 21, "question": "What is your current occupation?" },
                     { "id": 22, "question": "Do you smoke, drink alcohol, or use recreational drugs?" },
                     { "id": 23, "question": "How often do you exercise, and what does your diet typically consist of?" },
                     { "id": 24, "question": "Do you live alone, with family, or in another arrangement?" },
                     { "id": 25, "question": "Have you experienced any weight loss, fever, or fatigue recently?" },
                     { "id": 26, "question": "Any history of chest pain, palpitations, or swelling in the legs?" },
                     { "id": 27, "question": "Any cough, shortness of breath, or wheezing?" },
                     { "id": 28, "question": "Any nausea, vomiting, diarrhea, or constipation?" },
                     { "id": 29, "question": "Any joint pain, muscle aches, or weakness?" },
                     { "id": 30, "question": "Any headaches, dizziness, or numbness?" }
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
                         "question": "Who is your insurance provider?",
                         "answer": "ABC Insurance"
                     },
                     {
                         "id": 6,
                         "question": "What is your insurance policy number?",
                         "answer": "123456789"
                     },
                     {
                         "id": 7,
                         "question": "What is your Policy Holder Name?",
                         "answer": "John Doe"
                     },
                     {
                         "id": 8,
                         "question": "What is your group number?",
                         "answer": "G123"
                     },
                     {
                         "id": 9,
                         "question": "Who is your primary care physician?",
                         "answer": "Dr. Smith"
                     },
                     {
                         "id": 10,
                         "question": "Please list any medications you are currently taking.",
                         "answer": "Medication A, Medication B"
                     },
                     {
                         "id": 11,
                         "question": "Do you have any allergies to medications, food, or other substances?",
                         "answer": "Penicillin"
                     },
                     {
                         "id": 12,
                         "question": "Do you have any chronic medical conditions?",
                         "answer": "Diabetes"
                     },
                     {
                         "id": 13,
                         "question": "Have you had any surgeries in the past?",
                         "answer": "Appendectomy"
                     },
                     {
                         "id": 14,
                         "question": "Is there any significant family medical history we should be aware of?",
                         "answer": "Heart disease"
                     },
                     {
                         "id": 15,
                         "question": "What brings you in today?",
                         "answer": "Persistent cough"
                     },
                     {
                         "id": 16,
                         "question": "Can you describe your symptoms in detail?",
                         "answer": "Cough with mucus, occasional fever"
                     },
                     {
                         "id": 17,
                         "question": "How long have you been experiencing these symptoms?",
                         "answer": "2 weeks"
                     },
                     {
                         "id": 18,
                         "question": "On a scale of 1 to 10, how severe are your symptoms?",
                         "answer": "7"
                     },
                     {
                         "id": 19,
                         "question": "Have you experienced these symptoms before?",
                         "answer": "No"
                     },
                     {
                         "id": 20,
                         "question": "Is there anything that makes the symptoms better or worse?",
                         "answer": "Worse with cold weather"
                     },
                     {
                         "id": 21,
                         "question": "What is your current occupation?",
                         "answer": "Engineer"
                     },
                     {
                         "id": 22,
                         "question": "Do you smoke, drink alcohol, or use recreational drugs?",
                         "answer": "No"
                     },
                     {
                         "id": 23,
                         "question": "How often do you exercise, and what does your diet typically consist of?",
                         "answer": "Exercise 3 times a week, balanced diet"
                     },
                     {
                         "id": 24,
                         "question": "Do you live alone, with family, or in another arrangement?",
                         "answer": "With family"
                     },
                     {
                         "id": 25,
                         "question": "Have you experienced any weight loss, fever, or fatigue recently?",
                         "answer": "No"
                     },
                     {
                         "id": 26,
                         "question": "Any history of chest pain, palpitations, or swelling in the legs?",
                         "answer": "No"
                     },
                     {
                         "id": 27,
                         "question": "Any cough, shortness of breath, or wheezing?",
                         "answer": "Cough"
                     },
                     {
                         "id": 28,
                         "question": "Any nausea, vomiting, diarrhea, or constipation?",
                         "answer": "No"
                     },
                     {
                         "id": 29,
                         "question": "Any joint pain, muscle aches, or weakness?",
                         "answer": "Joint pain"
                     },
                     {
                         "id": 30,
                         "question": "Any headaches, dizziness, or numbness?",
                         "answer": "Headaches occasionally"
                     }
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
