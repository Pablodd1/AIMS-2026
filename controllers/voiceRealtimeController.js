const asyncHandler = require("express-async-handler");
const OpenAI = require("openai");

function getOpenAiKey() {
  return process.env.OPENAI_KEY || "";
}

// OpenAI Realtime API ephemeral token endpoint
// POST /api/v1/voice/realtime-token
// Returns: { client_secret: { value: "ek_...", expires_at: <unix_ts> } }
const getRealtimeToken = asyncHandler(async (req, res) => {
  try {
    // openai@4.52 has no beta.realtime, and /v1/realtime/sessions is retired.
    // Current endpoint: POST /v1/realtime/client_secrets -> { value: "ek_...", expires_at }
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: "Bearer " + getOpenAiKey(), "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: REALTIME_SYSTEM_PROMPT,
          tools: VOICE_FUNCTIONS,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe" },
              turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 200 },
            },
            output: { voice: "onyx" },
          },
        },
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      console.error("Realtime token error:", JSON.stringify(d).slice(0, 300));
      return res.status(r.status).json({ success: false, msg: (d.error && d.error.message) || "Realtime session unavailable" });
    }
    const value = d.value || (d.client_secret && d.client_secret.value);
    if (!value) return res.status(502).json({ success: false, msg: "No ephemeral token returned" });
    res.json({ client_secret: { value, expires_at: d.expires_at || null } });
  } catch (e) {
    console.error("Realtime token error:", e.message);
    res.status(500).json({ success: false, msg: e.message });
  }
});

// Function definitions for the Realtime agent
const VOICE_FUNCTIONS = [
  {
    type: "function",
    name: "search_patient",
    description: "Find a patient by name, phone, or email. Returns patient ID and basic info.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Patient name, phone number, or email to search" },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "get_patient_calendar",
    description: "Get appointments for a specific patient on a specific date.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "MongoDB ObjectId of the patient" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["patient_id", "date"],
    },
  },
  {
    type: "function",
    name: "schedule_appointment",
    description: "Create a new appointment for a patient.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "MongoDB ObjectId of the patient" },
        datetime: { type: "string", description: "ISO 8601 datetime, e.g. 2026-10-15T15:00:00" },
        timezone: { type: "string", description: "Patient's timezone, e.g. America/New_York" },
        clinic_name: { type: "string", description: "Clinic name" },
        phone: { type: "string", description: "Clinic phone number" },
      },
      required: ["patient_id", "datetime", "timezone", "clinic_name", "phone"],
    },
  },
  {
    type: "function",
    name: "start_medical_scribe",
    description: "Initiate a new medical scribe session / visit for a patient. Returns visit ID.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "MongoDB ObjectId of the patient" },
        visit_type: { type: "string", enum: ["initial", "followup", "reexam"], description: "Type of visit" },
        chief_complaint: { type: "string", description: "Reason for visit" },
      },
      required: ["patient_id", "visit_type", "chief_complaint"],
    },
  },
  {
    type: "function",
    name: "create_payment",
    description: "Record a payment for a patient.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "MongoDB ObjectId of the patient" },
        amount: { type: "number", description: "Payment amount in dollars" },
        method: { type: "string", enum: ["cash", "card", "check", "insurance", "other"], description: "Payment method" },
        note: { type: "string", description: "Optional note" },
      },
      required: ["patient_id", "amount", "method"],
    },
  },
  {
    type: "function",
    name: "get_patient_info",
    description: "Get full patient details including insurance, contacts, history.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "MongoDB ObjectId of the patient" },
      },
      required: ["patient_id"],
    },
  },
  {
    type: "function",
    name: "list_today_appointments",
    description: "Get all appointments for today for the current doctor.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" },
      },
      required: [],
    },
  },
];

const REALTIME_SYSTEM_PROMPT = `You are AIMS Tactical Clinical Assistant — an elite, calm, human-sounding voice executive aide ("professional soldier" demeanor) for physicians inside AIMS EHR.

CORE BEHAVIOR:
- Speak with calm, crisp, respectful military-executive clarity ("Copy that, Doctor.", "Understood.", "Standing by."). Concise, warm, and deeply human — never robotic or wordy.
- Match the doctor's language automatically (English, Spanish, or Haitian Creole).
- Listen to FULL, long, multi-sentence requests before acting. Do not interrupt or act on partial utterances.
- Extract patient names, DOB, phone numbers, dates, times, and multi-step intents from natural speech.
- ALWAYS CONFIRM before irreversible mutating operations (schedule, payment, live SMS blast, delete).
- Summarize crisply: "Copy that — schedule John Smith for Thursday at 3:00 PM. Confirm?"
- Only execute mutating ops after explicit confirmation ("yes", "confirm", "go ahead", "execute").

AVAILABLE OPERATIONS:
1. Search patient by name/phone/email
2. View patient calendar for a date
3. Schedule appointment (needs: patient, datetime, clinic info)
4. Start medical scribe/visit (needs: patient, visit type, chief complaint)
5. Record payment (needs: patient, amount, method)
6. Get full patient details
7. List today's appointments

CONFIRMATION PATTERN:
User: "Schedule John Smith for Thursday 3pm"
You: "I found John Smith (DOB 1980-05-12). Schedule appointment for Thursday, October 15 at 3:00 PM at Innovative Medical Wellness? Say 'confirm' to proceed."
User: "Confirm"
You: [calls schedule_appointment]

PATIENT IDENTIFICATION:
- If user says a name, ALWAYS search_patient first to get the ObjectId
- Never assume patient IDs; always resolve via search
- If multiple matches, ask user to clarify

DATE/TIME HANDLING:
- Convert relative dates ("Thursday", "tomorrow", "next week") to YYYY-MM-DD
- Assume user's clinic timezone (America/New_York) unless specified
- Confirm the resolved date/time with user

ERROR HANDLING:
- If function fails, explain clearly and ask how to proceed
- Never hallucinate function results; only report what the function returns`;

module.exports = { getRealtimeToken, VOICE_FUNCTIONS, REALTIME_SYSTEM_PROMPT };