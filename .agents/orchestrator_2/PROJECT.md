# Project: AIMS-2026 Healthcare Platform Optimization & Defect Remediation

## Architecture
The AIMS-2026 platform is a Node.js/Express and MongoDB/Mongoose healthcare system providing EHR management, AI clinical scribe capabilities (OpenAI Whisper & GPT-4o models), appointment scheduling, and clinical report generation (Puppeteer PDF & Docx).

### Core Components & Modules
- **Ingress & Routing (`index.js`)**: Monolithic Express application routing API requests, mounting authentication middleware (`protect`), and configuring Multer file upload pipelines.
- **Clinical AI & Scribing (`controllers/openaiController.js`, `Helper/jsonParser.js`)**: Audio transcription (Whisper), SOAP note generation, intake questionnaire parsing, and clinical red-flag triage.
- **Data Models (`models/`)**: Mongoose schemas defining clinical entities (`Patients`, `Appointment`, `Visit`, `MedicalCode`, etc.).
- **Clinical Encounter Records (`controllers/Visits/visitController.js`)**: Longitudinal visit records, SOAP note persistence, and clinical history queries.
- **Reporting & Document Export (`controllers/Downloads/reportDocx.js`)**: Puppeteer headless Chromium PDF conversion and Docx templating.
- **File Upload & Ingestion Pipelines (`controllers/patientController.js`, `controllers/labController.js`, `Helper/cleanup.js`)**: Multipart form processing, CSV patient imports, and lab diagnostic extractions.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1.1 Audio Routing Defect Fix | Repair `voiceMethod` in `controllers/openaiController.js` to return raw transcription for `quick-upload` without questionnaire parsing | M1 | ORIGINAL_REQUEST §R1.1 / Survey Explorer 1 | DONE |
| 2 | R1.2 Non-Destructive JSON Parser | Replace `.replace(/json/g, '')` with `extractAndParseJSON` in `Helper/jsonParser.js` across all AI and lab controllers | M1 | ORIGINAL_REQUEST §R1.2 / Survey Explorer 1 | DONE |
| 3 | R1.3 Red-Flag Safety Alerts | Decouple `validateRedFlags` into `evaluateRedFlags` and wire safety contraindication alerts into note generation responses | M1 | ORIGINAL_REQUEST §R1.3 / Survey Explorer 1 | DONE |
| 4 | R2.1 Patients Indexing | Add compound index `{ fullName: 1, phoneNumber: 1, email: 1 }`, `{ email: 1 }`, and `{ doc_id: 1, createdAt: -1 }` to `models/Patients.js` | M2 | ORIGINAL_REQUEST §R2.1 / Survey Explorer 2 | DONE |
| 5 | R2.2 Appointment Indexing | Add compound index `{ date: 1, status: 1 }` (sparse) and production indexes `{ doctorID: 1, time: 1, status: 1 }` and `{ doctorID: 1, status: 1 }` to `models/Appointment.js` | M2 | ORIGINAL_REQUEST §R2.2 / Survey Explorer 2 | DONE |
| 6 | R2.3 Visit Indexing | Add index `{ pId: 1, createdAt: -1 }` and canonical bridge `{ patientId: 1, visitDate: -1 }` (sparse) to `models/Visit.js` | M2 | ORIGINAL_REQUEST §R2.3 / Survey Explorer 2 | DONE |
| 7 | R2.4 MedicalCode Autocomplete Indexing | Add compound index `{ code: 1, description: 1 }` and `{ type: 1, code: 1, description: 1 }` without creating duplicate text index | M2 | ORIGINAL_REQUEST §R2.4 / Survey Explorer 2 | DONE |
| 8 | R3.1 Puppeteer Lifecycle Hardening | Wrap Chromium browser lifecycle in `try ... finally { if (browser) await browser.close(); }` with container flags in `controllers/Downloads/reportDocx.js` | M3 | ORIGINAL_REQUEST §R3.1 / Survey Explorer 3 | DONE |
| 9 | R3.2 Multer Temp File Cleanup | Audit and harden file cleanup in `finally` blocks across `controllers/openaiController.js`, `controllers/labController.js`, and `controllers/patientController.js` using `Helper/cleanup.js` | M3 | ORIGINAL_REQUEST §R3.2 / Survey Explorer 3 | DONE |
| 10 | R4.1 Backwards Compatibility Guarantee | Ensure all modified endpoints preserve existing response keys, datatypes, and HTTP status codes | M4 | ORIGINAL_REQUEST §R4 / Survey Explorer 3 | DONE |
| 11 | R4.2 Developer Handoff Dossier | Compile publication-grade `DEVELOPER_CHANGELOG.md` in project root with before/after diffs, rationale, and evaluation checklist | M4 | ORIGINAL_REQUEST §R4 / Survey Explorer 3 | DONE |
| 12 | R4.3 Node Syntax & Regression Checks | Run `node --check` across all touched files and verify zero syntax or regression errors | M4 | ORIGINAL_REQUEST §Verification / Survey Explorers 1-3 | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Functional Defect Remediation & Clinical Accuracy | Features 1, 2, 3: Fix `voiceMethod`, create `Helper/jsonParser.js`, refactor all 11 regex occurrences, integrate `evaluateRedFlags` | Survey complete | DONE |
| M2 | Database Indexing & Query Optimization | Features 4, 5, 6, 7: Add compound Mongoose indexes in `Patients.js`, `Appointment.js`, `Visit.js`, `MedicalCode.js` | Survey complete | DONE |
| M3 | Resource Lifecycle & Memory Leak Hardening | Features 8, 9: Hardened Puppeteer `try ... finally` in `reportDocx.js`, create `Helper/cleanup.js`, implement Multer file unlinking | Survey complete | DONE |
| M4 | Developer Dossier & Full Regression Verification | Features 10, 11, 12: Compile `DEVELOPER_CHANGELOG.md`, run `node --check` and regression tests, gate review | M1, M2, M3 | DONE |

---

## Interface Contracts

### 1. `Helper/jsonParser.js` ↔ AI & Lab Controllers
```javascript
function extractAndParseJSON(input, fallback = null) => Object | Array | fallback
// Non-destructive: strips markdown fences (```json, ```JSON, ```), extracts outer { } or [ ], cleans trailing commas. Never strips the word "json".
```

### 2. `voiceMethod` ↔ `generateReportFromAudioFile` & `speechToTextForm`
```javascript
// Input: file (Multer object), type ('quick-upload' | 'create' | 'update')
// Output for type === 'quick-upload':
{ response: true, msg: string } // raw Whisper transcription text string
```

### 3. `evaluateRedFlags` ↔ `generateNoteWithHistory` & `generateReportFromAudioFile`
```javascript
// Function signature:
async function evaluateRedFlags(input: string | object) => Promise<{ redFlags: Array, safeToTreat: boolean, summary: string }>
// Additive response fields in note generation:
{
  ...existingPayloadFields,
  redFlags: Array<{ severity: string, category: string, description: string, recommendation: string }>,
  safeToTreat: boolean,
  safetyAlerts: { hasRedFlags: boolean, safeToTreat: boolean, alerts: Array, summary: string }
}
```

### 4. `Helper/cleanup.js` ↔ Upload Controllers
```javascript
function safeUnlink(filePath: string) => void
// Checks existsSync, deletes file inside try/catch, never throws unhandled errors.
```

### 5. Mongoose Schema Index Contracts
- `Patients`: `{ fullName: 1, phoneNumber: 1, email: 1 }`, `{ email: 1 }`, `{ doc_id: 1, createdAt: -1 }`, `{ doc_id: 1, fullName: 1, phoneNumber: 1 }`
- `Appointment`: `{ date: 1, status: 1 }` (sparse), `{ doctorID: 1, status: 1 }`, `{ doctorID: 1, time: 1, status: 1 }`, `{ patientID: 1, createdAt: -1 }`
- `Visit`: `{ pId: 1, createdAt: -1 }`, `{ patientId: 1, visitDate: -1 }` (sparse), `{ doc_id: 1, createdAt: -1 }`
- `MedicalCode`: `{ code: 1, description: 1 }`, `{ type: 1, code: 1, description: 1 }` (B-tree compound; existing unique and text index preserved)

---

## Code Layout
- `Helper/jsonParser.js`: Centralized non-destructive JSON parser
- `Helper/cleanup.js`: Centralized temporary file cleanup utility
- `controllers/openaiController.js`: Clinical AI, Whisper transcription, red flags, SOAP notes
- `controllers/labController.js`: Lab file parsing and upload cleanup
- `controllers/Visits/visitController.js`: Visit registration with red-flag persistence
- `controllers/patientController.js`: Patient import with stream error handling & cleanup
- `controllers/Downloads/reportDocx.js`: Puppeteer browser lifecycle management
- `models/Patients.js`: Patient schema indexes
- `models/Appointment.js`: Appointment schema indexes
- `models/Visit.js`: Visit schema indexes
- `models/MedicalCode.js`: Medical code schema indexes
- `DEVELOPER_CHANGELOG.md`: Peer developer handoff dossier at project root
