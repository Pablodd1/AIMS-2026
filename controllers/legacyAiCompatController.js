'use strict'
// Legacy AI compat layer — restores the 11 AI routes the AIMS frontend still calls
// under /aims-service2/*. The old service that owned them used OpenAI's Assistants
// API (threads/runs); OpenAI retired it (404), so this reimplements the exact same
// request/response contracts on chat.completions + a Mongo-backed thread store.
//
// Routes served (wired in index.js):
//   GET  /api/create/thread          POST /api/create/message      POST /api/create/run
//   POST /api/get/runStatus          GET  /api/get/messages        POST /api/cancel/cancelRun
//   POST /api/post/testingNewReportMethod
//   POST /api/get/transcription
//   POST /api/post/newAssistant      POST /api/post/clearConversations
//   POST /api/openai/voiceIntake2.0
const asyncHandler = require('express-async-handler')
const OpenAI = require('openai')
const { toFile } = require('openai')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const XLSX = require('xlsx')
const csv = require('csv-parser')

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })

const CHAT_MODEL = process.env.LEGACY_CHAT_MODEL || 'gpt-4o-mini'
const MAX_TURNS = 30 // messages of history sent to the model per run
const MAX_CHARS_PER_MSG = 20000

const chatThreads = () => mongoose.connection.db.collection('assistantChatThreads')
const newId = (prefix) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`
const secs = (d) => Math.floor(new Date(d || Date.now()).getTime() / 1000)
const cut = (s) => String(s == null ? '' : s).slice(0, MAX_CHARS_PER_MSG)
const removeNewlinesAndPlus = (input) => String(input).replace(/\n+/g, ' ').trim()

// multer names uploads "<field>-<ts>.<mimetype-subtype>" (uploads config in index.js); the
// subtype is often outside OpenAI's accepted audio list (octet-stream, x-m4a), and the API
// rejects by extension. Hand whisper a clean filename with a supported extension instead.
const AUDIO_EXTS = new Set(['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'])
function audioFileParam(file) {
    const mimeExt = String(file.mimetype || '').split('/')[1].toLowerCase()
    const nameExt = path.extname(file.originalname || '').slice(1).toLowerCase()
    const ext = AUDIO_EXTS.has(mimeExt) ? mimeExt : (AUDIO_EXTS.has(nameExt) ? nameExt : 'mp3')
    return toFile(fs.createReadStream(file.path), `audio.${ext}`, { type: file.mimetype || 'audio/mpeg' })
}

const CHAT_SYSTEM_PROMPT = `You are AIMS, the clinical AI assistant inside a chiropractic and functional-medicine EHR, talking to licensed providers and their staff.
- Answer medical and clinical questions (conditions, medications, dosages, labs, treatment plans) accurately and concisely for a professional clinical audience.
- If you are not 100% sure of an answer, say "I don't know" instead of guessing.
- If the user asks you to change, update or rewrite a report that appears in this conversation, reply with ONLY the complete updated report text — keep the same structure and headings as the original, and return no introductions, no commentary, no markdown code fences.`

// ── Chat threads (Assistants-API compatible surface) ─────────────────────────

const createThread = asyncHandler(async (req, res) => {
    try {
        const id = newId('thread')
        await chatThreads().insertOne({ _id: id, messages: [], createdAt: new Date() })
        return res.json({ thread: { id, object: 'thread', created_at: secs() }, response: true })
    } catch (e) {
        console.error('createThread:', e.message)
        return res.json({ response: false })
    }
})

const createMessage = asyncHandler(async (req, res) => {
    const { message, threadId } = req.body || {}
    if (!threadId) return res.json({ msg: 'Povide thread Id', response: false })
    if (!message) return res.json({ msg: 'Invalid message', response: false })
    try {
        const r = await chatThreads().updateOne({ _id: String(threadId) }, {
            $push: { messages: { role: 'user', content: cut(message), at: new Date() } },
        })
        if (!r.matchedCount && !r.result.n) return res.json({ response: false })
        return res.json({ message: { id: newId('msg'), object: 'thread.message', role: 'user', content: [{ type: 'text', text: { value: cut(message) } }] }, response: true })
    } catch (e) {
        console.error('createMessage:', e.message)
        return res.json({ response: false })
    }
})

// Runs synchronously (old API queued; here the HTTP call covers generation, frontend
// polls get/runStatus afterwards and always sees 'completed').
const createRun = asyncHandler(async (req, res) => {
    const { threadId, assistantId } = req.body || {}
    if (!threadId) return res.json({ msg: 'No thread id provided', response: false })
    if (!assistantId) return res.json({ msg: 'No  assistant id provided', response: false })
    const runId = newId('run')
    try {
        const t = await chatThreads().findOne({ _id: String(threadId) })
        if (!t) return res.json({ response: false, msg: 'Thread not found' })
        const history = (t.messages || []).slice(-MAX_TURNS).map((m) => ({ role: m.role, content: cut(m.content) }))
        const completion = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history],
        })
        const reply = completion.choices[0].message.content || ''
        await chatThreads().updateOne({ _id: String(threadId) }, {
            $push: { messages: { role: 'assistant', content: reply, at: new Date() } },
        })
        return res.json({
            run: { id: runId, object: 'thread.run', thread_id: String(threadId), assistant_id: assistantId, status: 'completed' },
            response: true,
        })
    } catch (e) {
        console.error('createRun:', e.error ? e.error.message : e.message)
        return res.json({ response: false, msg: 'Failed to generate a response. Please try again.' })
    }
})

const getRunStatus = asyncHandler(async (req, res) => {
    const { runId } = req.body || {}
    return res.json({
        run: { id: runId || newId('run'), object: 'thread.run', status: 'completed' },
        response: true,
    })
})

const listMessages = asyncHandler(async (req, res) => {
    const { threadId } = req.query || {}
    if (!threadId) return res.json({ msg: 'Provide thread Id', response: false })
    try {
        const t = await chatThreads().findOne({ _id: String(threadId) })
        // OpenAI returns newest-first; the frontend reads body.data[0] as the answer.
        const data = ((t && t.messages) || []).slice().reverse().map((m) => ({
            id: newId('msg'),
            object: 'thread.message',
            created_at: secs(m.at),
            thread_id: String(threadId),
            role: m.role,
            content: [{ type: 'text', text: { value: m.content, annotations: [] } }],
        }))
        return res.json({
            list: { object: 'list', body: { object: 'list', data, first_id: data[0] && data[0].id, last_id: data[data.length - 1] && data[data.length - 1].id, has_more: false } },
            response: true,
        })
    } catch (e) {
        console.error('listMessages:', e.message)
        return res.json({ response: false })
    }
})

const cancelRun = asyncHandler(async (req, res) => {
    const { runId } = req.body || {}
    if (!runId) return res.json({ msg: 'No  run id provided', response: false })
    return res.json({ run: { id: runId, object: 'thread.run', status: 'cancelled' }, response: true })
})

// ── Notes / transcription / lab chat / voice intake ──────────────────────────

const testingNewReportMethod = asyncHandler(async (req, res) => {
    try {
        const { text, model, prompt } = req.body || {}
        if (!text || String(text).length < 100) {
            return res.status(200).json({ response: false, msg: 'Please upload a proper conversation this is too short for a detailed Medical Report.' })
        }
        const completion = await openai.chat.completions.create({
            model: typeof model === 'string' && model ? model : CHAT_MODEL,
            max_tokens: 3000,
            temperature: 0,
            messages: [
                { role: 'system', content: prompt || 'You are a professional medical scribe. Generate a detailed, structured medical report from the conversation provided.' },
                { role: 'user', content: String(text) },
            ],
        })
        return res.json({ success: true, notes: completion.choices[0].message.content, msg: 'Notes is ready' })
    } catch (e) {
        console.error('testingNewReportMethod:', e.error ? e.error.message : e.message)
        return res.json({ success: false, msg: 'Error in processing information' })
    }
})

const getTranscription = asyncHandler(async (req, res) => {
    if (!req.file) return res.json({ response: false, msg: 'File not uploaded.' })
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: await audioFileParam(req.file),
            model: 'whisper-1',
        })
        return res.json({ response: true, msg: 'transcription generated', transcription: removeNewlinesAndPlus(transcription.text) })
    } catch (e) {
        console.error('getTranscription:', e.error ? e.error.message : e.message)
        return res.json({ response: false, msg: 'Failed to generated transcription ' })
    } finally {
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {})
    }
})

// Lab-interpreter chat — conversation histories kept in memory per userId (same as the
// old service: a restart clears them), knowledge base = supplements.csv.
// ponytail: in-memory map + unbounded history, same ceilings as the old handler; move to
// Mongo + a token cap if lab chats ever need to survive restarts or run very long.
const labConversations = {}
let labKnowledgePromise = null

function loadLabKnowledge() {
    if (!labKnowledgePromise) {
        labKnowledgePromise = new Promise((resolve, reject) => {
            const results = []
            fs.createReadStream(path.join(process.cwd(), 'public', 'supplements.csv'))
                .pipe(csv())
                .on('data', (row) => results.push(row))
                .on('end', () => resolve(results))
                .on('error', reject)
        }).catch((e) => { labKnowledgePromise = null; throw e })
    }
    return labKnowledgePromise
}

const LAB_SYSTEM_PROMPT = `You are a functional medicine AI doctor specializing in blood panel analysis, disease correlation, and personalized supplement and peptide recommendations.
Interpret blood test results, identify abnormalities, and provide precise, personalized recommendations using the provided Disease-to-Product Cross-Reference Dataset as your sole knowledge base.
Your recommendations must include both supplements and peptides, complete with dosage, timing, and mechanism of action details.
Present your analysis clearly with visual summaries, charts, and a daily schedule.`

const labKnowledgeContext = (results) => `
      Context:
The user has uploaded a blood panel report.
The user has provided a Disease-to-Product Cross-Reference Dataset as the exclusive knowledge base.
Use ONLY the following products and data (including peptides and supplements) in your recommendations:
${JSON.stringify(results)}

The user wants a detailed functional medicine analysis with actionable steps, including lifestyle modifications.

What to Include:

Personalized Analysis:
- Provide an in-depth breakdown of each biomarker, including functional ranges, potential deficiencies, and the associated organ systems.
- Categorize biomarkers into optimal, suboptimal, or high-risk levels (using a color-coding system such as green, yellow, red).

Supplement & Peptide Recommendations:
- Always refer to the provided knowledge base for branded products, product lines, and peptide therapies.
- Clearly include peptide recommendations alongside supplements.
- Explain the link between each abnormal biomarker and the recommended supplement/peptide.
- Provide specific dosage, timing, and mechanism of action details for both peptides and supplements.

Visual & Actionable Summaries:
- Present clear charts or color-coded indicators for biomarker status.
- Layout a daily schedule (morning, afternoon, evening) for supplement and peptide intake.
- Suggest dietary adjustments and lifestyle modifications.
- Indicate when a follow-up consultation or referral is advised.

Output Format:
Structure your response in the following sections:
1. Summary of Blood Panel Findings
2. Detailed Biomarker Analysis & Functional Medicine Interpretation
3. Personalized Supplement & Peptide Recommendations (from the provided knowledge base)
4. Additional Health Insights & Next Steps

Incorporate:
- Exact dosage & timing for both supplement and peptide recommendations.
- Visual elements such as charts or color-coding (if possible) to indicate risk status.
- Citations or references if research or guidelines are quoted.
- A friendly tone and a disclaimer that these recommendations are educational and not a substitute for professional medical advice.

Blood Panel Report:`

const newAssistant = asyncHandler(async (req, res) => {
    const { userId, message } = req.body || {}
    const file = req.file

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, msg: 'A valid userId string is required' })
    }
    if (!message && !file) {
        return res.status(400).json({ success: false, msg: 'Send a valid message request' })
    }

    if (!labConversations[userId]) {
        labConversations[userId] = [{ role: 'system', content: LAB_SYSTEM_PROMPT }]
        try {
            const results = await loadLabKnowledge()
            if (results && results.length) labConversations[userId].push({ role: 'user', content: labKnowledgeContext(results) })
        } catch (e) {
            console.error('newAssistant supplements.csv:', e.message)
        }
    }

    try {
        if (file) {
            const ext = path.extname(file.originalname || '').toLowerCase()
            const dataBuffer = fs.readFileSync(file.path)
            let extractedText = ''
            if (ext === '.pdf') {
                extractedText = (await pdfParse(dataBuffer)).text
            } else if (ext === '.docx') {
                extractedText = (await mammoth.extractRawText({ buffer: dataBuffer })).value
            } else if (ext === '.xlsx' || ext === '.xls') {
                const workbook = XLSX.read(dataBuffer, { type: 'buffer' })
                workbook.SheetNames.forEach((sheetName) => {
                    extractedText += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]) + '\n'
                })
            } else {
                return res.status(400).json({ success: false, msg: 'Unsupported file format' })
            }
            labConversations[userId].push({ role: 'user', content: cut(extractedText) })
        } else {
            labConversations[userId].push({ role: 'user', content: cut(message) })
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: labConversations[userId],
        })
        const assistantReply = completion.choices[0].message.content
        labConversations[userId].push({ role: 'assistant', content: assistantReply })
        return res.json({ success: true, msg: assistantReply })
    } catch (error) {
        console.error('newAssistant OpenAI API Error:', error.error ? error.error.message : error.message)
        return res.status(500).json({ success: false, msg: 'Failed to fetch response from OpenAI' })
    } finally {
        if (file && file.path) {
            await fs.promises.unlink(file.path).catch((err) => console.error(`Error deleting file ${file.path}:`, err))
        }
    }
})

const clearConversations = asyncHandler(async (req, res) => {
    const userId = req.body && req.body.userId
    if (typeof userId !== 'string' || !userId) {
        return res.status(400).json({ success: false, msg: 'A valid userId string is required' })
    }
    if (labConversations[userId]) delete labConversations[userId]
    return res.json({ success: true, msg: 'Conversation history cleared successfully.' })
})

const voiceIntake2o = asyncHandler(async (req, res) => {
    const stepIndex = parseInt(req.body && req.body.stepIndex, 10)

    if (!req.file) {
        return res.json({ success: false, msg: 'File not uploaded.' })
    }

    let text = ''
    let success = false
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: await audioFileParam(req.file),
            model: 'whisper-1',
        })
        success = true
        text = removeNewlinesAndPlus(transcription.text)
    } catch (e) {
        console.error('voiceIntake2.0 transcribe:', e.error ? e.error.message : e.message)
        text = 'Failed to transcribe audio'
    } finally {
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {})
    }

    if (stepIndex === 8) {
        return res.json({ success: true, data: { comment: text } })
    }
    if (!success) {
        return res.json({ success: false, statusCode: 500, msg: text })
    }
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
        return res.json({ success: false, statusCode: 400, msg: 'Invalid stepIndex' })
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'Generate a structured JSON object containing user details.' },
                { role: 'user', content: text },
            ],
            response_format: steps[stepIndex],
        })
        if (!response || !response.choices || !response.choices[0]) {
            return res.json({ success: false, statusCode: 500, msg: 'Invalid response structure from AI model' })
        }
        return res.json({ success: true, data: JSON.parse(response.choices[0].message.content) })
    } catch (error) {
        console.error('voiceIntake2.0 extract:', error.error ? error.error.message : error.message)
        return res.json({ success: false, msg: error.message })
    }
})

module.exports = {
    createThread,
    createMessage,
    createRun,
    getRunStatus,
    listMessages,
    cancelRun,
    testingNewReportMethod,
    getTranscription,
    newAssistant,
    clearConversations,
    voiceIntake2o,
}

// ── Voice-intake 2.0 extraction schemas (verbatim from the old form2.0 service) ──
const onNotFound = "if not found data then pass Patient didn't answer that question."

const steps = [
//   step1
{
    type: 'json_schema',
    json_schema: {
      name: 'user_info',
      schema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: "User first name " + onNotFound },
          middleName: { type: 'string', description: 'User middle name ' + onNotFound },
          lastName: { type: 'string', description: 'User last name '+ onNotFound },
          dob: { type: 'string', description: 'Date of birth (YYYY-MM-DD) '+ onNotFound },
          gender: { type: 'string',enum: ['Male', 'Female'], description: 'Gender: Male/Female' },
          homePhone: { type: 'string', description: 'Home phone number '+ onNotFound },
          mobilePhone: { type: 'string', description: 'Mobile phone number '+ onNotFound },
          email: { type: 'string', description: "Email address if not found data then pass Patient didn't answer that question. "+ onNotFound },
          address1: { type: 'string', description: 'Primary address '+ onNotFound },
          address2: { type: 'string', description: 'Secondary address (optional) '+ onNotFound },
          city: { type: 'string', description: 'City '+ onNotFound },
          state: { type: 'string', description: 'State '+ onNotFound },
          zip: { type: 'string', description: 'Zip code '+ onNotFound },
          preferredContact: {
            type: 'string',
            enum: ['Mobile', 'Home', 'Email'],
            description: 'Preferred contact method: Mobile/Home/Email',
          },
        },
        required: ['firstName','middleName', 'lastName', 'dob', 'gender','homePhone','mobilePhone','email','address1','address2','city','state','zip', 'preferredContact'],
        additionalProperties: false,
      },
      strict: true,
    },
},
//   step2
{
    type: 'json_schema',
    json_schema: {
      name: 'insurance_info',
      schema: {
        type: 'object',
        properties: {
          insuranceProvider: { type: 'string', description: 'Insurance provider name '+ onNotFound },
          policyMemberId: { type: 'string', description: 'Policy/Member ID number '+ onNotFound },
          groupNumber: { type: 'string', description: 'Group number for insurance '+ onNotFound },
          policyHolderName: { type: 'string', description: 'Full name of the policyholder '+ onNotFound },
          policyHolderDob: { type: 'string', description: 'Policyholder date of birth (YYYY-MM-DD) '+ onNotFound },
          primaryCarePhysician: { type: 'string', description: 'Primary care physician name '+ onNotFound },
        },
        required: ['insuranceProvider', 'policyMemberId','groupNumber', 'policyHolderName', 'policyHolderDob','primaryCarePhysician'],
        additionalProperties: false,
      },
      strict: true,
    },
},
//   step3
{
    type: 'json_schema',
    json_schema: {
      name: 'medical_history',
      schema: {
        type: 'object',
        properties: {
          currentMedications: { type: 'string', description: 'List of current medications '+ onNotFound },
          allergies: { type: 'string', description: 'Name of known allergies, if applicable ' + onNotFound},
          chronicConditions: { type: 'string', description: 'Name of chronic conditions '+ onNotFound },
          pastSurgeries: { type: 'string', description: 'Past surgeries the patient has undergone '+ onNotFound },
          familyHistory: { type: 'string', description: 'Relevant family medical history '+ onNotFound },
        },
        required: ['currentMedications', 'allergies', 'chronicConditions', 'pastSurgeries', 'familyHistory'],
        additionalProperties: false,
      },
      strict: true,
    },
},
//   step4
{
    type: 'json_schema',
    json_schema: {
      name: 'visit_details',
      schema: {
        type: 'object',
        properties: {
          reasonForVisit: { type: 'string', description: 'Primary reason for the visit '+ onNotFound },
          symptomsDetail: { type: 'string', description: 'Details about symptoms '+ onNotFound },
          symptomsDuration: { type: 'string', description: 'Duration of symptoms (e.g., days, weeks, months) '+ onNotFound },
          symptomsSeverity: { type: 'string', description: 'Severity of symptoms (mild, moderate, severe)' },
          experiencedBefore: { type: 'string',enum: ['Yes', 'No'], description: 'Has the patient experienced these symptoms before? (Yes/No)' },
          symptomsBeforeWhen: { type: 'string', description: 'If experienced before, when did it occur? '+ onNotFound },
          symptomsAggravators: { type: 'string', description: 'Factors that worsen the symptoms '+ onNotFound },
        },
        required: ['reasonForVisit', 'symptomsDetail', 'symptomsDuration', 'symptomsSeverity','experiencedBefore','symptomsBeforeWhen','symptomsAggravators'],
        additionalProperties: false,
      },
      strict: true,
    },
},
//   step5
{
    type: 'json_schema',
    json_schema: {
      name: 'social_history',
      schema: {
        type: 'object',
        properties: {
          occupation: { type: 'string', description: 'Occupation '+ onNotFound },
          livingArrangement: { type: 'string', description: 'Living Arrangement (e.g., alone, with family, shared housing, etc.) '+ onNotFound },
          tobaccoUse: { type: 'string',enum: ['Yes', 'No'], description: 'Have you used tobacco in the last 30 days? (Yes/No)' },
          alcoholUse: { type: 'string',enum: ['Yes', 'No'], description: 'Do you consume alcohol? (Yes/No)' },
          recreationalDrugs: { type: 'string',enum: ['Yes', 'No'], description: 'Do you use recreational drugs? (Yes/No)' }
        },
        required: ['occupation', 'livingArrangement', 'tobaccoUse', 'alcoholUse', 'recreationalDrugs'],
        additionalProperties: false,
      },
      strict: true,
    },
},
//  step6
{
    type: 'json_schema',
    json_schema: {
      name: 'symptom_review',
      schema: {
        type: 'object',
        properties: {
          weightLossFeverFatigue: { type: 'string', description: 'Weight loss, fever, or fatigue '+ onNotFound },
          chestPainPalpitationsLegSwelling: { type: 'string', description: 'Chest pain, palpitations, or leg swelling '+ onNotFound },
          coughShortnessBreathWheezing: { type: 'string', description: 'Cough, shortness of breath, or wheezing ' + onNotFound},
          nauseaVomitingDiarrheaConstipation: { type: 'string', description: 'Nausea, vomiting, diarrhea, or constipation '+ onNotFound },
          jointPainMuscleAchesWeakness: { type: 'string', description: 'Joint pain, muscle aches, or weakness '+ onNotFound },
          headachesDizzinessNumbness: { type: 'string', description: 'Headaches, dizziness, or numbness '+ onNotFound }
        },
        required: [
          'weightLossFeverFatigue', 
          'chestPainPalpitationsLegSwelling', 
          'coughShortnessBreathWheezing', 
          'nauseaVomitingDiarrheaConstipation', 
          'jointPainMuscleAchesWeakness', 
          'headachesDizzinessNumbness'
        ],
        additionalProperties: false,
      },
      strict: true,
    },
},
// step7
{
   type: 'json_schema',
    json_schema: {
    "name": "health_wellness_assessment",
    "schema": {
      "type": "object",
      "properties": {
        "physicalActivity": { "type": "string", "description": "Physical activity level and routine "+ onNotFound },
        "nutrition": { "type": "string", "description": "Diet and nutrition habits "+ onNotFound },
        "seatBeltUse": { "type": "string",enum: ['Yes', 'No'], "description": "Does the person always fasten their seat belt in a car? (Yes/No)" },
        "depression": { "type": "string", "description": "Any signs or diagnosis of depression "+ onNotFound },
        "anxiety": { "type": "string", "description": "Any signs or diagnosis of anxiety "+ onNotFound },
        "stress": { "type": "string", "description": "Stress levels and coping mechanisms "+ onNotFound },
        "socialEmotionalSupport": { "type": "string", "description": "Level of social and emotional support "+ onNotFound },
        "pain": { "type": "string", "description": "Current pain levels and concerns "+ onNotFound },
        "generalHealth": { "type": "string", "description": "Overall general health assessment "+ onNotFound },
        "activitiesOfDailyLiving": { "type": "string", "description": "Ability to perform daily living activities " + onNotFound},
        "sleep": { "type": "string", "description": "Sleep quality and duration "+ onNotFound }
      },
      "required": [
        "physicalActivity",
        "nutrition",
        "seatBeltUse",
        "depression",
        "anxiety",
        "stress",
        "socialEmotionalSupport",
        "pain",
        "generalHealth",
        "activitiesOfDailyLiving",
        "sleep"
      ],
      "additionalProperties": false
    },
    "strict": true
  }
},
// step8
{
    type: 'json_schema',
    json_schema: {
        "name": "health_metrics",
        "schema": {
          "type": "object",
          "properties": {
            "bloodPressure": { "type": "string", "description": "Blood pressure reading (e.g., 120/80 mmHg) "+ onNotFound },
            "cholesterol": { "type": "string", "description": "Cholesterol levels (e.g., LDL, HDL, total cholesterol) "+ onNotFound },
            "bloodGlucose": { "type": "string", "description": "Blood glucose level (e.g., fasting or random glucose reading) "+ onNotFound },
            "height": { "type": "string", "description": "Height in cm or inches "+ onNotFound },
            "weight": { "type": "string", "description": "Weight in kg or lbs "+ onNotFound },
            "waistCircumference": { "type": "string", "description": "Waist circumference in cm or inches "+ onNotFound }
          },
          "required": [
            "bloodPressure",
            "cholesterol",
            "bloodGlucose",
            "height",
            "weight",
            "waistCircumference"
          ],
          "additionalProperties": false
        },
        "strict": true
      }
      
}
  

]

