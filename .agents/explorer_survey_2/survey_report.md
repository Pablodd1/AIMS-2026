# AIMS-2026 Comprehensive Survey Report: Database, Schemas, Indexing, Memory & Redis

**Author:** Survey Explorer 2 (Database, Schemas, Indexing, Memory & Redis)  
**Date:** 2026-09-07  
**Scope:** MongoDB/Mongoose Schemas, Indexing Strategy, Query Optimization, Memory Lifecycles, Stream & File Management, Redis/ioredis Caching Architecture  
**Target Repository:** AIMS-2026 Healthcare Platform  

---

## Executive Summary

An exhaustive technical investigation was performed across all 15 Mongoose schema definitions in `models/`, 24 backend controllers in `controllers/`, middleware, connection scripts, and utility modules of the AIMS-2026 clinical platform.

### Core Survey Findings
1. **Critical Indexing Vacuum (COLLSCAN Crisis):** Out of 14 active database models, **10 models have zero indexes defined**, including primary operational collections (`Patients`, `Visit`, `Appointment`, `Document`, `Invoice`, `CheckNotes`). High-frequency queries rely on unanchored, case-insensitive regular expressions (`$regex: ... , $options: 'i'`), causing full collection scans (`COLLSCAN`) and in-memory sorts on every keystroke, patient lookup, and calendar view.
2. **Schema Drift & Relational Disconnect:** Foreign keys are stored as unindexed raw strings (`pId`, `doc_id`, `doctorID`, `docId`, `userId`, `patientID`) rather than `Schema.Types.ObjectId` with Mongoose `ref` declarations. This completely disables Mongoose population (`.populate()`), leading to manual sequential lookups (N+1 query cascades) and high risk of orphaned clinical records upon deletion. Furthermore, critical clinical fields in `Visit` (`cptCodes`, `icdCodes`, `dxCodes`, `redFlags`, `treatmentSuggestions`) are declared as untyped `[{ type: Object }]` or `Object`, permitting arbitrary unstructured schema drift.
3. **Ghost Caching Layer (Redis Dead Code):** Both `ioredis` (^5.3.2) and `redis` (^4.6.13) are installed in `package.json`, but **neither library is imported, configured, or utilized anywhere in the codebase**. There is zero caching: static datasets like ICD-10/CPT medical codes (~70k standard codes), intake question templates, and doctor profile configs hit MongoDB on every request.
4. **Severe Memory & Resource Leaks:**
   - **Puppeteer Zombie Process Leak:** In `controllers/Downloads/reportDocx.js`, `createPdfFromHtml` launches a new Chromium browser instance on every PDF export (`puppeteer.launch()`) without a `try ... finally` block. If HTML rendering or PDF generation fails, `browser.close()` is skipped, leaving orphan Chromium instances consuming 150–300 MB of RAM each.
   - **Multer Temp File Accumulation:** Uploaded audio, images, and documents in `./uploads` are not cleaned up on error paths in `labController.js` and `openaiController.js`. In `labController.js`, unsupported or PDF uploads trigger an early 400 return without deleting the file from disk.
   - **Unbounded Memory Buffering:** Large files (PDFs, TTS audio, base64 image strings) are loaded entirely into V8 memory buffers via `Buffer.from()` and `fs.readFileSync()` rather than streamed using Node.js stream backpressure pipelines.
   - **Unawaited Database Writes:** In `controllers/Documents/Upload.js`, `doc.save()` is executed without `await`, causing unhandled promise rejections on failure.
5. **Security & Data Integrity Hazards:** Passwords in `User.js` are stored using reversible symmetric AES encryption (`CryptoJS.AES`) with `JWTSECRET` instead of one-way salted hashing (`bcryptjs`). In `userController.js:deletePatientHitory`, cross-tenant authorization checks are missing, allowing any authenticated user to delete another clinic's patient history.

---

## 1. Database & Mongoose Schemas Audit

### 1.1 Inventory of Mongoose Models
The codebase contains 14 active model files in `models/` and 1 backup file:
1. `models/Patients.js` (`Patient`)
2. `models/Visit.js` (`Visit`)
3. `models/Appointment.js` (`Appointment`)
4. `models/MedicalCode.js` (`MedicalCode`)
5. `models/User.js` (`User`)
6. `models/Doctor.js` (`Doctor`)
7. `models/Assistant.js` (`Assistant`)
8. `models/CheckNotes.js` (`CheckNotes`)
9. `models/Document.js` (`Document`)
10. `models/FavoriteCode.js` (`FavoriteCode`)
11. `models/Feedback.js` (`FeedBack`)
12. `models/Invoice.js` (`Invoice`)
13. `models/LabResult.js` (`LabResult`)
14. `models/NoteType.js` (`NoteType`)
15. `models/Visit.js.bak` (Deprecated backup containing destructive `mongoose.models = {};` hack)

---

### 1.2 Model-by-Model Schema Evaluation

#### `models/Patients.js`
- **Schema Design:** Contains 70+ flat fields mixing demographics, medical histories, OCR string dumps, emergency contacts, insurance information, and physical metrics.
- **Type Deficiencies:**
  - `doc_id`: Defined as `type: String, required: true`. Lacks `Schema.Types.ObjectId` and `ref: 'User'`.
  - `dateOfBirth`: Stored as `String` (e.g. `'YYYY-MM-DD'`) instead of `Date`. Precludes date-math queries (e.g. calculating age brackets, pediatric/geriatric filters) in MongoDB.
  - `date` and `time`: Stored as localized strings via pre-save hooks (`getCurrentDateGlobally(this.userTimezone)`), making timezone-normalized chronological queries impossible.
  - `height`, `weight`: Stored as unvalidated `String` without unit consistency (lbs vs kg, inches vs cm).
  - Medical History Arrays: `medications`, `allergies`, `chronicConditions`, `pastSurgeries`, `familyMedicalHistory` are stored as flat unformatted `String` fields instead of structured arrays `[String]` or subdocument arrays.
  - `pictureIdOcr`, `insuranceCardOcr`: Unbounded text dumps of OCR text directly in the main document.
- **Validation Deficiencies:**
  - No enum on `gender` (e.g. `enum: ['Male', 'Female', 'Other', 'Unknown']`).
  - No email format regex validation or automatic `lowercase: true` normalization.
  - No phone number E.164 normalization.
- **Lifecycle Issues:** `PatientSchema.pre('save')` executes `console.log` on every single save in production.

#### `models/Visit.js`
- **Schema Design:** Core clinical encounter document capturing SOAP notes, medical coding, red flags, and transcription URLs.
- **Critical Untyped Fields:**
  - `cptCodes: [{ type: Object }]`: Untyped Mongoose mixed array.
  - `icdCodes: [{ type: Object }]`: Untyped Mongoose mixed array.
  - `dxCodes: [{ type: Object }]`: Untyped Mongoose mixed array.
  - `redFlags: [{ type: Object }]`: Untyped Mongoose mixed array.
  - `treatmentSuggestions: { type: Object }`: Untyped Mongoose mixed object.
  *Impact:* These bypass all Mongoose type validation, allow arbitrary malformed JSON structures, prevent indexing of specific code properties, and cause silent schema drift across frontend and backend versions.
- **Relational Integrity Deficiencies:**
  - `pId`: `type: String, required: true`. Not an `ObjectId`, no `ref: 'Patient'`.
  - `doc_id`: `type: String`. Not an `ObjectId`, no `ref: 'User'`.
- **Date/Time Handling:** Stored as localized strings `date` and `time` via pre-save hook, completely breaking chronological range queries across midnight or timezones.
- **Backup Artifact Hazard:** `models/Visit.js.bak` exists in the active models directory and contains `mongoose.models = {};` on line 91, which wipes compiled models if ever executed.

#### `models/Appointment.js`
- **Schema Design:** Manages patient scheduling, clinic appointments, reminders, and notifications.
- **Type & Integrity Deficiencies:**
  - `patientID`: `type: String, required: true`. No `ref: 'Patient'`.
  - `doctorID`: `type: String, required: true`. No `ref: 'User'`.
  - `time`: Stored as formatted string (e.g. `"2026-09-08 10:00 AM"` via `userInpuDateintoReadableFormat`). Cannot be queried with standard MongoDB date operators (`$gte`, `$lte`).
  - `reminder`: Stored as `String, required: true`.
  - Denormalized Redundancy: `name` and `email` are stored directly on the appointment. If a patient changes their email or name, past and future appointments remain out of sync.
- **Constraint Deficiencies:**
  - **Zero Unique Constraint on Scheduling:** There is NO unique constraint on `{ doctorID: 1, time: 1 }`. A doctor can be double-booked for the exact same slot multiple times.
- **Dead Code:** Lines 42–58 contain commented-out pre-save logic.

#### `models/MedicalCode.js`
- **Schema Design:** Unified table for ICD-10 diagnosis codes and CPT procedure codes.
- **Index Definitions:**
  - `MedicalCodeSchema.index({ type: 1, code: 1 }, { unique: true });`
  - `MedicalCodeSchema.index({ type: 1, category: 1 });`
  - `MedicalCodeSchema.index({ description: 'text', code: 'text' });`
- **Severe Multi-Tenancy Unique Index Bug:**
  - `isCustom: { type: Boolean, default: false }`
  - `docId: { type: String, default: null }` (null for system codes, doctor ID for custom codes).
  - The index `{ type: 1, code: 1 }` is **globally unique**. If Doctor A adds a custom code `"99213-MOD"` with their `docId`, and Doctor B later attempts to add `"99213-MOD"`, MongoDB throws a duplicate key error (E11000). The unique index must be compound on `{ type: 1, code: 1, docId: 1 }` or split into system vs tenant-scoped custom codes.
- **Text Index Disconnect:** The defined compound text index (`{ description: 'text', code: 'text' }`) is **never utilized** by `controllers/medicalCodesController.js`. The controller executes `$or: [{ code: searchRegex }, { description: searchRegex }]` with `$regex: ..., $options: 'i'`, which forces full B-tree scans and ignores the text index entirely.

#### `models/User.js`
- **Schema Design:** Core authentication and provider profile entity.
- **Critical Security Flaws:**
  - `password: { type: String, required: true, trim: true }` lacks `select: false`. Every `User.find()` or `User.findOne()` loads password hashes into application memory unless explicitly excluded via `.select('-password')`.
  - Passwords are stored via symmetric AES encryption (`CryptoJS.AES.encrypt(password, process.env.JWTSECRET)`). This is a catastrophic HIPAA and security vulnerability: passwords can be decrypted in plaintext if `JWTSECRET` is compromised.
  - `email: { unique: true }` lacks `lowercase: true`. User accounts can be duplicated with casing differences (`DrSmith@aims.com` vs `drsmith@aims.com`).
- **Schema Drift & Untyped Fields:**
  - `assistants: []`, `doctors: []`, `apiCredentials: []`: Untyped empty arrays with no schema definitions.
  - In `controllers/userController.js:setOpenAiKey`, the controller queries and updates `keys: { $elemMatch: { OpenAiKey: ... } }`, but `keys` is not defined anywhere in `UserSchema`.

#### `models/Doctor.js` & `models/Assistant.js`
- **Schema Redundancy & Drift:** Both models have identical schemas: `{ docId: String, username: String, password: String, access: Boolean }`.
- Neither has a unique index on `username`, allowing multiple staff members with the same login username.
- Dual Modeling Anti-Pattern: Staff relationships are tracked redundantly in `Doctor`/`Assistant` collections AND inside `User.doctors` and `User.assistants` arrays without transactional synchronization.

#### `models/CheckNotes.js`, `models/Document.js`, `models/Invoice.js`
- **`CheckNotes.js`:** Zero indexes. Copy-paste bug in pre-save middleware: `console.log('Pre-save middleware executed for Invoice')`.
- **`Document.js`:** Zero indexes. Uses `userId` instead of `docId` or `doc_id`. In `Upload.js`, `doc.save()` is called without `await`.
- **`Invoice.js`:** Zero indexes. `item: { type: Array, default: [] }` is completely untyped, allowing arbitrary, unvalidated line items.

#### `models/LabResult.js`
- Well-structured subdocument schema for `results: [{ testName, value, unit, referenceRange, flag, category }]`.
- `patientId` has `index: true`, but `doctorId` has **no index**.
- Dates stored as string (`labDate: String`).

---

### 1.3 Entity Naming Inconsistency & Schema Drift Matrix

A profound lack of naming conventions permeates the schema layer, creating bugs and preventing shared query utilities:

| Entity | Patient Reference Field | Doctor/Provider Reference Field | Date/Time Fields |
|---|---|---|---|
| `Patients` | `_id` | `doc_id` (String) | `date`, `time` (Strings) |
| `Visit` | `pId` (String) | `doc_id` (String) | `date`, `time` (Strings) |
| `Appointment` | `patientID` (String) | `doctorID` (String) | `time` (String "YYYY-MM-DD HH:MM AM/PM") |
| `CheckNotes` | `pId` (String) | `docId` (String) | `checkInDate`, `checkInTime`, `date`, `time` |
| `Document` | `pId` (String) | `userId` (String) | `date`, `time` (Strings) |
| `Invoice` | `pId` (String) | `docId` (String) | `date`, `time` (Strings) |
| `MedicalCode` | N/A | `docId` (String, nullable) | `createdAt`, `updatedAt` |
| `FavoriteCode`| N/A | `docId` (String) | `createdAt`, `updatedAt` |
| `LabResult` | `patientId` (String) | `doctorId` (String) | `labDate` (String) |
| `Doctor` | N/A | `docId` (String) | `createdAt`, `updatedAt` |
| `Assistant` | N/A | `docId` (String) | `createdAt`, `updatedAt` |

**Consequence:**
- 5 different variations for Doctor ID: `doc_id`, `docId`, `doctorID`, `doctorId`, `userId`.
- 3 different variations for Patient ID: `pId`, `patientID`, `patientId`.
- In `controllers/medicalCodesController.js` (lines 156, 194, 225, 254, 266), the code attempts `req.user?._id`. Because `authMiddleware.js` assigns `req.user = decoded.id` (a string), `req.user._id` evaluates to `undefined`, breaking custom code authorship and favorite lookups!

---

### 1.4 Referential Integrity & Orphan Record Risks
MongoDB does not enforce foreign keys or cascading deletes. The system exhibits severe relational vulnerabilities:
1. **Incomplete Cascading Deletion:** In `controllers/userController.js:deletePatientHitory`, when a patient is deleted, the code runs:
   ```javascript
   await Promise.all([
      Patients.deleteOne({_id:pId}),
      Visit.deleteMany({pId}),
      Document.deleteMany({pId}),
      Invoice.deleteMany({pId}),
      Appointment.deleteMany({patientID:pId})
   ]);
   ```
   **Omissions:** It does NOT delete records from `CheckNotes` (`CheckNotes.deleteMany({pId})`) or `LabResult` (`LabResult.deleteMany({patientId: pId})`). Orphaned check-ins and lab results remain in the database indefinitely.
2. **Missing Authorization Scoping:** In `deletePatientHitory`:
   ```javascript
   const { pId } = req.body;
   // No verification that Patients.findOne({ _id: pId, doc_id: req.user }) matches!
   ```
   Any authenticated doctor or user can pass an arbitrary `pId` and wipe out another doctor's patient and all associated clinical records.

---

## 2. Indexing Strategy & Query Efficiency Audit

### 2.1 Complete Index Inventory Across All Models

| Model | Collection | Existing Indexes | Missing / Recommended Indexes | Query Impact |
|---|---|---|---|---|
| `Patients` | `patients` | `_id_` (default) | `{ doc_id: 1, createdAt: -1 }`<br>`{ doc_id: 1, fullName: 1 }`<br>`{ doc_id: 1, email: 1 }`<br>`{ doc_id: 1, phoneNumber: 1 }` | **CRITICAL COLLSCAN:** Every patient list, pagination, and search scans the entire collection. |
| `Visit` | `visits` | `_id_` (default) | `{ pId: 1, createdAt: -1 }`<br>`{ doc_id: 1, createdAt: -1 }` | **CRITICAL COLLSCAN:** Opening a patient's chart triggers a full scan of all visits in the system. |
| `Appointment` | `appointments` | `_id_` (default) | `{ doctorID: 1, time: 1 }` (unique)<br>`{ doctorID: 1, status: 1 }`<br>`{ patientID: 1, time: 1 }` | **CRITICAL COLLSCAN:** Calendar loading, daily schedule queries, and double-booking checks scan all appointments. |
| `MedicalCode` | `medicalcodes` | `_id_`<br>`{ type: 1, code: 1 }` (unique)<br>`{ type: 1, category: 1 }`<br>`{ description: "text", code: "text" }` | `{ type: 1, isCustom: 1, docId: 1 }`<br>Prefix index: `{ type: 1, code: 1, description: 1 }` | Text index unused by regex search; unique constraint causes collisions on custom doctor codes. |
| `User` | `users` | `_id_`<br>`{ email: 1 }` (unique) | `{ email: 1 }` with `{ collation: { locale: 'en', strength: 2 } }` | Case-sensitive duplicates possible; missing collation. |
| `Doctor` | `doctors` | `_id_` (default) | `{ docId: 1 }`<br>`{ username: 1 }` (unique) | Full collection scan on login and assistant checks. |
| `Assistant` | `assistants` | `_id_` (default) | `{ docId: 1 }`<br>`{ username: 1 }` (unique) | Full collection scan on assistant verification. |
| `CheckNotes` | `checknotes` | `_id_` (default) | `{ docId: 1, checkInDate: 1 }`<br>`{ pId: 1 }` | Full collection scan on daily check-in dashboard. |
| `Document` | `documents` | `_id_` (default) | `{ pId: 1, createdAt: -1 }`<br>`{ userId: 1 }` | Full scan on patient document tab. |
| `FavoriteCode`| `favoritecodes`| `_id_`<br>`{ docId: 1, codeId: 1 }` (unique) | `{ docId: 1, type: 1 }` | Listing favorites by type cannot utilize the full index. |
| `Feedback` | `feedbacks` | `_id_` (default) | `{ createdAt: -1 }` | Admin feedback dashboard scan. |
| `Invoice` | `invoices` | `_id_` (default) | `{ docId: 1, createdAt: -1 }`<br>`{ docId: 1, status: 1 }`<br>`{ pId: 1 }` | 5 parallel full table scans on every analytics load. |
| `LabResult` | `labresults` | `_id_`<br>`{ patientId: 1 }` | `{ doctorId: 1, createdAt: -1 }`<br>`{ patientId: 1, labDate: -1 }` | Doctor-scoped queries trigger collection scan. |
| `NoteType` | `notetypes` | `_id_`<br>`{ name: 1 }` (unique)<br>`{ slug: 1 }` (unique) | `{ active: 1, category: 1 }` | Intake question retrieval scans on slug. |

---

### 2.2 Controller Query Performance Analysis

#### A. Patient Controller (`controllers/patientController.js`)
1. **Unindexed Pagination & In-Memory Sorting (`getPatients` lines 209–215):**
   ```javascript
   const patients = await Patient.find(query)
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limitNumber);
   ```
   - Query: `{ doc_id: id }`. Sort: `{ createdAt: -1 }`.
   - Without an index on `{ doc_id: 1, createdAt: -1 }`, MongoDB loads all matching documents into RAM to perform an in-memory sort. Once the dataset exceeds 32 MB in RAM, MongoDB aborts the query with `Executor error during find command: Sort exceeded memory limit of 33554432 bytes`.
   - No projection: Fetches all 70+ fields (including OCR raw strings, histories, and insurance info) for 29 records on every page change.
   - Missing `.lean()`: Instantiates 29 heavy Mongoose model documents.
2. **Brute-Force Global Search (`searchPatientsGlobal` lines 805–818):**
   ```javascript
   const regex = { $regex: escapedQuery, $options: 'i' };
   const patients = await Patient.find({
     doc_id: req.user,
     $or: [
       { fullName: regex }, { email: regex }, { phoneNumber: regex },
       { dateOfBirth: regex }, { address: regex }, { insuranceProvider: regex },
       { insurancePolicyNumber: regex }, { medications: regex }, { allergies: regex },
     ]
   }).limit(20);
   ```
   - 9 unanchored case-insensitive `$regex` conditions inside an `$or` block.
   - Zero indexes exist for these fields. Even if indexes existed, unanchored regex (`/query/i`) cannot perform B-tree index seeks. This guarantees a complete `COLLSCAN` on every search keystroke.
3. **Massive Unbounded CSV Import (`importPatients` lines 737–755):**
   ```javascript
   for (const item of csvData) {
     patients.push(newPatient.save());
   }
   await Promise.all(patients);
   ```
   - An imported CSV with 2,000 rows instantiates 2,000 concurrent promises and independent MongoDB write operations simultaneously. This saturates the Mongoose connection pool (default maxPoolSize: 100), spikes Node.js event loop lag, and exhausts heap memory. It should use `Patient.insertMany(csvData, { ordered: false })` in batches of 500.

#### B. Appointment Controller (`controllers/appointmentController.js`)
1. **Quadruple Full Collection Scan for Report Counts (`appointmentReport` lines 412–417):**
   ```javascript
   const [Scheduled, Cancelled, Complete, Pending] = await Promise.all([
     Appointment.find({ doctorID: req.user, status: 'Scheduled' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Cancelled' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Complete' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Pending' }).countDocuments()
   ]);
   ```
   - Executes 4 distinct `countDocuments()` queries simultaneously across an unindexed collection.
   - Can be replaced with a single aggregation pipeline using `$match` and `$group: { _id: "$status", count: { $sum: 1 } }` supported by an index on `{ doctorID: 1, status: 1 }`.
2. **Unbounded Query / Missing Limit (`allAppointments` lines 430–453):**
   ```javascript
   appointments = await Appointment.find(apptQuery).sort({ createdAt: -1 }).select('status email name time');
   ```
   - **Zero limit and zero pagination.** If a clinic has 15,000 appointments over 2 years, all 15,000 records are fetched, serialized to JSON, and transmitted over the network in a single HTTP request.

#### C. Medical Codes Controller (`controllers/medicalCodesController.js`)
1. **Unindexed Keystroke Search (`searchMedicalCodes` lines 104–116):**
   ```javascript
   const searchRegex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
   filter.$or = [
     { code: searchRegex },
     { description: searchRegex },
   ];
   const codes = await MedicalCode.find(filter).sort({ type: 1, code: 1 }).skip(skip).limit(limit).lean();
   ```
   - In clinical documentation, doctors search for diagnosis and procedure codes on every keystroke.
   - Bypasses the `$text` index and runs an unanchored regex across thousands of codes on every character typed.
   - Zero caching: Static ICD-10 and CPT codes never change, yet hit MongoDB repeatedly.

#### D. Invoice Analytics Controller (`controllers/Invoice/getInvoiceAnalytics.js`)
1. **5-Way Parallel Unindexed Aggregation / Scan (lines 16–53):**
   - Runs 2 `$group` aggregations and 3 `countDocuments` queries in parallel via `Promise.all` on an unindexed `invoices` collection.
   - All 5 metrics (`subTotal`, `totalCount`, `subTotalToday`, `paidCount`, `unpaidCount`) can be resolved in a single indexed `$facet` aggregation pipeline.

---

## 3. Memory Consumption, Stream Lifecycles & File Management Audit

### 3.1 Profiling Heavy Operations

#### A. Headless Chromium Leak in PDF Generation (`controllers/Downloads/reportDocx.js`)
Lines 206–218:
```javascript
async function createPdfFromHtml(html) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setContent(html);
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
}
```
**Fatal Architectural Flaws:**
1. **Orphaned Chromium Processes:** There is NO `try ... finally` block wrapping `page.setContent` and `page.pdf`. If Chromium encounters a rendering error, syntax exception, or timeout, execution jumps directly to the outer `catch` block, skipping `browser.close()`. The Chromium process remains alive as a zombie process in the OS, holding ~150 MB to 300 MB of RAM. Under repeated traffic or error conditions, this causes severe system-wide memory exhaustion.
2. **Launch-per-Request Overhead:** Spawning a brand-new browser process per PDF download incurs a 1.5–3.0 second latency penalty and massive CPU spike. A persistent browser singleton or worker pool with managed page recycling is mandatory.
3. **Redundant Code Duplication:** `createDocxToPdf` is duplicated word-for-word in lines 126–205 and lines 238–317 of `reportDocx.js`.

#### B. Audio Transcription & Stream Lifecycles (`controllers/openaiController.js`)
Lines 10–26 (`speechToText`):
```javascript
async function speechToText(file) {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(file.path),
            model: "whisper-1",
        });
        return {response:true , msg: transcription.text} 
    } catch (e) {
        return {response:false , msg: e.error.message} 
    } finally {
        fs.unlink(file.path, (err) => {
            if (err) console.error(err);
        });
    }
}
```
**Vulnerabilities & Memory Patterns:**
1. **Windows File Locking (`EBUSY` / `EPERM`):** `fs.createReadStream(file.path)` opens a stream to the file. When OpenAI's SDK reads the stream, if an exception occurs mid-upload or before stream closure, the underlying OS file descriptor remains locked on Windows. Calling `fs.unlink(file.path)` in `finally` fails with `EBUSY: resource busy or locked`, leaving temporary audio recordings permanently on disk in `./uploads`.
2. **Catch Block Null Pointer:** Line 21 attempts `msg: e.error.message`. If the error is a standard network error (e.g. timeout, DNS resolution failure, connection reset), `e.error` is `undefined`, causing an unhandled `TypeError: Cannot read properties of undefined (reading 'message')` inside the catch block.
3. **Double GPT Execution in Quick Audio Upload:** In `generateReportFromAudioFile` (line 1279):
   ```javascript
   const r = await voiceMethod(req.file, 'quick-upload').catch(() => null);
   ```
   When `voiceMethod` runs with `type: 'quick-upload'`, it falls into the `else` branch of `voiceMethod`:
   ```javascript
   const [answers] = await Promise.all([extractAnswersforUpdate(result.msg)]);
   ```
   It unnecessarily calls OpenAI GPT-4 to extract intake form answers that are immediately discarded, before proceeding to call GPT-4o-mini again to format the clinical SOAP note. This wastes 5–10 seconds of processing time, doubles API token costs, and doubles memory allocation for transcription payloads.

#### C. Unbounded Memory Buffers in TTS and Image Processing
1. **Text-to-Speech Buffer Ingestion (`downloadNoteAsAudio` line 903):**
   ```javascript
   const mp3 = await openai.audio.speech.create({ model: "tts-1", voice: selectedVoice, input: text });
   const buffer = Buffer.from(await mp3.arrayBuffer());
   res.send(buffer);
   ```
   Loads the entire generated audio file into a contiguous V8 heap buffer before transmission instead of piping the readable stream directly to Express (`mp3.body.pipe(res)`).
   *(Note also: In `index.js`, this route is registered as `app.get('/api/get/downloadNoteAsAudio', ...)`, but line 889 reads `req.body.text`, meaning GET requests fail because GET bodies are empty).*
2. **Base64 Image Memory Expansion (`extractPatientDataFromImage` lines 530–555 & `uploadLabFile` lines 126–128):**
   ```javascript
   const imageBuffer = fs.readFileSync(req.file.path);
   const base64Image = imageBuffer.toString('base64');
   ```
   A 12 MB high-resolution mobile camera photo of an insurance card or lab report is loaded into a 12 MB binary Buffer, and then converted into a 16 MB UTF-8 Base64 string in memory. For 10 concurrent users, this allocates >280 MB of heap memory.
3. **Synchronous File Reads on Hot Paths (`controllers/Visits/visitController.js` lines 9–17):**
   ```javascript
   function getOpenAiKey() {
     try {
       const src = fs.readFileSync(require("path").join(__dirname, "../openaiController.js"), "utf8");
       const m = src.match(/apiKey:\s*["']([^"']+)["']/);
       return m ? m[1] : process.env.OPENAI_KEY || "";
     } catch {
       return process.env.OPENAI_KEY || "";
     }
   }
   ```
   Every time a doctor creates or edits a visit, `fs.readFileSync` synchronously reads the 56 KB `openaiController.js` file from disk and parses it with regex! This blocks the Node.js event loop on clinical write operations.

#### D. Multer Temp File Leaks in `./uploads`
- In `index.js`, Multer is configured with `diskStorage`:
  ```javascript
  const storage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, './uploads'); },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split('/')[1];
      cb(null, file.fieldname + '-' + Date.now() + '.' + ext);
    }
  });
  ```
- **No Size Limits:** Multer options lack `limits: { fileSize: 25 * 1024 * 1024 }`. A client can upload a 1 GB file and fill the server disk.
- **Leaked File Paths:**
  - In `labController.js:uploadLabFile` (line 173): If the file uploaded is not an image or CSV (e.g. a PDF or unsupported format), it returns `res.status(400)` without unlinking `req.file.path`. The file remains in `./uploads` permanently.
  - In `pdfs/file-1728558226867.pdf`: A **22.4 MB PDF** was found sitting in the repository from previous uncleaned executions.

---

## 4. Redis / ioredis Caching & Connections Audit

### 4.1 The "Ghost Dependency" Analysis
Inspection of `package.json`:
- Line 41: `"ioredis": "^5.3.2"`
- Line 55: `"redis": "^4.6.13"`

A global repository search for `redis` across all `.js` files returned **zero occurrences outside of package.json and lockfiles**.
- Neither library is imported (`require('ioredis')` or `require('redis')`).
- No connection is established on server startup.
- No cache reads (`get`), writes (`set`), or invalidations (`del`) exist anywhere in the application.
- Dual-package bloat: Both `ioredis` and `redis` were installed, adding unnecessary dependency footprint and confusion without delivering any caching functionality.

---

### 4.2 Architectural Impact of Caching Absence

Because zero caching exists, the backend suffers from unnecessary database pressure, high latency, and vulnerability to traffic spikes:

1. **Static Medical Codes Lookup:**
   - ICD-10 and CPT codes (~70,000 standard healthcare codes) are completely static reference data.
   - Currently, every clinical search keystroke sends an HTTP POST request executing an unindexed `$or` `$regex` scan across MongoDB.
   - Under clinic operating hours with multiple doctors charting simultaneously, this hammers MongoDB with identical queries that should be served from sub-millisecond in-memory cache.
2. **Intake Form & Note Type Definitions:**
   - `noteTypeController.js:getQuestionsForIntake` queries MongoDB for the 33-question intake schema on every patient form load.
   - Note templates and questions are administrative configuration data that changes infrequently and is 100% cacheable.
3. **Provider Profile & Clinic Information:**
   - Every appointment confirmation, email generation, and PDF export repeatedly queries `User.findOne({ _id: userId })` to get clinic name, address, website, and signature URL.
4. **Token Blacklisting & Session Invalidation:**
   - There is no session invalidation mechanism. When a doctor logs out or changes passwords, issued JWT tokens remain valid until expiration because there is no Redis blacklist store.

---

### 4.3 Production-Grade Redis Architecture Blueprint

To eliminate redundant database load and protect MongoDB from connection saturation, a standardized Redis caching layer must be deployed:

```
                  ┌─────────────────────────────────────┐
                  │          Express Backend            │
                  └──────────────┬──────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │   Redis Cache    │            │  MongoDB Cluster │
       │ (ioredis client) │            │   (Mongoose 5)   │
       └──────────────────┘            └──────────────────┘
         - Medical Codes                 - Patients & Visits
         - Note Templates                - Appointments
         - User Profiles                 - Financial Records
         - Rate Limiting                 - Long-term Storage
```

#### 1. Unified Client Singleton (`config/redis.js`)
- Standardize on `ioredis` (remove `redis` package).
- Implement robust reconnection backoff, error logging, and graceful degradation (circuit breaker pattern) so that if Redis is unavailable, the application logs a warning and falls back to MongoDB without crashing.

#### 2. Key Namespacing Standard
All cache keys must follow a strict hierarchical namespace:
- Medical code searches: `aims:medcodes:search:<type>:<normalized_query>` (TTL: 24h)
- Medical code categories: `aims:medcodes:categories:<type>` (TTL: 24h)
- Note types & intake questions: `aims:notetypes:slug:<slug>` (TTL: 12h)
- Doctor / Clinic Profile: `aims:user:<userId>` (TTL: 1h)
- Daily schedule summary: `aims:schedule:<doctorId>:<YYYY-MM-DD>` (TTL: 5m)

#### 3. Strict TTL Enforcement
To prevent unbounded cache memory growth, **every single `SET` command must include an explicit expiration (`EX` or `EXAT`)**. No keys may be created without TTLs.

#### 4. Cache Invalidation Strategy
- **Cache-Aside (Read-Through):**
  - Check Redis for key -> Return if hit -> On miss, query MongoDB -> Write to Redis with TTL -> Return result.
- **Write-Through Invalidation:**
  - When `updateProfile` is called: `redis.del('aims:user:' + req.user)`
  - When `addCustomCode` or `updateCustomCode` is called: Invalidate `aims:medcodes:*` keys via namespace scan/del.
  - When `updateNoteType` is called: Invalidate `aims:notetypes:*`.
  - When appointments change status: Invalidate `aims:schedule:<doctorId>:*`.

---

## 5. Risk Assessment Matrix

| ID | Domain | Vulnerability / Defect | Severity | Impact | Remediation Effort |
|---|---|---|---|---|---|
| **SEC-01** | Database / Auth | Passwords encrypted via symmetric AES instead of salted bcrypt; `password` field lacks `select: false` | **HIGH** | Plaintext password recovery if JWTSECRET leaks; credential exposure in API payloads | Low |
| **SEC-02** | Database / Auth | Missing ownership verification in `deletePatientHitory` | **HIGH** | Cross-tenant clinical record deletion by any authenticated doctor | Low |
| **RES-01** | Memory / Streams | Puppeteer headless Chromium instances lack `try ... finally` closure; launch-per-request | **HIGH** | Zombie Chromium processes consume 150–300MB RAM each, triggering server OOM crash | Medium |
| **PERF-01** | Indexing / DB | Zero indexes on `Patients`, `Visit`, `Appointment`, `Invoice`, `Document`, `CheckNotes` | **HIGH** | Full collection scans on every clinical view; MongoDB in-memory 32MB sort crashes | Medium |
| **PERF-02** | Query / DB | `allAppointments` fetches entire database collection with NO limit and NO pagination | **HIGH** | Node.js memory spike and network congestion under production data volume | Low |
| **PERF-03** | Query / DB | Unanchored 9-field `$or` `$regex` search in `searchPatientsGlobal` | **HIGH** | High CPU, unindexable collection scans on every patient search keystroke | Medium |
| **LEAK-01** | Memory / Multer | Leaked temp files in `./uploads` on unsupported files and upload errors; 22.4MB PDF lingering in `pdfs/` | **MEDIUM** | Disk space depletion over time on production server | Low |
| **ARCH-01** | Redis / Caching | Both `ioredis` and `redis` installed but 0% utilized; zero caching layer across entire app | **MEDIUM** | Unnecessary MongoDB load, clinical auto-complete latency, dependency bloat | Medium |
| **SCHEMA-01**| Database | 5 different naming conventions for Doctor ID and 3 for Patient ID; untyped `[{ type: Object }]` in `Visit` | **MEDIUM** | Broken populate references, silent schema drift, `req.user._id` undefined bugs | Medium |
| **PERF-04** | Memory / IO | `fs.readFileSync` on 56KB `openaiController.js` executed on every visit creation/edit | **MEDIUM** | Synchronous disk I/O blocking Node event loop during clinical charting | Low |

---

## 6. Actionable Remediation Roadmap

### Phase 1: Critical Stability & Security Hotfixes (Immediate)
1. **Puppeteer Process Protection:** Wrap `createPdfFromHtml` in `reportDocx.js` with `try ... finally { if (browser) await browser.close(); }` to prevent zombie Chromium process memory leaks.
2. **Password Security:** Migrate `UserSchema` password hashing to `bcryptjs.hash(password, 12)` and set `select: false` on the `password` field.
3. **Multi-Tenant Deletion Authorization:** Add `{ _id: pId, doc_id: req.user }` filter to `deletePatientHitory` and include `CheckNotes` and `LabResult` in cascading cleanup.
4. **Fix Unawaited Writes:** Add `await` to `doc.save()` in `controllers/Documents/Upload.js` and remove redundant `u.save()` after `User.create()`.
5. **Delete Deprecated Backup Artifact:** Remove `models/Visit.js.bak` and `controllers/CheckInOutNotes/CheckIn.js.bak-20260814`.

### Phase 2: Indexing & Query Optimization (High Priority)
1. **Apply Core Indexes:**
   - `Patients`: `{ doc_id: 1, createdAt: -1 }`, `{ doc_id: 1, fullName: 1 }`, `{ doc_id: 1, phoneNumber: 1 }`
   - `Visit`: `{ pId: 1, createdAt: -1 }`, `{ doc_id: 1, createdAt: -1 }`
   - `Appointment`: `{ doctorID: 1, time: 1 }` (unique to prevent double booking), `{ doctorID: 1, status: 1 }`, `{ patientID: 1 }`
   - `Invoice`: `{ docId: 1, createdAt: -1 }`, `{ docId: 1, status: 1 }`, `{ pId: 1 }`
   - `Document`: `{ pId: 1, createdAt: -1 }`
   - `CheckNotes`: `{ docId: 1, checkInDate: 1 }`
2. **Fix Pagination & Query Limits:**
   - Add default `limit(50)` and page bounds to `allAppointments`.
   - Add `.lean()` and `.select()` projections across all read-only listing endpoints.
3. **Consolidate Invoice Analytics:**
   - Replace the 5 separate queries in `getInvoiceAnalytics` with a single `$facet` aggregation pipeline.
4. **Fix Medical Codes Search:**
   - Update `searchMedicalCodes` to leverage MongoDB `$text` search or anchored prefix regex (`^query`).

### Phase 3: Resource Lifecycle & Redis Caching Deployment (Medium Priority)
1. **Deploy Redis Singleton (`config/redis.js`):**
   - Initialize `ioredis` with auto-reconnect, exponential backoff, and fallback bypass on error.
   - Remove redundant `"redis"` package from `package.json`.
2. **Implement Cache-Aside for Hot Datasets:**
   - Cache `searchMedicalCodes` and `getCodeCategories` in Redis with 24h TTL.
   - Cache `getQuestionsForIntake` and `getNoteTypes` with 12h TTL.
   - Cache doctor profile details for notification and template generation with 1h TTL.
3. **Multer & Stream Streamlining:**
   - Add `limits: { fileSize: 25 * 1024 * 1024 }` to Multer upload middleware.
   - Centralize cleanup utility to unlink files reliably in `finally` blocks across all upload controllers.
   - Stream TTS audio via `res.write()` / piping rather than buffering full audio files in memory.
4. **Clean Synchronous Reads:**
   - Remove `fs.readFileSync` from `visitController.js` and reference `process.env.OPENAI_KEY` directly.
