# Comprehensive Survey Report: Backend Architecture, Security & HIPAA Compliance
**Target System:** AIMS-2026 Healthcare Platform (AIMS EHR / AI Smart Medical Assistant)  
**Survey Agent:** Survey Explorer 1 (Backend Architecture, Security & HIPAA)  
**Date:** September 7, 2026  
**Status:** Audit Complete  

---

## Executive Summary

A comprehensive architectural, security, and HIPAA compliance audit of the **AIMS-2026** backend was conducted across all root configuration files (`package.json`, `index.js`), middleware (`middleware/`), helper utilities (`Helper/`), data models (`models/`), and controllers (`controllers/`).

The codebase powers an AI-driven Electronic Health Record (EHR) and clinical assistant system handling sensitive Protected Health Information (PHI)—including patient demographics, clinical notes (SOAP), ICD-10 diagnoses, CPT billing codes, lab reports, ID/insurance card OCR images, and audio consultations.

The investigation revealed **critical architectural deficiencies, severe authentication vulnerabilities, multiple active credential leaks, and flagrant HIPAA Privacy and Security Rule violations**. Most notably:
1. **Catastrophic Authentication Backdoor (`index.js:93`)**: A GET endpoint (`/api/get/checkUserToken`) returns `{ response: true, msg: 'token is valid', role: 'Admin' }` when **no token is provided**, granting unauthenticated callers administrative privileges.
2. **Unprotected Core Clinical Endpoints**: Endpoints allowing retrieval of full patient medical histories (`/api/get/getPatientById`), patient record updates (`/api/post/updatePatient`), new patient registration (`/api/post/createPatient`), appointment calendar dumps (`/api/get/calenderDates`), and database-wide clinical record overwrites (`/api/get/test`) have **zero authentication or authorization middleware**.
3. **Hardcoded Cloud & Service Credentials in Source Code**: Active plaintext AWS IAM Access Keys and Secret Keys (`AwsClient.js`), Twilio Account SIDs and Auth Tokens (`twilio.js`), Cloudinary API keys and secrets (`cloudinay.js`), and a live Gmail account password (`mailController.js`) are committed directly into the source code.
4. **Hardcoded Live Patient PHI**: Real patient clinical records (including patient name "Elvis Valdez", motor vehicle accident details, psychiatric distress, and physical exam findings) are committed in source code comments (`reportDocx.js`) and in test files (`test.js`).
5. **Non-Expiring JWT Tokens & Insecure Password Storage**: JWT tokens generated via `config/generateToken.js` omit `expiresIn`, creating tokens that **never expire**. Passwords are not hashed with bcrypt (despite `bcryptjs` being installed); instead, they are symmetrically encrypted using two-way CryptoJS AES using the JWT secret, and are **returned in plaintext to clients** on staff retrieval endpoints (`/api/get/getAssistants`, `/api/get/getDoctors`).
6. **Zero Audit Logging & Absence of RBAC**: No access or mutation audit trails exist (a direct violation of HIPAA 45 CFR § 164.312(b)), and role-based access control is nonexistent; all authenticated tokens share the primary Admin identity.

---

## Domain 1: Backend Architecture & Routing Topology Catalog

### 1.1 Server Infrastructure & Entry Point (`index.js`)
- **Runtime Environment:** Node.js with Express 4.18.2 and Mongoose 5.12.9. Mongoose 5.x is severely outdated (EOL since 2021) and lacks modern MongoDB driver connection resilience, strict query typing, and security patches.
- **Routing Topology:** Monolithic, flat route architecture. All 88+ API routes are declared directly on the Express application instance (`app.post`, `app.get`, `app.delete`) within `index.js` (lines 88–310). There is **zero modularization** using `express.Router()`.
- **Hardcoded Configuration:**
  - `const PORT = 4000;` (`index.js:316`): The listening port is hardcoded and ignores `process.env.PORT`.
  - Storage Destination (`index.js:75`): Multer disk storage is hardcoded to `./uploads`. In containerized or serverless deployments (such as Vercel, defined in `vercel.json`), local disk writes fail due to read-only filesystems (`EROFS`).
- **Serverless / Deployment Mismatch:**
  - `vercel.json` configures `index.js` as a serverless function (`@vercel/node`). The architecture is incompatible with serverless execution:
    1. Synchronous disk writes (`./uploads`) fail on read-only serverless runtimes.
    2. Chromium browser launches in Puppeteer (`controllers/Downloads/reportDocx.js:207`) exceed serverless execution limits and bundle sizes.
    3. Persistent database connection pooling is unmanaged, creating connection exhaustion on cold starts.
    4. Cron jobs (`triggerDailySchedule`) cannot run reliably without an external orchestrator.
- **Missing Static Asset Serving:**
  - `public/` contains `daily-schedule-settings.html` and 8 DOCX templates, but `express.static('public')` is never mounted in `index.js`. As a result, HTML settings interfaces cannot be served.

### 1.2 Middleware Pipeline & Execution Chain

The middleware execution order in `index.js` exhibits severe redundancy and omissions:

```
[Incoming Request]
       │
       ▼
[bodyParser.json()]                     (index.js:62 - Redundant)
       │
       ▼
[bodyParser.urlencoded({extended:true})](index.js:63)
       │
       ▼
[cors()]                                (index.js:64 - Redundant initial CORS)
       │
       ▼
[express.json()]                        (index.js:65 - Redundant duplicate JSON parser)
       │
       ▼
[cors({ origin: '*' })]                 (index.js:66 - Wildcard origin, no credentials policy)
       │
       ▼
[Route Matching (Flat in index.js)]
       │
       ├── Protected: [protect] (middleware/authMiddleware.js)
       └── Unprotected: Direct execution
```

**Critical Middleware Omissions:**
1. **No Security Headers:** `helmet` is not installed or configured. The API lacks `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, and `X-Frame-Options`.
2. **No Rate Limiting:** No rate limiting middleware (`express-rate-limit`) is mounted. Authentication, AI transcription/generation, and notification endpoints are susceptible to brute-force attacks and resource exhaustion.
3. **No Input Sanitization:** No NoSQL injection sanitization (`express-mongo-sanitize`) or XSS filtering is present.
4. **Dead / Orphaned Error Middleware:** `middleware/errorMiddleware.js` exports `notFound` and `errorHandler`, but neither is imported or mounted in `index.js`.

### 1.3 Routing Inventory & HTTP Verb Inconsistencies

The routing naming convention is chaotic, mixing HTTP methods with path verbs (`/api/get/...`, `/api/post/...`, `/api/del/...`, `/api/delete/...`, `/api/edit/...`) while frequently mismatching the actual HTTP method:

| Route Path | Declared Verb | Intended Action | Controller Method | Protection | Architectural Defect |
|---|---|---|---|---|---|
| `/api/get/checkUserToken` | `GET` | Verify token | Inline (`index.js:93`) | **NONE** | **Critical Backdoor: Returns Admin role on null token** |
| `/api/get/getPatientById` | `GET` | View patient record | `patientController.getPatientById` | **NONE** | **Extreme HIPAA breach: Public access to all patient PHI** |
| `/api/post/updatePatient` | `POST` | Update patient record | `patientController.updatePatient` | **NONE** | **Unauthenticated modification of patient health data** |
| `/api/post/createPatient` | `POST` | Register patient | `patientController.createPatient` | **NONE** | Unauthenticated patient record creation |
| `/api/post/updateVoiceIntake` | `POST` | Update intake PHI | `patientController.updateVoiceIntake` | **NONE** | Unauthenticated modification of intake data |
| `/api/get/calenderDates` | `POST` | Fetch doctor appointments | `appointmentController.calenderDates` | **NONE** | **GET-style path mapped to POST; exposes schedule & names** |
| `/api/get/triggerDailySchedule` | `GET` | Blast SMS/Email schedule | `notificationController.triggerDailySchedule` | **NONE** | Unauthenticated trigger causes SMS spam & financial drain |
| `/api/post/userResponseFromEmail` | `POST` / `GET` | Change appt status | `appointmentController.userResponseFromEmail` | **NONE** | Unauthenticated appointment state modification |
| `/api/get/test` | `GET` | Database test | `testController.testFunc` | **NONE** | **Destructive: Overwrites all database visits on GET** |
| `/api/get/fecthDemoAccounts` | `POST` | Proxy demo accounts | `adminController.fecthDemoAccounts` | **NONE** | Typo in path (`fecth`); POST for data retrieval |
| `/api/get/demoUserCount` | `POST` | Proxy user count | `adminController.demoUserCount` | **NONE** | POST for read-only counter |
| `/api/get/getbyDateAppointment` | `POST` | Fetch appointments by date | `appointmentController.getbyDateAppointment` | `protect` | POST used for querying records |
| `/api/del/delAppointment` | `POST` | Delete appointment | `appointmentController.delAppointment` | `protect` | POST used instead of DELETE |
| `/api/edit/editAppTime` | `POST` | Reschedule appointment | `appointmentController.editAppTime` | `protect` | Custom `/api/edit/` path verb |
| `/api/post/createQuickDocx` | `GET` | Download quick DOCX | `downloadController.createQuickDocx` | `protect` | GET mapped to `/api/post/` prefix |
| `/api/post/reportDocxDirectDownload` | `POST` | Generate SOAP DOCX | `downloadController.reportDocxDirectDownload`| **NONE** | Unauthenticated file generation |
| `/api/post/ameriarePatientDocument` | `POST` | Americare intake export | `downloadController.ameriarePatientDocument` | **NONE** | Unauthenticated; emails PHI to arbitrary address |
| `/api/post/speechToText` | `POST` | Whisper audio transcription | `openaiController.speechToTextForm` | **NONE** | Unauthenticated OpenAI quota consumption |
| `/api/post/extractPatientDataFromImage` | `POST` | Vision OCR on patient ID | `openaiController.extractPatientDataFromImage` | **NONE** | Unauthenticated OpenAI vision invocation |

### 1.4 Controller Organization & Dead Code Inventory

The backend contains 24 controller files across 8 subdirectories:
- **Active Controllers:** `userController.js`, `adminController.js`, `patientController.js`, `patientPortalController.js`, `appointmentController.js`, `visitController.js`, `visitExportController.js`, `openaiController.js`, `medicalCodesController.js`, `labController.js`, `noteTypeController.js`, `notificationController.js`, `mailController.js`, `reportDocx.js`, `Upload.js`, `GetDocuments.js`, `DeleteDocument.js`, `createInvoice.js`, `getAlIInvoices.js`, `deleteInvoice.js`, `NotesController.js`.
- **Dead / Unrouted Controllers:**
  1. `controllers/ehrController.js`: Contains boilerplate integration for AdvanceMD (`https://api.advancemd.com`) with dummy API keys (`const apiKey = 'YOUR_API_KEY'`). It is never imported or routed.
  2. `controllers/audioNotesController.js`: Exports `saveTranscription`, `getTranscription`, `uploadAndTranscribe`. None of these methods are imported or registered in `index.js`.
  3. `controllers/testController.js`: Contains a hazardous database wipe utility (`Visit.updateMany({}, {reportType: "1.0"})`) exposed publicly.
  4. `backend/aims-backend-node.js-main/`: An entire legacy backend clone stored inside the project tree, containing duplicated code and stale controllers.

### 1.5 Phantom & Unused Dependencies in `package.json`

The project imports heavy packages that are never utilized in application logic:
- `ioredis` (^5.3.2) & `redis` (^4.6.13): Neither package is imported or instantiated in any source file. No caching or Redis-backed rate limiting exists.
- `cron` (^3.1.6) & `node-cron` (^3.0.3): Neither package is imported or initialized in the runtime.
- `socket.io` (^4.1.2) & `ws` (^8.17.1): Neither library is attached to the HTTP server.
- `bcryptjs` (^2.4.3): Installed for password hashing but completely bypassed in favor of two-way AES encryption.
- `sib-api-v3-sdk` (^8.5.0): Imported in `userController.js:15` (`ConversationsMessageFile`), but never invoked.

---

## Domain 2: Architectural Bottlenecks, Error Handling & Reliability

### 2.1 Error Handling Anti-Patterns & Process Instability

#### 1. Absence of Centralized Error Handling
In Express, unhandled errors inside asynchronous handlers must be passed to `next(err)` to reach a centralized error middleware. While routes wrap handlers with `express-async-handler`, `index.js` **never registers an error middleware** (`app.use((err, req, res, next) => ...)`). 
- Unhandled errors result in the default Express HTML error response, leaking stack traces and internal directory paths to callers.
- Orphaned middleware: `middleware/errorMiddleware.js` contains a standard handler, but it is never imported in `index.js`.

#### 2. HTTP 200 Returned for Exceptional and Failure Conditions
A pervasive design flaw across all controllers is returning `res.status(200)` for client errors, server failures, and validation breakdowns:
- `middleware/authMiddleware.js:20,25`: Returns `status(200)` with `{ response: false, msg: "Token-Session-Ended" }` when an auth token is invalid or missing.
- `userController.js:24-75`: Validation errors, duplicate email checks, and database failures return `status(200)`.
- `userController.js:137,192,274`: Invalid login credentials return `status(200)`.
- **Impact:** API clients, monitoring agents (Datadog, New Relic), caching proxies, and Web Application Firewalls (WAFs) cannot detect authentication failures, brute-force attacks, or service errors because the HTTP status indicates success (`200 OK`).

#### 2.2 Unhandled Runtime Exceptions (Crash Bugs)

Several endpoints contain critical defects that trigger unhandled runtime exceptions:

1. **Null Pointer Dereference in `adminController.js:41` (`adminLogin`)**:
   ```javascript
   // adminController.js lines 32-48
   const { email, password } = req.body;
   if (!email || !password) {
     res.json({ response: false, msg: "Enter email and password" });
     // BUG: MISSING return statement! Execution continues!
   }
   const user = await User.findOne({ email });
   if (user.role == false) { // CRASH: If user is null, throws TypeError: Cannot read properties of null
     res.json({ response: false, msg: "User is not admin" });
   }
   if (!user) { // Unreachable check after the crash
     res.json({ response: false, msg: "User not found" });
   }
   ```
   If a non-existent email or empty string is submitted, `User.findOne({ email })` returns `null`. Accessing `user.role` immediately throws `Cannot read properties of null (reading 'role')`. Additionally, `User` has an `admin` boolean field, not `role`.

2. **ReferenceError in `adminController.js:132` (`createDoctor`)**:
   ```javascript
   const { first_name, last_name, email, password, phone, access, role, address } = req.body;
   console.log(username, email, password, phone, address, role, access);
   ```
   `username` is logged but was never destructured from `req.body`, throwing `ReferenceError: username is not defined` on every doctor creation request.

3. **Unhandled TypeError in `createAppointment` Finally Block (`appointmentController.js:137-154`)**:
   ```javascript
   finally {
     if (smsChecked) {
       sendMessage(msg, patientInfo.phoneNumber); // CRASH if patientInfo is undefined
     }
     if (emailChecked) {
       appMail(..., newAppointment.time, ...); // CRASH if newAppointment is undefined
     }
   }
   ```
   If the database query throws an error in `try`, `patientInfo` or `newAppointment` remains `undefined`. The `finally` block executes regardless, dereferencing properties on `undefined` and throwing an unhandled exception outside the `try/catch`.

4. **Corrupt ID Matching in `visitController.js:139-160` (`createVisit`)**:
   ```javascript
   } else if (mode == "edit") {
     const visit = await Visit.updateOne({ _id: pId }, { ... });
   ```
   In edit mode, the query searches for a `Visit` whose `_id` equals `pId` (the **Patient's ID**), rather than the visit's `_id`! This causes all visit edits to silently fail or update unintended records.

5. **Fragile OpenAI Error Handling (`openaiController.js:21`)**:
   ```javascript
   } catch (e) {
     return { response: false, msg: e.error.message };
   }
   ```
   OpenAI SDK v4 errors and network timeouts do not guarantee an `e.error` sub-object. When `e.error` is undefined, accessing `.message` throws an unhandled `TypeError`.

### 2.3 Performance, Resource & Memory Management Bottlenecks

#### 1. Severe Indexing Deficiencies Across Mongoose Models
A thorough audit of `models/` revealed that almost **none of the primary clinical collections possess database indexes**:

| Collection | Model File | Existing Indexes | High-Traffic Queries Lacking Indexes | Performance Impact |
|---|---|---|---|---|
| `patients` | `models/Patients.js` | None (only default `_id`) | `doc_id`, `email`, `phoneNumber`, `fullName`, `createdAt` | Full collection scan (COLLSCAN) on every patient search, pagination, and autocomplete |
| `visits` | `models/Visit.js` | None (only default `_id`) | `pId`, `doc_id`, `createdAt`, `date` | Full collection scan for every patient timeline load and history review |
| `appointments` | `models/Appointment.js`| None (only default `_id`) | `doctorID`, `patientID`, `time`, `status`, `createdAt` | Full collection scan with regex matching for every daily schedule check |
| `documents` | `models/Document.js` | None (only default `_id`) | `pId`, `userId`, `createdAt` | Full collection scan for every document list query |
| `users` | `models/User.js` | `email` (unique) | `admin`, `createdAt` | Collection scan for admin user filtering |
| `medicalcodes` | `models/MedicalCode.js`| Compound & Text indexes | None (properly indexed) | Performs efficiently compared to all other models |

#### 2. Puppeteer Memory Leaks & Process Starvation (`reportDocx.js:206-218`)
```javascript
async function createPdfFromHtml(html) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuffer;
}
```
- **Lifecycle Flaw:** Every single PDF download launches a new Chromium browser process (`puppeteer.launch()`), consuming 150MB–300MB of RAM per invocation.
- **Resource Exhaustion:** Under concurrent user load (e.g., 5–10 simultaneous downloads), RAM consumption spikes into gigabytes, triggering Out-Of-Memory (OOM) process termination.
- **Zombie Process Leak:** There is no `try/finally` block around `browser.close()`. If `page.setContent` or `page.pdf` fails, the Chromium process remains running as an orphaned zombie process, leaking memory and file descriptors.

#### 3. Regular Expression Denial of Service (ReDoS)
User input is repeatedly concatenated directly into MongoDB `$regex` queries without escaping:
- `patientController.js:623`: `fullName: { $regex: ^${query}, $options: 'i' }`
- `patientController.js:649-656`: `fullName: { $regex: query, $options: 'i' }`, `email: { $regex: query, $options: 'i' }`
- `patientController.js:687-694`: Unescaped query in `searchPatientsByTypeAndLimit5`
- `appointmentController.js:362-369`: Unescaped query in `filterAppointments` on `name`, `email`, and `time`
An attacker can supply malicious regex patterns (e.g., `(a+)+$`) or catastrophic wildcard combinations to lock the Node.js event loop and exhaust MongoDB CPU.

#### 4. Unbounded Batch Processing in CSV Import (`patientController.js:738-755`)
```javascript
for (const item of csvData) {
  const newPatient = new Patient({ ... });
  patients.push(newPatient.save());
}
await Promise.all(patients);
```
`importPatients` pushes a `newPatient.save()` promise for every row in the uploaded CSV into an unbounded array and calls `Promise.all(patients)`. If an import contains 5,000 records, 5,000 concurrent database writes are dispatched simultaneously, exhausting MongoDB socket pools and Node.js heap memory.

---

## Domain 3: Authentication, Authorization & Session Integrity

### 3.1 Catastrophic Authentication Backdoor (`index.js:93`)

The endpoint `/api/get/checkUserToken` contains an egregious security flaw:

```javascript
// index.js line 93
app.get('/api/get/checkUserToken', (req, res) => {
  const t = req.headers.authorization?.split(' ')[1];
  if (!t) return res.json({ response: true, msg: 'token is valid', role: 'Admin' });
  try {
    const d = require('jsonwebtoken').verify(t, process.env.JWTSECRET);
    return res.json({ response: true, msg: 'token is valid', role: 'Admin' });
  } catch (e) {
    return res.json({ response: false, msg: 'token is not valid' });
  }
});
```

**Vulnerability Mechanics:**
1. If the `Authorization` header is omitted entirely or empty, the condition `if (!t)` evaluates to `true`.
2. The server returns HTTP 200 with `{ response: true, msg: 'token is valid', role: 'Admin' }`.
3. If a frontend client uses this endpoint to determine whether to render administrative routes or grant session access, any anonymous user on the public internet is treated as a fully authenticated **Admin**.
4. Even when a valid token belonging to a restricted doctor or assistant is provided, the endpoint hardcodes `role: 'Admin'`.

### 3.2 Non-Expiring JWT Tokens (`config/generateToken.js`)

```javascript
// config/generateToken.js
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWTSECRET);
};

module.exports = generateToken;
```

**Flaws & HIPAA Violations:**
1. **Infinite Lifetime:** `jwt.sign()` is invoked without the `expiresIn` option. Once generated, a JWT token **never expires**.
2. **HIPAA Security Rule Violation (§ 164.312(a)(2)(iii) - Automatic Logoff):** Healthcare applications must implement session termination. A stolen token grants indefinite access to patient medical records.
3. **No Revocation Mechanism:** The token contains only `{ id }`. There is no token version (`tokenVersion`), session ID, or `iat` validation. If an employee resigns or is terminated, their token cannot be revoked without changing `JWTSECRET` for all users globally.

### 3.3 Symmetric Password Encryption Anti-Pattern & Plaintext Password Exposure

#### 1. Passwords Encrypted Rather Than Hashed
In `controllers/userController.js` (lines 65, 312, 589, 629, 697, 771), passwords are not hashed using a one-way cryptographic hash (e.g., bcrypt, Argon2, PBKDF2):
```javascript
password: CryptoJS.AES.encrypt(password, process.env.JWTSECRET).toString()
```
- Passwords are encrypted using symmetric two-way AES encryption.
- The encryption key is `process.env.JWTSECRET`, conflating the token signing key with the database encryption key. Anyone with access to the environment variable can decrypt all user, doctor, and assistant passwords into plaintext.
- `bcryptjs` is installed in `package.json:26`, proving cryptographic hashing was intended but never implemented.

#### 2. Plaintext Passwords Returned in API Responses
In `userController.js`, staff retrieval endpoints deliberately decrypt stored passwords and return them in plaintext:

```javascript
// userController.js lines 658-664 (getAssistant)
const obj = await Assistant.findOne({ _id: assistants[i] }).select('username password access');
if (obj) {
  const bytes = CryptoJS.AES.decrypt(obj.password, process.env.JWTSECRET);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  obj['password'] = originalText; // Replaces hash with plaintext password!
  assistantsList.push(obj);
}
return res.json({ success: true, assistantsList });
```

```javascript
// userController.js lines 745-751 (getDoctors)
const obj = await Doctor.findOne({ _id: doctors[i] }).select('username password access');
if (obj) {
  const bytes = CryptoJS.AES.decrypt(obj.password, process.env.JWTSECRET);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  obj['password'] = originalText; // Replaces hash with plaintext password!
  doctorsList.push(obj);
}
return res.json({ success: true, doctorsList });
```
Any user with access to `/api/get/getAssistants` or `/api/get/getDoctors` receives the **cleartext passwords** of all doctors and clinical assistants.

### 3.4 Disintegration of Role-Based Access Control (RBAC)

1. **Shared Identity Impersonation:**
   In `userController.js:210,292` (`signin`), when a Doctor or Assistant logs in, the API generates their primary access token using the **Admin's `_id`**:
   ```javascript
   token: { "access": generateToken(user._id) }, // user._id is the ADMIN, not the doctor!
   assistantToken: { "access": generateToken(doc._id) },
   role: "Doctor"
   ```
   Because all subsequent API requests pass `Bearer <token.access>` to `protect`, the server evaluates `req.user = decoded.id`, which resolves to the **Admin**. All doctors and assistants operate under the admin's database identity, completely obliterating accountability and tenant isolation.

2. **Absence of Role Authorization Guards:**
   There is no RBAC middleware (e.g., `requireRole(['admin'])`). Administrative routes (`/api/get/fetchAllDoctors`, `/api/get/fetchAllAdmins`, `/api/post/createNoteType`, `/api/delete/deleteNoteType`) only check for a valid `protect` token. Since all staff share admin-scoped tokens, any assistant or doctor can perform administrative operations.

3. **Insecure Direct Object Reference (IDOR) & Privilege Escalation in `updateProfile`:**
   ```javascript
   // userController.js lines 337-343
   const { _id, first_name, last_name, email, ..., admin } = req.body;
   const update = { first_name, last_name, email, ... };
   if (typeof admin === 'boolean') update.admin = admin;
   await User.updateOne({ _id }, update);
   ```
   `updateProfile` updates the user specified in `req.body._id`, rather than `req.user`. Any authenticated user can modify any other user's profile and escalate their privileges by submitting `"admin": true`.

### 3.5 Secret Name Discrepancy & Hardcoded Fallback

The codebase uses two conflicting environment variable names for JWT signing:
- Main API: `process.env.JWTSECRET` (`config/generateToken.js:4`, `middleware/authMiddleware.js:15`, `userController.js:67`)
- Patient Portal: `process.env.JWT_SECRET || 'patient-portal-secret'` (`controllers/patientPortalController.js:32,100`)

If the environment defines `JWTSECRET` (as configured in the main app), `JWT_SECRET` is undefined. The Patient Portal silently falls back to the hardcoded string `'patient-portal-secret'`. An external attacker can forge tokens signed with `'patient-portal-secret'` to access any patient's appointments and clinical visit history.

---

## Domain 4: HIPAA Compliance, PHI Exposure & Data Security Audit

### 4.1 Unprotected Clinical Endpoints Exposing Protected Health Information (PHI)

Under HIPAA Privacy Rule 45 CFR § 164.502 and Security Rule § 164.312, Covered Entities must restrict access to ePHI to authorized personnel. The following endpoints in `index.js` have **no authentication middleware**:

```
Public Internet ────▶ GET /api/get/getPatientById?id=<PATIENT_ID> ────▶ Complete Patient Medical Record
Public Internet ────▶ POST /api/post/updatePatient                ────▶ Overwrite Any Patient Record
Public Internet ────▶ POST /api/get/calenderDates                 ────▶ Dump Doctor Schedules & Patient Names
Public Internet ────▶ GET /api/get/triggerDailySchedule?userId=XX ────▶ Trigger Schedule SMS Blast
Public Internet ────▶ GET /api/get/test                           ────▶ Overwrite All Clinical Visits
Public Internet ────▶ POST /api/post/reportDocxDirectDownload     ────▶ Download Formatted SOAP Notes
Public Internet ────▶ POST /api/post/ameriarePatientDocument      ────▶ Email PHI Document to Arbitrary Recipient
Public Internet ────▶ POST /api/post/speechToText                 ────▶ Upload Audio & Transcribe via Whisper
```

#### Detailed Exposure Analysis:
1. **Public Medical Record Disclosure (`/api/get/getPatientById`):**
   An unauthenticated caller can query `/api/get/getPatientById?id=<id>` to receive:
   - Full Name, Date of Birth, Gender, Home Address, Phone Numbers
   - Emergency contacts and relationships
   - Insurance Provider, Policy Number, Group Number, Policyholder Name
   - Primary Care Physician
   - Current Medications, Allergies, Chronic Conditions, Past Surgeries
   - Family Medical History, Physical Exam Notes, Review of Systems (ROS)
   - Auto accident and Workers' Comp legal details (attorney name, claim numbers, police reports)
   - Substance use history (smoking, alcohol, recreational drug use)
   - Pregnancy status
   - OCR text extracted from Driver's Licenses and Insurance Cards (`pictureIdOcr`, `insuranceCardOcr`)
2. **Unauthenticated Medical Record Tampering (`/api/post/updatePatient`):**
   Allows arbitrary third parties to alter patient diagnoses, contact info, or medications via `Patient.updateOne({ _id }, req.body)`.
3. **Destructive Wipe via `GET /api/get/test`:**
   Sends `Visit.updateMany({}, { reportType: "1.0" })`, corrupting metadata across all patient visits in the database.

### 4.2 Hardcoded Secrets & Cloud Credentials Inventory

The codebase contains active plaintext credentials committed directly to the repository:

| Service | Target File | Line Numbers | Exposed Credential Details | Risk & Impact |
|---|---|---|---|---|
| **AWS IAM** | `controllers/AWS/AwsClient.js` | Lines 7–8 | Access Key: `AKIAXWMA6W5C7HXEPS4V`<br>Secret Key: `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` | Direct read/write/delete access to AWS S3 buckets containing patient documents and scans |
| **Twilio** | `controllers/Twilio/twilio.js` | Lines 8–9 | Account SID: `AC038061eedcc47e1d7705b722fbb0eb81`<br>Auth Token: `28729102e2163caa3555992f580e1013` | Full access to SMS infrastructure; ability to intercept or send spoofed SMS |
| **Twilio (Legacy)** | `controllers/Twilio/twilio.js` | Lines 5–6 | Account SID: `AC80571de3c2b43adccaaa358897b336db`<br>Auth Token: `98fa428842a5e94d275808105daa6378` | Committed in code comments |
| **Cloudinary** | `controllers/Cloudinary/cloudinay.js` | Lines 4–6 | Cloud Name: `dklqbx5k0`<br>API Key: `586219556714458`<br>API Secret: `JY7qKHk1QeMN5FqaW4lPf9N3k1E` | Asset deletion and image access permissions |
| **Gmail SMTP** | `controllers/mailController.js` | Lines 269–270 | Email: `alihamzanasir0306@gmail.com`<br>App Password: `rvxk igwu dmxd ecwj` | Active SMTP credentials allowing unauthorized email dispatch |
| **Third-Party Keys** | `controllers/userController.js` | Lines 450, 563 | Stored in MongoDB `User` document in plaintext | User-configured OpenAI keys and Gmail App Passwords stored unencrypted |
| **Customer Emails** | Multiple files | `patientController.js:435`<br>`mailController.js:140` | `kmcneal@awclinics.com`<br>`drjeffreydraesel@gmail.com` | Hardcoded customer email addresses used for routing logic |

### 4.3 Real Patient PHI Hardcoded in Repository

Real clinical notes containing identifiable patient information are committed in plaintext across two separate files:
1. **`controllers/Downloads/reportDocx.js` (lines 500–562):**
   Contains an entire commented-out SOAP note:
   - **Patient Name:** Elvis Valdez
   - **Date of Service / Accident:** November 4, 2024 (Motor Vehicle Accident)
   - **Occupation:** Sales Representative
   - **Clinical Symptoms:** Pain radiating from back to left hip and down left leg (severity 8/10), numbness, tingling, headaches, sleep and concentration disturbances, balance problems.
   - **Physical Exam Findings:** Reduced range of motion in left hip, neck, lower back, shoulder, and elbow; radiculopathy.
   - **Psychological Assessment:** Anxiety, panic attacks, depressive symptoms secondary to chronic pain.
2. **`test.js` (lines 5–89):**
   Contains the exact same clinical note for Elvis Valdez used as test data for document generation.

**HIPAA Implication:** Hardcoding identifiable patient data into source code repositories (especially those shared across developers or pushed to remote git repositories) constitutes an impermissible disclosure under 45 CFR § 164.502, requiring formal breach notification under 45 CFR § 164.400.

### 4.4 Audit Logging Gaps (HIPAA § 164.312(b))

HIPAA § 164.312(b) (*Audit Controls*) mandates mechanisms to record and examine activity in information systems containing or using ePHI.
- **Current State:** The AIMS-2026 backend contains **zero audit logging**.
- **Gaps:**
  - No logs are recorded when medical records are accessed (`getPatientById`, `getPatients`, `viewReport`).
  - No logs are recorded when records are exported to DOCX/PDF (`exportAllPatients`, `reportDocx`, `reportPdf`, `exportVisitDocx`).
  - No logs are recorded when patient records are deleted (`deletePatientHitory`, `delVisit`, `deleteDocument`).
  - System logs (`console.log`) only print transient debugging strings (`'hit'`, `'Pre-save middleware executed'`), containing no structured audit context (User ID, IP address, Timestamp, Resource ID, Action, Outcome).

### 4.5 Data Masking & Minimum Necessary Violations (§ 164.502(b))

- **`getUserInfo` Leakage (`userController.js:327-328`):**
  ```javascript
  const user = await User.findOne({ _id: req.user });
  return res.status(200).json({ response: true, user });
  ```
  Returns the complete `User` document without field projection, transmitting the AES encrypted password string, plaintext `appCode` (Gmail password), and `keys` (stored OpenAI API keys) to the frontend.
- **Third-Party AI Transmission:**
  Patient full names, dates of birth, and comprehensive medical histories are transmitted directly to OpenAI API endpoints (`gpt-4o-mini`, `whisper-1`) without:
  1. Patient de-identification or masking.
  2. Verification of a signed HIPAA Business Associate Agreement (BAA) with OpenAI.
  3. Zero Data Retention (ZDR) verification.

### 4.6 Input Validation, Injection & Storage Security

1. **Arbitrary S3 Object Access / Path Traversal (`controllers/AWS/GetObject.js:10-14`):**
   ```javascript
   const command = new GetObjectCommand({
     Bucket: "bucket-aiscribers.com-private",
     Key: req.query.key
   });
   const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
   ```
   Any authenticated user can supply any arbitrary S3 key via `req.query.key` and receive a signed download URL for any file in the private S3 bucket, bypassing all patient-doctor isolation.
2. **Mass Assignment Vulnerabilities:**
   Controllers accept unvalidated `req.body` directly into Mongoose updates:
   - `patientController.js:259`: `Patient.updateOne({ _id }, req.body)`
   - `userController.js:343`: `User.updateOne({ _id }, update)`
   Attackers can inject unauthorized fields, overwrite system timestamps, or modify security flags.
3. **HTML Injection in Outbound Emails (`Template/Appointments/appointmentcreated.js`):**
   Patient names, clinic names, and URLs are interpolated into HTML emails without HTML entity encoding:
   ```javascript
   <p>Dear ${patientName},</p>
   <img src="${pic}" alt="${clinicname}" class="logo">
   ```
   Injecting HTML or JavaScript payloads into `patientName` allows email client exploitation or credential phishing.

---

## Domain 5: Prioritized Remediation Roadmap

The identified vulnerabilities have been triaged by severity in accordance with CVSS v3.1 and HIPAA breach liability:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CRITICAL PRIORITY (P0)                          │
│               Immediate Security & Regulatory Remediation              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Patch Authentication Backdoor: Rewrite index.js:93 to enforce strict│
│    jwt.verify() and return 401 Unauthorized on missing/invalid tokens. │
│ 2. Revoke & Rotate Leaked Credentials: Rotate AWS IAM keys, Twilio     │
│    tokens, Cloudinary secrets, and Gmail app passwords immediately.    │
│ 3. Purge Hardcoded PHI: Remove "Elvis Valdez" records from reportDocx  │
│    and test.js; scrub git history with git-filter-repo.                │
│ 4. Secure Core Clinical Endpoints: Mount protect middleware on all     │
│    routes in index.js (getPatientById, updatePatient, createPatient).  │
│ 5. Remove Destructive Endpoint: Delete testController.js (/api/get/test│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          HIGH PRIORITY (P1)                            │
│                  Authentication Hardening & HIPAA Access               │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Replace AES Password Encryption with bcrypt (cost factor 12).       │
│ 2. Enforce JWT Expiration (e.g. 15m access tokens, 7d refresh tokens). │
│ 3. Implement Strict RBAC Middleware: requireRole(['admin', 'doctor']). │
│ 4. Stop Returning Plaintext Passwords in staff listing endpoints.      │
│ 5. Fix Patient Portal Secret Fallback: Consolidate to JWT_SECRET.      │
│ 6. Implement Audit Logging Middleware: Log all ePHI access/mutations.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         MEDIUM PRIORITY (P2)                           │
│                Architecture, Reliability & Performance                 │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Restructure index.js into modular express.Router() controllers.     │
│ 2. Mount Helmet and restrictive CORS policy (specific trusted origins).│
│ 3. Mount Centralized Error Handling Middleware (errorHandler).         │
│ 4. Standardize HTTP Status Codes (400, 401, 403, 404, 500).            │
│ 5. Add Compound Indexes across Patients, Visit, and Appointment models.│
│ 6. Escape all regex inputs to prevent ReDoS.                           │
│ 7. Refactor Puppeteer: Replace per-request launches with browser pool  │
│    or dedicated microservice.                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          LOW PRIORITY (P3)                             │
│                  Code Hygiene & Dependency Cleanup                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Remove Phantom Dependencies: ioredis, redis, cron, socket.io, ws.   │
│ 2. Eliminate dead code: ehrController.js, audioNotesController.js,     │
│    backend/aims-backend-node.js-main/.                                 │
│ 3. Serve static assets via express.static('public').                   │
│ 4. Upgrade Mongoose from 5.12.9 to latest stable release (v8.x).       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

The AIMS-2026 backend in its current state cannot be deployed into a production healthcare environment without incurring immediate liability under HIPAA regulations and exposing patient health records to unauthorized external actors. Implementing the **P0 and P1 recommendations** is necessary before handling live clinical operations.
