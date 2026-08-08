# AIMS EHR — AI Smart Medical Assistant

**AIMS (AI Intelligent Medical System)** is a full-stack Electronic Health Record (EHR) platform with an integrated AI medical assistant. It runs the clinical practice of **Innovative Medical Wellness (Miami)** and is deployed at **https://aimedicalscriber.com**.

> Backend API (Node.js + Express + MongoDB). The frontend (React build) lives in the private repo `aims-frontend-build`.

---

## 🧠 What AIMS Does

### AI Clinical Assistant (OpenAI-powered)
| Feature | Endpoint |
|---|---|
| Speech-to-text transcription (Whisper) | `POST /api/post/speechToText`, `POST /api/post/speechToText/both` |
| AI-generated SOAP/consultation notes with patient history | `POST /api/post/generateNoteWithHistory` |
| Treatment plan suggestions | `POST /api/post/suggestTreatment` |
| Red-flag safety checks (scope of practice) | `POST /api/post/validateRedFlags` |
| Diagnosis → **CPT + ICD-10** code extraction | `POST /api/post/extractDxCptCodes` |
| Billing compliance audit | `POST /api/post/runBillingCompliance` |
| Quality check on generated notes | `POST /api/post/runQualityCheck` |
| Spanish → English translation | `POST /api/post/translateToEnglish` |
| Voice command interpretation | `POST /api/post/interpretCommand` |
| Extract patient data from intake images | `POST /api/post/extractPatientDataFromImage` |
| Consultation → patient summary | `POST /api/post/patientDataToSummary` |
| Note audio download (TTS) | `GET /api/get/downloadNoteAsAudio` |

### Medical Coding (ICD-10 + CPT)
- **Seeded database** of chiropractic-relevant ICD-10 codes (M99.x somatic dysfunction, M54.x back pain, M25.x joint pain, S13/S33 sprains, G43/G44 headaches, M47/M51/M62, etc.) and CPT codes (98940–98943 CMT, 97110/97112/97140 therapeutic, with RVUs).
- Search, categories, custom codes, favorites, recent codes:
  - `POST /api/post/searchMedicalCodes` · `GET /api/get/getCodeCategories` · `POST /api/post/addCustomCode` · `POST /api/post/addFavoriteCode` · `GET /api/get/getFavoriteCodes` · `GET /api/get/getRecentCodes`

### Patients & Visits
- Full CRUD: create, update, search (global/alphabet/type), today's patients, counts, import/export.
  - `POST /api/post/createPatient` · `GET /api/get/getPatients` · `POST /api/post/updatePatient` · `POST /api/post/searchPatientsGlobal` · `GET /api/get/exportAllPatients`
- Visits with intake questions, notes, reports (stored + exportable as DOCX/PDF):
  - `POST /api/post/createVisit` · `GET /api/get/getAllVisits` · `POST /api/post/newReportMethodStoredIntoDb` · `GET /api/get/exportVisitDocx/:visitId` · `GET /api/get/reportDocx` · `GET /api/get/reportPdf`
- Lab results & trends: `POST /api/post/createLabResult` · `GET /api/get/getLabTrends`

### Appointments & Calendar
- Create/update/delete/filter appointments, calendar dates, status changes, email/SMS confirmations & cancellations:
  - `POST /api/post/createAppointment` · `POST /api/get/getbyDateAppointment` · `POST /api/get/calenderDates` · `POST /api/post/changeStatus` · `POST /api/post/userResponseFromEmail` (patient confirms/cancels via email) · `GET /api/get/appointmentReport`
- **Daily schedule automation:** `GET /api/get/dailySchedule` · `POST /api/post/sendDailySchedule` · `GET /api/get/triggerDailySchedule` (sends next-day appointments via SMS/email).

### Messaging (Twilio + Email)
- `controllers/Twilio/twilio.js` — SMS/WhatsApp via Twilio.
- `controllers/mailController.js` — SMTP email (Nodemailer): confirmations, reminders, cancellations.
- Notifications: `POST /api/post/updateNotificationSettings`.

### Voice Intake
- Voice-driven patient intake (`POST /api/post/updateVoiceIntake`, `GET /api/get/getQuestionsForIntake`) — used by the kiosk and the voice-command frontend.

### Documents, Invoices, AWS
- Document upload (S3 signed URLs), PDF upload, DOCX generation (docxtemplater), invoices & analytics, QR codes.
- AWS: `controllers/AWS/` (S3 put/get/delete with presigned URLs).

### Admin & Users
- JWT auth (`POST /api/v1/auth/jwt/create/`), user profile, doctors, assistants, demo accounts, clinic branding (logo, signature, website URL), OpenAI key management, admin login.

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| API | Node.js + Express 4 |
| Database | MongoDB (Mongoose 5) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI | OpenAI API (GPT-4 chat, Whisper transcription) |
| Messaging | Twilio (SMS) + Nodemailer (email) |
| Files | AWS S3 + Cloudinary + multer |
| Docs | docxtemplater + mammoth + PizZip |
| Jobs | node-cron / cron |
| Scraping | Puppeteer |

---

## 🚀 Run Locally

```bash
npm install
# configure .env (MongoDB URI, JWT secret, OpenAI key, Twilio SID/auth, SMTP creds, AWS keys)
npm start        # or: npm run dev (nodemon)
```

## 📁 Structure

```
index.js                 # entry + all routes
config/                  # DB connection
models/                  # Mongoose schemas (Patients, Visit, Appointment, MedicalCode, ...)
controllers/             # business logic (EHR, OpenAI, Twilio, Mail, AWS, admin, ...)
middleware/              # auth + error handling
seed/                    # initial data
pdfs/ · public/          # static/template assets
prompt/                  # AI prompt templates
Helper/ · Template/      # helper utilities / docx templates
```

## 🔐 Notes

- **Scope of practice:** AI treatment suggestions and red-flag validation are designed for chiropractic practice; final clinical decisions remain with the treating doctor.
- CPT/ICD-10 seed data is chiropractic-focused; custom codes can be added via the API.
- This is a private medical system — never expose `.env` or patient data publicly.

---

© Innovative Medical Wellness · Miami, FL
