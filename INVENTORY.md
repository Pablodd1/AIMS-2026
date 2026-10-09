# AIMS-2026 — Complete System Inventory & Handoff

**Generated:** 2026-10-09 · **Repo:** `Pablodd1/AIMS-2026` (private) · **Branch:** `main`
**Purpose:** Everything in one place — every file, every feature, what works, what was broken, what was fixed, and what still needs attention — so the system can be reviewed and fixed from any machine.

---

## 0. TL;DR — read this first

- AIMS = the EHR + AI assistant that runs **Innovative Medical Wellness, Miami**. Live at **https://aimedicalscriber.com**. Backend runs on a Hostinger VPS (`147.93.47.17`), not serverless.
- **2026-10-09 — the "Failed to generated transcription" bug was root-caused and FIXED live:** a masked OpenAI key placeholder (`sk-pro...`) had overwritten the real key during the Oct 6 MongoDB migration. Real key restored to both config files; verified end-to-end with a real speech round-trip.
- The live server had **17 files newer than this repo** (hotfixes made directly on the server, never committed). All 17 are now committed here (commit `0265865`).
- The live server does **not** yet have the Voice Realtime feature (this repo does — commit `c5d9431`). Deploy when ready (§8).
- Everything is pushed to GitHub — this document is the single review entry point. Start at §6 (status board) and §10 (fix list).
- **Full file list:** Appendix B (all 512 tracked files). **Full API:** Appendix A (all 182 routes).

---

## 1. Repositories & where everything lives

| What | Where |
|---|---|
| **Backend (this repo)** | GitHub `Pablodd1/AIMS-2026` — live clone on VPS at `/home/aims/aims-backend-node.js` (pm2 process `aims-backend`, port 4000) |
| **Frontend (React build)** | GitHub `Pablodd1/aims-frontend-build` — local copy `/home/jasme/aims-source/frontend/aims-frontend-main`; deployed to VPS web root |
| **Patient portal (static)** | VPS `/home/aims/patient-portal`, served by nginx `^~` patient routes on `www.aimedicalscriber.com` |
| **OpenAI proxy (agents + monitor)** | VPS `/home/aims/openai-proxy` (port 3456; serves agent routes + monitor WS) |
| **Messaging service** | VPS `/home/aims/messaging` (systemd `aims-messaging`, port 3457) |
| **Payments bridge (GoDaddy terminal)** | VPS `/home/aims/payments` (systemd `aims-payments`, port 3458) → POSTs to backend `/api/internal/terminal-payment` |
| **Backups** | VPS `/home/aims/backups/` — nightly 2:30 AM, 7-day retention (`scripts/backup_run.sh` + `scripts/backup_dump.js` in this repo) |
| **Local working copy (WSL)** | `/home/jasme/aims-2026-work` |

---

## 2. Live server topology (VPS `147.93.47.17`, verified 2026-10-09)

- **nginx:** `aimedicalscriber.com` + `www` → API proxied to :4000, patient routes served from `/home/aims/patient-portal`, proxy routes to :3456. `aiscribers.com` = legacy vhost.
- **pm2:** `aims-backend` (port 4000, cwd `/home/aims/aims-backend-node.js`). **systemd:** `aims-messaging` (:3457), `aims-payments` (:3458), openai-proxy (:3456).
- **VPS crontab** (all clinic automation is server-side — the local machine's jobs are intentionally paused):
  - `0 7 * * *` — daily schedule SMS: `GET /api/get/triggerDailySchedule`
  - `*/15 * * * *` — appointment reminders (24h + 2h, SMS+email): `GET /api/get/triggerAppointmentReminders`
  - `2:30 AM` — nightly Mongo dump + uploads archive (7-day retention)
  - `*/5 * * * *` — watchdog → Telegram notify (`vps_tg_notify.sh`)
  - kiosk sync (Google Sheets → EHR), restore drill, audit export (per ops setup)
- **Timezone:** the VPS clock is UTC; clinic dates are computed in America/New_York inside the code (`Helper/getLocalDates.js`).
- ⚠️ Re-verify with `crontab -l` / `systemctl list-units 'aims*'` when back — list above reflects the last verified state.

---

## 3. Fixes applied 2026-10-09 (root causes + evidence)

### 3.1 Transcription outage — FIXED & PROVEN
- **Symptom:** frontend "❌ Failed to generated transcription — error reading audio consultation".
- **Root cause:** on Oct 6 (Mongo migration day) a **masked placeholder** (`sk-pro...`, 13 chars) was written into the live configs. Every OpenAI call returned 401. Proven in `pm2 logs aims-backend`: `Incorrect API key provided: <redacted>`.
- **Fix:** restored the valid key (from `/root/.env.bak.20260909`) into:
  - `/home/aims/aims-backend-node.js/.env` → `OPENAI_KEY=...`
  - `/home/aims/aims-backend-node.js/ecosystem.config.js` → `OPENAI_KEY: '...'`
  - ⚠️ **Rule:** the pm2 ecosystem file hardcodes env values and **overrides `.env`** — always edit BOTH.
- **Evidence (live):**
  - `POST /api/get/transcription` → `{"response":true,"msg":"transcription generated"}`
  - TTS round-trip: generated speech ("Testing AIMS transcription, 1-2-3. Patient reports lower back pain for two weeks.") → transcribed back **exactly**.
- **Bonus:** the catch block in `legacyAiCompatController.getTranscription` now returns the underlying error (`Failed to generated transcription: <reason>`) so the next failure is diagnosable. Same patch applied to both local and live files.

### 3.2 Twilio auth token was truncated — fixed
- Live configs held a 24-char truncated token (invalid); replaced with the valid 32-char token in `.env` + `ecosystem.config.js`. **Not yet verified with a real SMS send** (§10).

### 3.3 openai-proxy OpenAI key placeholder — fixed
- `/home/aims/openai-proxy/.env` + its `ecosystem.config.js` both corrected; ecosystem parses cleanly.

### 3.4 Backups made before every change (VPS)
- `/home/aims/aims-backend-node.js/`: `.env.bak-20261009`, `ecosystem.config.js.bak-20261009`, `.env.bak-20261009b`, `ecosystem.config.js.bak-20261009b`, `controllers/legacyAiCompatController.js.bak-20261009`
- `/home/aims/openai-proxy/`: `.env.bak-20261009`, `ecosystem.config.js.bak-20261009`
- Working key backup on VPS: `/root/.env.bak.20260909` — **keep private** (chmod 600 recommended).

---

## 4. Repo ↔ live-server drift — history & current state

The live server and this repo had diverged:
- Live server was at commit `0ff625d7` **plus 17 uncommitted hotfix files** (edited directly on the server).
- This repo was ahead with local commits (`c5d9431` voice feature, `0ff625d7` scribe work, etc.).
- We diffed **all 84/86 tracked code files by md5 manifest** and line-by-line, then classified every difference (local-commits vs server-uncommitted vs local-uncommitted). Result: the live server was the **newer side for 17 files**; this repo was newer for `index.js` + the voice feature only.

**Resolution:** the 17 live-hotfix files are now committed in this repo as `0265865`. Repo `main` now equals the live server's working tree, plus the voice feature.

**The 17 files that were live-hotfixes (now in repo):**
`config/db.js`; `controllers/appointmentController.js`, `controllers/consentController.js`, `controllers/mailController.js`, `controllers/openaiController.js`, `controllers/patientController.js`, `controllers/Payment/matchLogic.js`, `controllers/Payment/terminalPaymentController.js`; `models/CheckNotes.js`, `models/Document.js`, `models/Feedback.js`, `models/Invoice.js`, `models/Patients.js`, `models/User.js`, `models/Visit.js`; `scripts/test_consent_context.js`, `scripts/verify_consent_context.js`.

What they brought: **wet-ink consent page + `providerSignedAt` provider countersign**; **Mongoose async pre-save hooks** (fixes the `next is not a function` crash → `assignTerminalPayment` 502 / "Unexpected token '<'"); **`invoiceOwner`** on terminal payments; `aimedicalscriber.com` links in emails; scribe **family-history prompt**; DB connection timeouts; consent test updates.

---

## 5. Repo file manifest — what every piece is

### Root
| File | What it is |
|---|---|
| `index.js` | Server entry. Registers **all 182 routes** (Appendix A), multer upload sets, CORS/body parsers, `/api/health`, SEO stub routes, and a last-resort `uncaughtException` guard (bad patient image uploads must not take the EHR down). Local commits ahead of live (voice routes added). |
| `AGENTS.md` | Binding rules for coding agents in this repo: GitHub code-review/verification gates, modern web quality (Core Web Vitals, a11y, SEO), conventional commits, CI gates. |
| `README.md` | High-level feature/endpoint overview (§“What AIMS Does”). |
| `DEVELOPER_CHANGELOG.md` | Changelog for the clinical-moat milestone (PI defense dossier, MSK ROM, re-exam report, billing audit; 2026-09-17). |
| `package.json` | Scripts: `start`, `dev`, `build` (=`node --check index.js`), `test`/`audit` (=`node scripts/jev-audit.mjs`). Deps include express, mongoose 5.12.9, openai, twilio ^5.3.1, nodemailer, docx, docxtemplater, pdfkit, puppeteer, @aws-sdk/*, multer, node-cron, redis/ioredis, qrcode, moment-timezone. |
| `vercel.json` | Legacy serverless config (site runs on VPS now — not used). |
| `skills-lock.json` | Lockfile for the agent skills installed under `.agents/skills/` (addyosmani, coderabbitai, vercel-labs). |
| `test.js` | Scratch script: sample unstructured SOAP note → docx demo (legacy). |
| `.gitignore` | Excludes `node_modules/`, `.env*`, `*.log`, `*.bak*`, `.vercel`. |
| `uploads/` | Local upload temp dir (empty; live uploads go to VPS `/home/aims/uploads` + S3). |
| `backend/` | **STALE** Sep-18 duplicate (one orphaned file tree) — safe to delete. |
| `.agents/` | Historical record of the Sept multi-agent audit & remediation: `ORIGINAL_REQUEST.md` (audit briefs), `orchestrator/`, `orchestrator_2/` (task plans, `GATE_STATUS.md`, handoffs), reviewer/challenger/auditor/explorer notes, `worker_remediation_1`, `.agents/skills/` (13 installed agent skills). |
| `.github/workflows/jev-monitor.yml` | CI: **Jev** error-monitor audit (`scripts/jev-audit.mjs`) — runs every 6h + on push; critical errors fail the workflow. |

### `config/`
- `db.js` — MongoDB connection (Atlas `aims-api-v1.sucji`, db_usr) + timeouts (recently hotfixed).
- `generateToken.js` — JWT signing helpers.
- `clinicalBaselines.js` — AMA Guides normal ROM values (cervical + lumbar).

### `constants/`
- `global.js` — shared constants.

### `Helper/`
- `billingAuditor.js` — deterministic chiropractic CPT audit (98940/41/42 downcoding + upcoding, M99.0x pairing guard).
- `romCalculator.js` — ROM deficit math, region normalization, ROM tables, pain-scale extraction, re-exam deltas. Pure, no I/O.
- `getLocalDates.js` — clinic-local date helpers (NY timezone).
- `makeDirectory.js` — fs helper.

### `middleware/`
- `authMiddleware.js` — `protect` (staff) + `patientAuth` (portal) JWT checks.
- `errorMiddleware.js` — error handling.
- `internalKey.js` — `requireInternalKey` for machine-to-machine routes (`/api/internal/*`).

### `models/` (15 Mongoose schemas)
`Appointment`, `Assistant`, `CheckNotes`, `Doctor`, `Document`, `FavoriteCode`, `Feedback`, `Invoice`, `LabResult`, `MedicalCode`, `NoteType`, `Patients`, `TerminalPayment`, `User`, `Visit` (Visit carries the clinical-moat fields: `personalInjuryDossier`, `rangeOfMotion`, `romAnalysis`, `auditResults`, red flags…). Seven of these were hotfixed (async pre-save hooks) and synced today.

### `controllers/` — root files
| File | Role |
|---|---|
| `adminController.js` | Admin login + admin account operations. |
| `appointmentController.js` | Appointments CRUD / calendar / status / filters; patient email confirm-cancel-reschedule; reminder trigger; appointment report. |
| `audioNotesController.js` | Save transcription to a visit (audio-note persistence). |
| `consentController.js` | Consent submit (wet-ink photo), list, forms registry; SHA-256 text verification; provider countersign (`providerSignedAt`). |
| `consentForms.js` | **Generated** canonical consent texts (4 forms: PRP, IV Exosomes/Stem Cells, Peptide, TPI) keyed by version — “what the patient reads is what gets stored”. Regenerated by `scripts/genConsentForms.js`. |
| `ehrController.js` | AdvanceMD external-EHR API **scaffold** (placeholder key — not wired). |
| `feedbackController.js` | Patient feedback submit / fetch / delete. |
| `labController.js` | Lab results CRUD + AI parsing + trends. |
| `legacyAiCompatController.js` | Legacy AI route set (assistants / threads / messages / runs, **transcription**, voiceIntake2.0) on chat.completions. `getTranscription` lives here (the route that was broken). |
| `localstorage.js` | Local upload storage router — `UPLOAD_ROOT = /home/aims/uploads`. |
| `mailController.js` | SMTP email (Nodemailer): confirmations, reminders, cancellations, daily schedule, QR codes, AgingBioHack outreach. |
| `medicalCodesController.js` | ICD-10/CPT seed + search / categories / custom codes / favorites / recent. |
| `noteTypeController.js` | Note-type definitions CRUD + default seed. |
| `notificationController.js` | Notification settings (≤3 phone numbers + daily-schedule toggle) + SMS. |
| `openaiController.js` | Clinical AI: `speechToText` (whisper-1), report-from-audio, **scribe notes w/ patient history** (family-history prompt), treatment suggestions, red-flag validation, Dx→CPT/ICD extraction, billing compliance, quality check, translate, interpret command, intake-image extraction, patient summary, `downloadNoteAsAudio` (TTS). |
| `patientController.js` | Patients CRUD, searches, import/export, voice intake, photo/data updates. |
| `patientPortalController.js` | Patient portal API — login, appointments, visit history (`patientAuth`). Static portal files on VPS `/home/aims/patient-portal`. |
| `testController.js` | One-off util endpoint (bulk `reportType` update) — legacy. |
| `userController.js` | Auth (`signin`, `createUser`, `me`), profiles, signatures, clinic branding, doctors/assistants, demo accounts, OpenAI key management. |
| `visitExportController.js` | Visit timeline + DOCX/PDF export (renders ROM table vs AMA Guides). |
| `voiceRealtimeController.js` | **NEW (not yet on live server):** OpenAI Realtime voice assistant — token endpoint + tool endpoints. |
| `voiceRealtimeFunctions.js` | **NEW:** tool implementations for the voice assistant. |

### `controllers/` — subdirectories
- `AWS/` — `AwsClient.js`, `AwsController.js`, `PutObject.js`, `GetObject.js`, `DeleteObject.js` (S3 presigned URLs; HTTP-key + pagination fixes applied 2026-09).
- `CheckInOutNotes/` — `AddNote`, `CheckIn`, `DeleteNote`, `GetNotes`, `GetTodayCheckIns`, `NotesController` (kiosk check-in/out + notes).
- `Cloudinary/` — `cloudinay.js` (image uploads).
- `Documents/` — `Upload`, `GetDocuments`, `DeleteDocument`, `UpdateDocument`, `DocumentController` (patient documents + S3).
- `Downloads/` — `downloadController.js`, `reportDocx.js` (report downloads).
- `Invoice/` — `createInvoice`, `deleteInvoice`, `getAlIInvoices`, `getAllByStatus`, `getInvoiceAnalytics`, `getInvoiceById`, `invoiceStatus`, `updateInvoice`, `invoiceController`.
- `Payment/` — `matchLogic.js` (matches terminal payments by **`amount.subTotal`**, NOT total-with-surcharge), `paymentApplier.js`, `terminalPaymentController.js` (terminal payments + assign-to-invoice; `invoiceOwner`).
- `Twilio/` — `twilio.js` (SMS / WhatsApp sender).
- `Visits/` — `visitController.js` (visit CRUD + clinical moat: ROM analysis, billing audit, re-exam report).

### `scripts/`
- `backup_dump.js` + `backup_run.sh` — nightly Mongo dump + uploads archive to `/home/aims/backups`, 7-day retention.
- `genConsentForms.js` — regenerates `controllers/consentForms.js` from the frontend `/consent/` page (bump version when text changes).
- `jev-audit.mjs` — CI error-monitor (TypeSafe Jev + heuristics; Resend/Webhook alerts).
- `repair_consent_context.js` — consent data repair.
- `test_consent_context.js` / `verify_consent_context.js` — consent E2E checks.

### `tests/`
- `clinical_moat_suite.js` — 19 assertions: ROM math, billing audit triggers, re-exam deltas, pain-scale extraction.

### `seed/`, `prompt/`, `Template/`, `pdfs/`, `public/`
- `seed/seed-medical-codes.js` — ICD-10/CPT seed data.
- `prompt/prompt.js` — AI prompt templates.
- `Template/` — `Appointments`, `Patients`, `agingBioHack` docx/email templates.
- `pdfs/`, `public/` — static + docx assets (`daily-schedule-settings.html`, report templates, `supplements.csv`, …).

---

## 6. Feature status board

### ✅ LIVE & WORKING (all on the production server)
| Feature | Detail |
|---|---|
| **Scribe / transcription** | Audio upload → transcription (`gpt-4o-mini-transcribe`, fallback whisper-1 route) → AI note with patient history → pre-sign audit → sign → DOCX/PDF export. **Fixed & verified today.** |
| **AI clinical suite** | Notes w/ history, treatment suggestions, red-flag validation, Dx→CPT/ICD-10 extraction, billing compliance, quality check, translation, command interpretation, intake-image extraction, note TTS audio. |
| **Consent** | 4 forms (PRP, IV-Exo/Stem, Peptide, TPI), wet-ink signing page, provider countersign live (`providerSignedAt`), SHA-256 text registry; test scripts in `scripts/`. |
| **Payments** | GoDaddy terminal → bridge (:3458) → `/api/internal/terminal-payment` (internal key) → matching by `amount.subTotal` → assign to invoice. `invoiceOwner` fix live. |
| **Appointments** | CRUD + calendar + statuses; 24h + 2h reminders (SMS+email) with confirm/cancel/reschedule links; daily schedule SMS 7AM; patient reschedule alerts the clinic. |
| **Patients** | Full CRUD, searches, import/export, voice intake, kiosk check-in/out (kiosk sync from Google Sheets runs on VPS cron). |
| **Documents** | S3 presigned upload/get/delete + query pagination; document records; new docs fall back to VPS `/home/aims/uploads`. |
| **Patient portal** | Login + appointments + visit history; static portal at `/home/aims/patient-portal`; patient links use `www.aimedicalscriber.com`. |
| **Invoices / Labs / Coding** | Invoice CRUD + analytics; lab results + trends; ICD-10/CPT seeded DB + custom/favorites/recent. |
| **Messaging** | Twilio SMS/WhatsApp + SMTP email (confirmations, reminders, cancellations, schedule). |
| **Infra** | Nightly backups, watchdog (*/5 → Telegram), Jev CI monitor, CodeRabbit review gates. |

### 🟡 BUILT — NOT YET ON LIVE SERVER
| Feature | Detail |
|---|---|
| **Voice Realtime assistant** | Commit `c5d9431`: `/api/v1/voice/*` (token + 8 tools: search patient, calendar, schedule, scribe, payment, info, today list). Frontend example: `frontend-voice-example.jsx` (import corrected to `@openai/agents-realtime`). Deploy per §8 when ready. |

### 🔴 NEEDS ATTENTION / TO FIX (the work list)
1. **openai-proxy MongoConfig points at the DEAD `e-store` cluster** (DNS dead since the Oct 6 migration) — repoint to Atlas (`aims-api-v1.sucji`) or disable DB use in the proxy. Affected: proxy features that touch Mongo.
2. **Stale, dangerous config templates on the VPS:** `/home/aims/ecosystem.config.js` + `/home/aims/write_ecosystem.py` contain the masked key placeholder + dead Mongo URI. Never start pm2 from those; fix or delete them.
3. **Stale duplicates to clean up on VPS:** `/home/aims/.docs/env.txt` (invalid key), `/home/aims/aims-demo-backend/.env` (key returns 401), `/root/backend/aims-backend-node.js-main/` (old copy). Keep `/root/.env.bak.20260909` (working key backup) safe.
4. **Twilio fix not yet verified by a real SMS** — trigger a test send when back.
5. **`.mp4` browser-recording upload path** — extension mapping exists (`mp4` ∈ AUDIO_EXTS) but the browser flow wasn't re-tested after the fix; verify from the app once.
6. **`POST /api/get/transcription` is unauthenticated** (legacy route set; deletes temp file in `finally`). Consider protecting.
7. **Delete stale `backend/` dir** in this repo.
8. **VPS clone is still at `0ff625d7`** — the voice feature + current main aren't live yet. Deploy per §8 when intended.

---

## 7. Credentials map — locations only (values never in this repo)

| Location | Holds |
|---|---|
| `/home/aims/aims-backend-node.js/.env` + `ecosystem.config.js` | `OPENAI_KEY` (**valid, restored today**), `JWTSECRET`, Mongo Atlas URI, Twilio SID/token (**fixed**), SMTP, AWS keys, `AIMS_INTERNAL_KEY`. ⚠️ Ecosystem OVERRIDES .env — edit BOTH. |
| `/home/aims/openai-proxy/.env` + ecosystem | OpenAI key (**fixed today**). |
| `/home/aims/messaging/.env`, `/home/aims/payments/.env` | Service-specific creds. |
| `/root/.env.bak.20260909` | Backup copy of the working OpenAI key. |
| `/home/aims/aims-demo-backend/.env`, `/home/aims/.docs/env.txt` | **Invalid/legacy** — do not use. |
| Local repo | No `.env` present (and gitignored). |

---

## 8. Runbook

### Run locally
```bash
cd <repo> && npm install
# create .env: MONGO URI, JWTSECRET, OPENAI_KEY, Twilio SID/auth, SMTP, AWS keys
npm start        # or: npm run dev
npm run build    # = node --check index.js
node tests/clinical_moat_suite.js
```

### Deploy repo → VPS (when intended — e.g. for voice feature)
```bash
ssh -i ~/.ssh/vps_key root@147.93.47.17
cd /home/aims/aims-backend-node.js
git fetch origin && git status          # server hotfixes are NOW COMMITTED upstream, safe to reset
git reset --hard origin/main
npm install                             # only if package.json changed
pm2 restart aims-backend
pm2 logs aims-backend --lines 100
```
Verify after deploy:
```bash
curl -s http://localhost:4000/api/health
curl -s -X POST http://localhost:4000/api/get/transcription -F "file=@test.mp3"   # expect {"response":true,...}
```

### Day-2 ops
- **Logs:** `pm2 logs aims-backend`; proxy/messaging/payments via `journalctl -u <unit>` or their dirs.
- **Restart:** `pm2 restart aims-backend` (never use `/home/aims/ecosystem.config.js` — stale).
- **Backups:** `/home/aims/backups/` (nightly 2:30 AM, 7-day retention). Restore drill scripts exist per ops docs.
- **Key rule:** any OpenAI key change → edit `.env` **and** `ecosystem.config.js`, then `pm2 restart`.

---

## 9. Verification ledger (what is proven vs not)

**Proven with live tool output (2026-10-09):**
- Transcription fixed: HTTP success + real-speech round-trip matched exactly.
- Key md5-identical across `.env` / `ecosystem.config.js` / backup; ecosystems parse; `node --check` clean on all touched files.
- Repo: all 512 tracked files enumerated (Appendix B); the 17-file sync verified byte-identical to the live copies; secret scan of the diff clean; **pushed to GitHub** (`main`: `0265865`, `564558d`, `40b44c1`).

**Not yet verified (do when back):**
- Live SMS send (Twilio token fixed but untested end-to-end).
- `.mp4` browser recording path.
- openai-proxy features that depend on Mongo (dead cluster).
- VPS has not yet been advanced past `0ff625d7`.

---

## Appendix A — Full HTTP route list (182 routes, from `index.js`)

```
POST /api/v1/auth/users/
POST /api/v1/auth/jwt/create/
GET /api/v1/auth/users/me
POST /api/post/updateProfile
POST /api/post/checkUserToken
GET /api/get/checkUserToken
POST /api/post/updatEmailredentials
POST /api/post/updatewebsiteURL
POST /api/post/setEmptyPic
POST /api/post/deletePatientHitory
POST /api/post/updatePassword
POST /api/post/sendQrCode
POST /api/post/setOpenAiKey
POST /api/post/updateNotificationSettings
GET /api/get/dailySchedule
POST /api/post/sendDailySchedule
GET /api/get/triggerDailySchedule
POST /api/post/addAssistant
POST /api/post/updateAssistant
GET /api/get/getAssistants
DELETE /api/delete/deleteAssistant
POST /api/post/addDoctor
GET /api/get/getDoctors
DELETE /api/delete/deleteDoctor
POST /api/post/updateDoctor
POST /api/post/createPatient
GET /api/get/getPatients
GET /api/get/getTodayPatients
GET /api/get/getPatientById
POST /api/post/updatePatient
GET /api/get/editReport
GET /api/get/getPaitentsCount
GET /api/get/getTodayPatietnsForAppointment
POST /api/post/addInstantPatient
POST /api/post/updateVoiceIntake
POST /api/post/searchPatientsByAlphabet
POST /api/post/searchPatientsByType
POST /api/post/searchPatientsByTypeAndLimit5
POST /api/post/searchPatientsGlobal
GET /api/get/exportAllPatients
POST /api/post/importPatients
POST /api/post/createLabResult
POST /api/post/uploadLabFile
GET /api/get/getLabResults
GET /api/get/getLabResultById
DELETE /api/delete/deleteLabResult
GET /api/get/exportLabResults
GET /api/get/getLabTrends
GET /api/get/getNoteTypes
GET /api/get/getNoteType
POST /api/post/createNoteType
PUT /api/put/updateNoteType
DELETE /api/delete/deleteNoteType
GET /api/get/getQuestionsForIntake
POST /api/post/createVisit
POST /api/post/signVisit
POST /api/post/preSignAudit
GET /api/get/viewReport
GET /api/get/getVists
GET /api/get/getAllVisits
DELETE /api/del/delVisit
POST /api/post/updateVisitDate
GET /api/get/recentVisit
POST /api/post/newReportMethodStoredIntoDb
POST /api/v1/visits/generate-reexam-report
GET /api/get/getRecentUsers
POST /api/post/v1/auth/jwt/create/admin
POST /api/post/sendFeedBack
GET /api/get/fetchFeedBack
POST /api/post/deleteFeedBackById
GET /api/get/fetchAllDoctors
GET /api/get/fetchAllAdmins
GET /api/get/test
GET /api/health
POST /api/get/fecthDemoAccounts
POST /api/get/demoUserCount
POST /api/post/createDemoUser
POST /api/post/updateSignature
POST /api/del/delSignature
POST /api/post/updateProfiePicture
POST /api/post/updateClinicLogo
POST /api/post/speechToText
POST /api/post/generateReportFromAudioFile
GET /api/get/noteTemplate
POST /api/post/noteTemplate
POST /api/post/speechToText/both
POST /api/post/extractPatientDataFromImage
POST /api/post/generateNoteWithHistory
POST /api/post/suggestTreatment
POST /api/post/validateRedFlags
POST /api/post/extractDxCptCodes
GET /api/get/downloadNoteAsAudio
POST /api/post/runQualityCheck
POST /api/post/translateToEnglish
POST /api/post/interpretCommand
GET /api/create/thread
POST /api/create/message
POST /api/create/run
POST /api/get/runStatus
GET /api/get/messages
POST /api/cancel/cancelRun
POST /api/post/testingNewReportMethod
POST /api/get/transcription
POST /api/post/newAssistant
POST /api/post/clearConversations
POST /api/openai/voiceIntake2.0
POST /api/post/searchMedicalCodes
GET /api/get/getCodeCategories
POST /api/post/addCustomCode
POST /api/post/updateCustomCode
POST /api/post/addFavoriteCode
POST /api/post/removeFavoriteCode
GET /api/get/getFavoriteCodes
GET /api/get/getRecentCodes
POST /api/post/runBillingCompliance
POST /api/post/extractIntakeEntities
POST /api/post/patientDataToSummary
POST /api/v1/voice/realtime-token
POST /api/v1/voice/search-patient
POST /api/v1/voice/patient-calendar
POST /api/v1/voice/schedule-appointment
POST /api/v1/voice/start-scribe
POST /api/v1/voice/create-payment
POST /api/v1/voice/patient-info
POST /api/v1/voice/today-appointments
POST /api/post/createAppointment
POST /api/get/getbyDateAppointment
POST /api/del/delAppointment
POST /api/edit/editAppTime
POST /api/post/changeStatus
POST /api/get/calenderDates
POST /api/post/filterAppointments
POST /api/post/userResponseFromEmail
GET /api/get/userResponseFromEmail
GET /api/get/triggerAppointmentReminders
GET /api/get/appointmentReport
GET /api/get/allAppointments
POST /api/post/uploadPDF
POST /api/get/getDocuments
DELETE /api/delete/deleteDocument
POST /api/post/updateDocumentDate
POST /api/post/makeInvoice
GET /api/get/getAllInvoices
POST /api/post/getInvoiceById
POST /api/post/getInvoiceAnalyitcs
POST /api/post/updateInvoice
DELETE /api/delete/deleteInvoice
POST /api/post/invoiceStatus
POST /api/internal/terminal-payment
GET /api/get/getTerminalPayments
GET /api/get/getUnmatchedPayments
POST /api/post/assignTerminalPayment
GET /api/get/getAllByStatus
GET /api/get/reportDocx
GET /api/get/reportPdf
GET /api/post/createQuickDocx
POST /api/post/reportDocxDirectDownload
POST /api/post/ameriarePatientDocument
POST /api/post/inspectionDownload
GET /api/get/getPatientVisits
GET /api/get/exportVisitDocx/:visitId
POST /api/post/patientLogin
GET /api/get/patientAppointments
GET /api/get/patientVisitHistory
GET /api/get/getSignedUrlForUpload
GET /api/get/getObject
DELETE /api/delete/deleteObject
GET /api/get/getNotes
POST /api/post/addNote
POST /api/post/checkIn
POST /api/post/submitConsent
GET /api/get/getConsents
GET /api/get/getConsentForms
GET /api/get/getTodayCheckIns
DELETE /api/delete/deleteNote/:id
POST /api/post/email/agingbiohack
GET /
GET /robots.txt
GET /sitemap.xml
GET /categories
GET /products
GET /contact
```

## Appendix B — Full tracked file list (512 files, from `git ls-files`)

```
.agents/ORIGINAL_REQUEST.md
.agents/auditor_1/BRIEFING.md
.agents/auditor_1/DISPATCH.md
.agents/auditor_1/audit_report.md
.agents/auditor_1/handoff.md
.agents/auditor_1/progress.md
.agents/auditor_1_m2/BRIEFING.md
.agents/auditor_1_m2/DISPATCH.md
.agents/auditor_1_m2/README.md
.agents/auditor_1_m2/handoff.md
.agents/auditor_1_m2/progress.md
.agents/auditor_1_m2/verify_integrity.js
.agents/challenger_1/BRIEFING.md
.agents/challenger_1/DISPATCH.md
.agents/challenger_1/challenge_report.md
.agents/challenger_1/handoff.md
.agents/challenger_1/progress.md
.agents/challenger_1_m2/BRIEFING.md
.agents/challenger_1_m2/DISPATCH.md
.agents/challenger_1_m2/README.md
.agents/challenger_1_m2/handoff.md
.agents/challenger_1_m2/progress.md
.agents/challenger_2/BRIEFING.md
.agents/challenger_2/DISPATCH.md
.agents/challenger_2/challenge_report.md
.agents/challenger_2/handoff.md
.agents/challenger_2/progress.md
.agents/challenger_2_m2/BRIEFING.md
.agents/challenger_2_m2/DISPATCH.md
.agents/challenger_2_m2/README.md
.agents/challenger_2_m2/handoff.md
.agents/challenger_2_m2/progress.md
.agents/explorer_survey_1/BRIEFING.md
.agents/explorer_survey_1/DISPATCH.md
.agents/explorer_survey_1/handoff.md
.agents/explorer_survey_1/progress.md
.agents/explorer_survey_1/survey_report.md
.agents/explorer_survey_1_m2/BRIEFING.md
.agents/explorer_survey_1_m2/DISPATCH.md
.agents/explorer_survey_1_m2/README.md
.agents/explorer_survey_1_m2/handoff.md
.agents/explorer_survey_1_m2/progress.md
.agents/explorer_survey_2/BRIEFING.md
.agents/explorer_survey_2/DISPATCH.md
.agents/explorer_survey_2/handoff.md
.agents/explorer_survey_2/progress.md
.agents/explorer_survey_2/survey_report.md
.agents/explorer_survey_2_m2/BRIEFING.md
.agents/explorer_survey_2_m2/DISPATCH.md
.agents/explorer_survey_2_m2/README.md
.agents/explorer_survey_2_m2/handoff.md
.agents/explorer_survey_2_m2/progress.md
.agents/explorer_survey_3/BRIEFING.md
.agents/explorer_survey_3/DISPATCH.md
.agents/explorer_survey_3/handoff.md
.agents/explorer_survey_3/progress.md
.agents/explorer_survey_3/survey_report.md
.agents/explorer_survey_3_m2/BRIEFING.md
.agents/explorer_survey_3_m2/DISPATCH.md
.agents/explorer_survey_3_m2/README.md
.agents/explorer_survey_3_m2/handoff.md
.agents/explorer_survey_3_m2/progress.md
.agents/orchestrator/BRIEFING.md
.agents/orchestrator/DISPATCH.md
.agents/orchestrator/GATE_STATUS.md
.agents/orchestrator/PROJECT.md
.agents/orchestrator/README.md
.agents/orchestrator/handoff.md
.agents/orchestrator/progress.md
.agents/orchestrator_2/BRIEFING.md
.agents/orchestrator_2/DISPATCH.md
.agents/orchestrator_2/GATE_STATUS.md
.agents/orchestrator_2/PROJECT.md
.agents/orchestrator_2/README.md
.agents/orchestrator_2/handoff.md
.agents/orchestrator_2/plan.md
.agents/orchestrator_2/progress.md
.agents/reviewer_1/BRIEFING.md
.agents/reviewer_1/DISPATCH.md
.agents/reviewer_1/handoff.md
.agents/reviewer_1/progress.md
.agents/reviewer_1/review_report.md
.agents/reviewer_1_m2/BRIEFING.md
.agents/reviewer_1_m2/DISPATCH.md
.agents/reviewer_1_m2/README.md
.agents/reviewer_1_m2/handoff.md
.agents/reviewer_1_m2/progress.md
.agents/reviewer_2/BRIEFING.md
.agents/reviewer_2/DISPATCH.md
.agents/reviewer_2/handoff.md
.agents/reviewer_2/progress.md
.agents/reviewer_2/review_report.md
.agents/reviewer_2/wcag_test.js
.agents/reviewer_2_m2/BRIEFING.md
.agents/reviewer_2_m2/DISPATCH.md
.agents/reviewer_2_m2/README.md
.agents/reviewer_2_m2/handoff.md
.agents/reviewer_2_m2/progress.md
.agents/sentinel/BRIEFING.md
.agents/sentinel/handoff.md
.agents/skills/accessibility/SKILL.md
.agents/skills/accessibility/references/A11Y-PATTERNS.md
.agents/skills/accessibility/references/WCAG.md
.agents/skills/autofix/SKILL.md
.agents/skills/autofix/github.md
.agents/skills/best-practices/SKILL.md
.agents/skills/best-practices/references/SECURITY.md
.agents/skills/code-review/SKILL.md
.agents/skills/code-review/references/auth-recovery.md
.agents/skills/code-review/references/cli-workflows.md
.agents/skills/core-web-vitals/SKILL.md
.agents/skills/core-web-vitals/references/CLS.md
.agents/skills/core-web-vitals/references/INP.md
.agents/skills/core-web-vitals/references/LCP.md
.agents/skills/deploy-to-vercel/Archive.zip
.agents/skills/deploy-to-vercel/SKILL.md
.agents/skills/deploy-to-vercel/resources/deploy-codex.sh
.agents/skills/deploy-to-vercel/resources/deploy.sh
.agents/skills/performance/SKILL.md
.agents/skills/performance/references/MEASUREMENT.md
.agents/skills/performance/references/RUM.md
.agents/skills/seo/SKILL.md
.agents/skills/seo/references/STRUCTURED-DATA.md
.agents/skills/vercel-composition-patterns/AGENTS.md
.agents/skills/vercel-composition-patterns/README.md
.agents/skills/vercel-composition-patterns/SKILL.md
.agents/skills/vercel-composition-patterns/rules/_sections.md
.agents/skills/vercel-composition-patterns/rules/_template.md
.agents/skills/vercel-composition-patterns/rules/architecture-avoid-boolean-props.md
.agents/skills/vercel-composition-patterns/rules/architecture-compound-components.md
.agents/skills/vercel-composition-patterns/rules/patterns-children-over-render-props.md
.agents/skills/vercel-composition-patterns/rules/patterns-explicit-variants.md
.agents/skills/vercel-composition-patterns/rules/react19-no-forwardref.md
.agents/skills/vercel-composition-patterns/rules/state-context-interface.md
.agents/skills/vercel-composition-patterns/rules/state-decouple-implementation.md
.agents/skills/vercel-composition-patterns/rules/state-lift-state.md
.agents/skills/vercel-optimize/AGENTS.md
.agents/skills/vercel-optimize/CONTRIBUTING.md
.agents/skills/vercel-optimize/README.md
.agents/skills/vercel-optimize/SKILL.md
.agents/skills/vercel-optimize/lib/auth-route.mjs
.agents/skills/vercel-optimize/lib/budget-summary.mjs
.agents/skills/vercel-optimize/lib/citations.mjs
.agents/skills/vercel-optimize/lib/cost-coverage.mjs
.agents/skills/vercel-optimize/lib/dedup-recs.mjs
.agents/skills/vercel-optimize/lib/deep-dive.mjs
.agents/skills/vercel-optimize/lib/display-labels.mjs
.agents/skills/vercel-optimize/lib/extract-claims.mjs
.agents/skills/vercel-optimize/lib/framework-support.mjs
.agents/skills/vercel-optimize/lib/gates/build-minutes-fanout.mjs
.agents/skills/vercel-optimize/lib/gates/cold-start.mjs
.agents/skills/vercel-optimize/lib/gates/contract.mjs
.agents/skills/vercel-optimize/lib/gates/cwv-poor.mjs
.agents/skills/vercel-optimize/lib/gates/external-api-slow.mjs
.agents/skills/vercel-optimize/lib/gates/hard-gates.mjs
.agents/skills/vercel-optimize/lib/gates/index.mjs
.agents/skills/vercel-optimize/lib/gates/isr-overrevalidation.mjs
.agents/skills/vercel-optimize/lib/gates/middleware-heavy.mjs
.agents/skills/vercel-optimize/lib/gates/observability-events-attribution.mjs
.agents/skills/vercel-optimize/lib/gates/platform-bot-protection.mjs
.agents/skills/vercel-optimize/lib/gates/platform-fluid-compute.mjs
.agents/skills/vercel-optimize/lib/gates/region-misconfig.mjs
.agents/skills/vercel-optimize/lib/gates/route-errors.mjs
.agents/skills/vercel-optimize/lib/gates/scanner-driven.mjs
.agents/skills/vercel-optimize/lib/gates/select-candidates.mjs
.agents/skills/vercel-optimize/lib/gates/slow-route.mjs
.agents/skills/vercel-optimize/lib/gates/types.d.ts
.agents/skills/vercel-optimize/lib/gates/uncached-route.mjs
.agents/skills/vercel-optimize/lib/gates/usage-spike-triage.mjs
.agents/skills/vercel-optimize/lib/grade-recommendation.mjs
.agents/skills/vercel-optimize/lib/impact-label.mjs
.agents/skills/vercel-optimize/lib/impact-magnitude.mjs
.agents/skills/vercel-optimize/lib/investigation-brief.mjs
.agents/skills/vercel-optimize/lib/observation-safety.mjs
.agents/skills/vercel-optimize/lib/project-facts.mjs
.agents/skills/vercel-optimize/lib/queries.mjs
.agents/skills/vercel-optimize/lib/reconcile-candidates.mjs
.agents/skills/vercel-optimize/lib/render-report.mjs
.agents/skills/vercel-optimize/lib/repo-root.mjs
.agents/skills/vercel-optimize/lib/route-normalize.mjs
.agents/skills/vercel-optimize/lib/sanitizers/bot-protection-certainty.mjs
.agents/skills/vercel-optimize/lib/sanitizers/cache-tag-invalidation-certainty.mjs
.agents/skills/vercel-optimize/lib/sanitizers/count-correct.mjs
.agents/skills/vercel-optimize/lib/sanitizers/function-duration-invocations.mjs
.agents/skills/vercel-optimize/lib/sanitizers/index.mjs
.agents/skills/vercel-optimize/lib/sanitizers/middleware-conflict.mjs
.agents/skills/vercel-optimize/lib/sanitizers/missing-citation.mjs
.agents/skills/vercel-optimize/lib/sanitizers/pre-release.mjs
.agents/skills/vercel-optimize/lib/sanitizers/rate-limit.mjs
.agents/skills/vercel-optimize/lib/sanitizers/rendering-mode-mislabel.mjs
.agents/skills/vercel-optimize/lib/sanitizers/undeclared-dep.mjs
.agents/skills/vercel-optimize/lib/sanitizers/vercel-directive-strip.mjs
.agents/skills/vercel-optimize/lib/sanitizers/window-units.mjs
.agents/skills/vercel-optimize/lib/scanners/cache-components-suspense-dedupe.mjs
.agents/skills/vercel-optimize/lib/scanners/edge-heavy-import.mjs
.agents/skills/vercel-optimize/lib/scanners/force-dynamic.mjs
.agents/skills/vercel-optimize/lib/scanners/headers-in-page.mjs
.agents/skills/vercel-optimize/lib/scanners/index.mjs
.agents/skills/vercel-optimize/lib/scanners/large-static-asset.mjs
.agents/skills/vercel-optimize/lib/scanners/max-age-without-s-maxage.mjs
.agents/skills/vercel-optimize/lib/scanners/middleware-broad-matcher.mjs
.agents/skills/vercel-optimize/lib/scanners/missing-cache-headers.mjs
.agents/skills/vercel-optimize/lib/scanners/prisma-include-tree.mjs
.agents/skills/vercel-optimize/lib/scanners/region-pin-in-config.mjs
.agents/skills/vercel-optimize/lib/scanners/source-maps-production.mjs
.agents/skills/vercel-optimize/lib/scanners/sveltekit-prerender-missing.mjs
.agents/skills/vercel-optimize/lib/scanners/turbo-force-bypass.mjs
.agents/skills/vercel-optimize/lib/scanners/unoptimized-image.mjs
.agents/skills/vercel-optimize/lib/scanners/use-cache-date-stamp.mjs
.agents/skills/vercel-optimize/lib/support-topics.mjs
.agents/skills/vercel-optimize/lib/throttle.mjs
.agents/skills/vercel-optimize/lib/util.mjs
.agents/skills/vercel-optimize/lib/vercel.mjs
.agents/skills/vercel-optimize/lib/verify-claim.mjs
.agents/skills/vercel-optimize/lib/workspace-resolver.mjs
.agents/skills/vercel-optimize/references/candidates.md
.agents/skills/vercel-optimize/references/data-collection.md
.agents/skills/vercel-optimize/references/docs-library.json
.agents/skills/vercel-optimize/references/doctrine.md
.agents/skills/vercel-optimize/references/observability-plus.md
.agents/skills/vercel-optimize/references/playbooks/README.md
.agents/skills/vercel-optimize/references/playbooks/ai-application.md
.agents/skills/vercel-optimize/references/playbooks/api-service.md
.agents/skills/vercel-optimize/references/playbooks/content-site.md
.agents/skills/vercel-optimize/references/playbooks/ecommerce.md
.agents/skills/vercel-optimize/references/playbooks/marketing.md
.agents/skills/vercel-optimize/references/playbooks/saas.md
.agents/skills/vercel-optimize/references/playbooks/sveltekit.md
.agents/skills/vercel-optimize/references/recommendations.md
.agents/skills/vercel-optimize/references/scanner-patterns.md
.agents/skills/vercel-optimize/references/scoring.md
.agents/skills/vercel-optimize/references/support-topics/README.md
.agents/skills/vercel-optimize/references/support-topics/astro-edge-middleware-scope.md
.agents/skills/vercel-optimize/references/support-topics/astro-output-mode-and-isr.md
.agents/skills/vercel-optimize/references/support-topics/auth-preserving-parallelization.md
.agents/skills/vercel-optimize/references/support-topics/bot-protection-product-guardrails.md
.agents/skills/vercel-optimize/references/support-topics/build-minutes-monorepo-fanout.md
.agents/skills/vercel-optimize/references/support-topics/cache-components-static-shell-boundaries.md
.agents/skills/vercel-optimize/references/support-topics/cache-components-suspense-dedupe-pitfall.md
.agents/skills/vercel-optimize/references/support-topics/cdn-cache-auth-safety.md
.agents/skills/vercel-optimize/references/support-topics/cold-start-initialization-bundle.md
.agents/skills/vercel-optimize/references/support-topics/core-web-vitals-client-bottlenecks.md
.agents/skills/vercel-optimize/references/support-topics/database-egress-pooling-region.md
.agents/skills/vercel-optimize/references/support-topics/dynamic-rendering-traps.md
.agents/skills/vercel-optimize/references/support-topics/external-api-critical-path-platform.md
.agents/skills/vercel-optimize/references/support-topics/external-api-critical-path.md
.agents/skills/vercel-optimize/references/support-topics/fast-data-transfer-payloads.md
.agents/skills/vercel-optimize/references/support-topics/fluid-compute-caveats.md
.agents/skills/vercel-optimize/references/support-topics/function-duration-io-and-after.md
.agents/skills/vercel-optimize/references/support-topics/function-invocation-reduction.md
.agents/skills/vercel-optimize/references/support-topics/function-region-misconfiguration-ttfb.md
.agents/skills/vercel-optimize/references/support-topics/image-optimization-cost-control.md
.agents/skills/vercel-optimize/references/support-topics/isr-revalidation-static-generation.md
.agents/skills/vercel-optimize/references/support-topics/middleware-proxy-edge-cost.md
.agents/skills/vercel-optimize/references/support-topics/next-fetch-revalidate-floor.md
.agents/skills/vercel-optimize/references/support-topics/next-font-cls-self-hosting.md
.agents/skills/vercel-optimize/references/support-topics/next-heavy-ui-lazy-load-boundaries.md
.agents/skills/vercel-optimize/references/support-topics/next-image-lcp-preload-sizes.md
.agents/skills/vercel-optimize/references/support-topics/next-route-handler-get-cache-defaults.md
.agents/skills/vercel-optimize/references/support-topics/next-script-third-party-strategy.md
.agents/skills/vercel-optimize/references/support-topics/nextjs-version-cache-semantics.md
.agents/skills/vercel-optimize/references/support-topics/not-found-catchall-request-waste.md
.agents/skills/vercel-optimize/references/support-topics/nuxt-route-rules-cache-isr.md
.agents/skills/vercel-optimize/references/support-topics/observability-events-cost-attribution.md
.agents/skills/vercel-optimize/references/support-topics/post-response-work-waituntil.md
.agents/skills/vercel-optimize/references/support-topics/route-error-durable-offload.md
.agents/skills/vercel-optimize/references/support-topics/route-error-runtime-limits.md
.agents/skills/vercel-optimize/references/support-topics/runtime-cache-reusable-data.md
.agents/skills/vercel-optimize/references/support-topics/sveltekit-isr-prerender-safety.md
.agents/skills/vercel-optimize/references/support-topics/sveltekit-split-cold-start-tradeoff.md
.agents/skills/vercel-optimize/references/support-topics/usage-spike-triage.md
.agents/skills/vercel-optimize/references/support-topics/use-cache-date-stamp-isr-write-amplifier.md
.agents/skills/vercel-optimize/references/support-topics/use-cache-remote-shared-origin-data.md
.agents/skills/vercel-optimize/references/support-topics/workflow-resumable-stream-routes.md
.agents/skills/vercel-optimize/references/verification.md
.agents/skills/vercel-optimize/references/voice.md
.agents/skills/vercel-optimize/scripts/budget-summary.mjs
.agents/skills/vercel-optimize/scripts/build-docs.mjs
.agents/skills/vercel-optimize/scripts/check-citations.mjs
.agents/skills/vercel-optimize/scripts/check-docs-fresh.mjs
.agents/skills/vercel-optimize/scripts/collect-signals.mjs
.agents/skills/vercel-optimize/scripts/collect-sub-agent-outputs.mjs
.agents/skills/vercel-optimize/scripts/deep-dive.mjs
.agents/skills/vercel-optimize/scripts/gate-investigations.mjs
.agents/skills/vercel-optimize/scripts/merge-signals.mjs
.agents/skills/vercel-optimize/scripts/prepare-investigation-brief.mjs
.agents/skills/vercel-optimize/scripts/reconcile-candidates.mjs
.agents/skills/vercel-optimize/scripts/render-report.mjs
.agents/skills/vercel-optimize/scripts/scan-codebase.mjs
.agents/skills/vercel-optimize/scripts/verify-and-regen.mjs
.agents/skills/vercel-optimize/scripts/verify-finding.mjs
.agents/skills/vercel-react-best-practices/AGENTS.md
.agents/skills/vercel-react-best-practices/README.md
.agents/skills/vercel-react-best-practices/SKILL.md
.agents/skills/vercel-react-best-practices/rules/_sections.md
.agents/skills/vercel-react-best-practices/rules/_template.md
.agents/skills/vercel-react-best-practices/rules/advanced-effect-event-deps.md
.agents/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md
.agents/skills/vercel-react-best-practices/rules/advanced-init-once.md
.agents/skills/vercel-react-best-practices/rules/advanced-use-latest.md
.agents/skills/vercel-react-best-practices/rules/async-api-routes.md
.agents/skills/vercel-react-best-practices/rules/async-cheap-condition-before-await.md
.agents/skills/vercel-react-best-practices/rules/async-defer-await.md
.agents/skills/vercel-react-best-practices/rules/async-dependencies.md
.agents/skills/vercel-react-best-practices/rules/async-parallel.md
.agents/skills/vercel-react-best-practices/rules/async-suspense-boundaries.md
.agents/skills/vercel-react-best-practices/rules/bundle-analyzable-paths.md
.agents/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md
.agents/skills/vercel-react-best-practices/rules/bundle-conditional.md
.agents/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md
.agents/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md
.agents/skills/vercel-react-best-practices/rules/bundle-preload.md
.agents/skills/vercel-react-best-practices/rules/client-event-listeners.md
.agents/skills/vercel-react-best-practices/rules/client-localstorage-schema.md
.agents/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md
.agents/skills/vercel-react-best-practices/rules/client-swr-dedup.md
.agents/skills/vercel-react-best-practices/rules/js-batch-dom-css.md
.agents/skills/vercel-react-best-practices/rules/js-cache-function-results.md
.agents/skills/vercel-react-best-practices/rules/js-cache-property-access.md
.agents/skills/vercel-react-best-practices/rules/js-cache-storage.md
.agents/skills/vercel-react-best-practices/rules/js-combine-iterations.md
.agents/skills/vercel-react-best-practices/rules/js-early-exit.md
.agents/skills/vercel-react-best-practices/rules/js-flatmap-filter.md
.agents/skills/vercel-react-best-practices/rules/js-hoist-regexp.md
.agents/skills/vercel-react-best-practices/rules/js-index-maps.md
.agents/skills/vercel-react-best-practices/rules/js-length-check-first.md
.agents/skills/vercel-react-best-practices/rules/js-min-max-loop.md
.agents/skills/vercel-react-best-practices/rules/js-request-idle-callback.md
.agents/skills/vercel-react-best-practices/rules/js-set-map-lookups.md
.agents/skills/vercel-react-best-practices/rules/js-tosorted-immutable.md
.agents/skills/vercel-react-best-practices/rules/rendering-activity.md
.agents/skills/vercel-react-best-practices/rules/rendering-animate-svg-wrapper.md
.agents/skills/vercel-react-best-practices/rules/rendering-conditional-render.md
.agents/skills/vercel-react-best-practices/rules/rendering-content-visibility.md
.agents/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md
.agents/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md
.agents/skills/vercel-react-best-practices/rules/rendering-hydration-suppress-warning.md
.agents/skills/vercel-react-best-practices/rules/rendering-resource-hints.md
.agents/skills/vercel-react-best-practices/rules/rendering-script-defer-async.md
.agents/skills/vercel-react-best-practices/rules/rendering-svg-precision.md
.agents/skills/vercel-react-best-practices/rules/rendering-usetransition-loading.md
.agents/skills/vercel-react-best-practices/rules/rerender-defer-reads.md
.agents/skills/vercel-react-best-practices/rules/rerender-dependencies.md
.agents/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md
.agents/skills/vercel-react-best-practices/rules/rerender-derived-state.md
.agents/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md
.agents/skills/vercel-react-best-practices/rules/rerender-lazy-state-init.md
.agents/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md
.agents/skills/vercel-react-best-practices/rules/rerender-memo.md
.agents/skills/vercel-react-best-practices/rules/rerender-move-effect-to-event.md
.agents/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md
.agents/skills/vercel-react-best-practices/rules/rerender-simple-expression-in-memo.md
.agents/skills/vercel-react-best-practices/rules/rerender-split-combined-hooks.md
.agents/skills/vercel-react-best-practices/rules/rerender-transitions.md
.agents/skills/vercel-react-best-practices/rules/rerender-use-deferred-value.md
.agents/skills/vercel-react-best-practices/rules/rerender-use-ref-transient-values.md
.agents/skills/vercel-react-best-practices/rules/server-after-nonblocking.md
.agents/skills/vercel-react-best-practices/rules/server-auth-actions.md
.agents/skills/vercel-react-best-practices/rules/server-cache-lru.md
.agents/skills/vercel-react-best-practices/rules/server-cache-react.md
.agents/skills/vercel-react-best-practices/rules/server-dedup-props.md
.agents/skills/vercel-react-best-practices/rules/server-hoist-static-io.md
.agents/skills/vercel-react-best-practices/rules/server-no-shared-module-state.md
.agents/skills/vercel-react-best-practices/rules/server-parallel-fetching.md
.agents/skills/vercel-react-best-practices/rules/server-parallel-nested-fetching.md
.agents/skills/vercel-react-best-practices/rules/server-serialization.md
.agents/skills/web-design-guidelines/SKILL.md
.agents/skills/web-quality-audit/SKILL.md
.agents/skills/web-quality-audit/scripts/analyze.sh
.agents/victory_auditor/BRIEFING.md
.agents/victory_auditor/DISPATCH.md
.agents/victory_auditor/README.md
.agents/victory_auditor/handoff.md
.agents/victory_auditor/progress.md
.agents/victory_auditor_2/BRIEFING.md
.agents/victory_auditor_2/DISPATCH.md
.agents/victory_auditor_2/README.md
.agents/victory_auditor_2/handoff.md
.agents/victory_auditor_2/independent_victory_test.js
.agents/victory_auditor_2/progress.md
.agents/worker_remediation_1/BRIEFING.md
.agents/worker_remediation_1/DISPATCH.md
.agents/worker_remediation_1/README.md
.agents/worker_remediation_1/handoff.md
.agents/worker_remediation_1/progress.md
.agents/worker_report_compiler/BRIEFING.md
.agents/worker_report_compiler/DISPATCH.md
.agents/worker_report_compiler/handoff.md
.agents/worker_report_compiler/progress.md
.github/workflows/jev-monitor.yml
.gitignore
AGENTS.md
DEVELOPER_CHANGELOG.md
Helper/billingAuditor.js
Helper/getLocalDates.js
Helper/makeDirectory.js
Helper/romCalculator.js
README.md
Template/Appointments/appointmentCancelled.js
Template/Appointments/appointmentReminder.js
Template/Appointments/appointmentUpdate.js
Template/Appointments/appointmentcreated.js
Template/Appointments/appoitmentComplete.js
Template/Patients/addInstantPatient.js
Template/agingBioHack/contact.js
backend/aims-backend-node.js-main/controllers/visitExportController.js
backend/aims-backend-node.js-main/index.js
config/clinicalBaselines.js
config/db.js
config/generateToken.js
constants/global.js
controllers/AWS/AwsClient.js
controllers/AWS/AwsController.js
controllers/AWS/DeleteObject.js
controllers/AWS/GetObject.js
controllers/AWS/PutObject.js
controllers/CheckInOutNotes/AddNote.js
controllers/CheckInOutNotes/CheckIn.js
controllers/CheckInOutNotes/DeleteNote.js
controllers/CheckInOutNotes/GetNotes.js
controllers/CheckInOutNotes/GetTodayCheckIns.js
controllers/CheckInOutNotes/NotesController.js
controllers/Cloudinary/cloudinay.js
controllers/Documents/DeleteDocument.js
controllers/Documents/DocumentController.js
controllers/Documents/GetDocuments.js
controllers/Documents/UpdateDocument.js
controllers/Documents/Upload.js
controllers/Downloads/downloadController.js
controllers/Downloads/reportDocx.js
controllers/Invoice/createInvoice.js
controllers/Invoice/deleteInvoice.js
controllers/Invoice/getAlIInvoices.js
controllers/Invoice/getAllByStatus.js
controllers/Invoice/getInvoiceAnalytics.js
controllers/Invoice/getInvoiceById.js
controllers/Invoice/invoiceController.js
controllers/Invoice/invoiceStatus.js
controllers/Invoice/updateInvoice.js
controllers/Payment/matchLogic.js
controllers/Payment/paymentApplier.js
controllers/Payment/terminalPaymentController.js
controllers/Twilio/twilio.js
controllers/Visits/visitController.js
controllers/adminController.js
controllers/appointmentController.js
controllers/audioNotesController.js
controllers/consentController.js
controllers/consentForms.js
controllers/ehrController.js
controllers/feedbackController.js
controllers/labController.js
controllers/legacyAiCompatController.js
controllers/localstorage.js
controllers/mailController.js
controllers/medicalCodesController.js
controllers/noteTypeController.js
controllers/notificationController.js
controllers/openaiController.js
controllers/patientController.js
controllers/patientPortalController.js
controllers/testController.js
controllers/userController.js
controllers/visitExportController.js
controllers/voiceRealtimeController.js
controllers/voiceRealtimeFunctions.js
frontend-voice-example.jsx
index.js
middleware/authMiddleware.js
middleware/errorMiddleware.js
middleware/internalKey.js
models/Appointment.js
models/Assistant.js
models/CheckNotes.js
models/Doctor.js
models/Document.js
models/FavoriteCode.js
models/Feedback.js
models/Invoice.js
models/LabResult.js
models/MedicalCode.js
models/NoteType.js
models/Patients.js
models/TerminalPayment.js
models/User.js
models/Visit.js
package-lock.json
package.json
pdfs/file-1728558226867.pdf
prompt/prompt.js
public/americare.docx
public/daily-schedule-settings.html
public/fluff.docx
public/inspection.docx
public/old-inspec.docx
public/quickTemplate.docx
public/report-with-patient.docx
public/supplements.csv
public/template.docx
public/walk.docx
scripts/backup_dump.js
scripts/backup_run.sh
scripts/genConsentForms.js
scripts/jev-audit.mjs
scripts/repair_consent_context.js
scripts/test_consent_context.js
scripts/verify_consent_context.js
seed/seed-medical-codes.js
skills-lock.json
test.js
tests/clinical_moat_suite.js
vercel.json
```
