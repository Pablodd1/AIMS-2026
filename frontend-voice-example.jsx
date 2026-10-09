// AIMS Voice Realtime Integration Example
// Drop this in your frontend (React/Next.js) to connect to the voice assistant

import { RealtimeAgent, RealtimeSession } from "@openai/agents-realtime";

export async function startVoiceSession() {
  // 1. Get ephemeral token from your backend
  const tokenRes = await fetch("/api/v1/voice/realtime-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const { client_secret } = await tokenRes.json();

  // 2. Create the agent with your clinical instructions
  const agent = new RealtimeAgent({
    name: "AIMS Clinical Assistant",
    instructions: `You are AIMS Clinical Assistant — a voice-enabled EHR companion for healthcare providers.

CORE BEHAVIOR:
- Listen to the FULL conversation before acting. Do not execute on partial utterances.
- Extract patient names, dates, times, and intent from natural speech.
- ALWAYS CONFIRM before any mutating operation (schedule, payment, create visit).
- Summarize what you heard: "You want to schedule [Patient] for Thursday 3 PM. Confirm?"
- Only execute after explicit user confirmation ("yes", "confirm", "go ahead").

AVAILABLE OPERATIONS (via function calling):
1. search_patient — Find patient by name/phone/email
2. get_patient_calendar — View appointments for a patient on a date
3. schedule_appointment — Book new appointment (needs patient, datetime, clinic info)
4. start_medical_scribe — Initiate new visit/note (needs patient, visit type, chief complaint)
5. create_payment — Record payment (needs patient, amount, method)
6. get_patient_info — Full patient details
7. list_today_appointments — Today's schedule

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
- Confirm the resolved date/time with user`,
  });

  // 3. Connect to Realtime API
  const session = new RealtimeSession(agent, {
    model: "gpt-4o-realtime-preview-2024-12-17",
  });

  await session.connect({ apiKey: client_secret.value });

  // 4. Handle audio input/output
  session.on("audio", (audioData) => {
    // Play audio response through your audio element
    playAudio(audioData);
  });

  session.on("transcript", (transcript) => {
    console.log("User said:", transcript);
    // Update UI with conversation transcript
  });

  session.on("function_call", async (call) => {
    console.log("Function called:", call.name, call.arguments);
    // Functions execute automatically on backend
  });

  return session;
}

function playAudio(audioData) {
  // Implementation depends on your audio setup
  const audio = new Audio();
  audio.src = URL.createObjectURL(new Blob([audioData], { type: "audio/pcm" }));
  audio.play();
}

// Usage:
// const session = await startVoiceSession();
// session.disconnect() to end