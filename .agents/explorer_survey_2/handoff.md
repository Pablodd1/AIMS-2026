# Handoff Report — Survey Explorer 2 (Database, Schemas, Indexing, Memory & Redis)

**Task:** Survey Explorer 2  
**Handoff Type:** Hard (Task Complete)  
**Author:** Survey Explorer 2  
**Recipient:** Lead Orchestrator (`parent`)  
**Date:** 2026-09-07  
**Artifact Generated:** `C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_2/survey_report.md`

---

## 1. Observation

### Database Schemas & Models
- **Missing Indexes across Primary Collections:**
  - `models/Patients.js` (lines 6–109): Zero indexes defined (`PatientSchema.indexes()` is empty). Contains 70+ fields; foreign key `doc_id` is defined as `type: String, required: true` without an `ObjectId` type, without `ref: 'User'`, and without an index.
  - `models/Visit.js` (lines 5–92): Zero indexes defined. Foreign key `pId` is defined as `type: String, required: true` without `ref: 'Patient'`. Critical clinical fields are declared as untyped objects: `cptCodes: [{ type: Object }]` (line 55), `icdCodes: [{ type: Object }]` (line 58), `dxCodes: [{ type: Object }]` (line 61), `redFlags: [{ type: Object }]` (line 77), and `treatmentSuggestions: { type: Object }` (line 80).
  - `models/Appointment.js` (lines 5–39): Zero indexes defined. `patientID` and `doctorID` are defined as raw strings with no `ref`. `time` is stored as an unindexed string (`"YYYY-MM-DD HH:MM AM/PM"`). There is zero unique constraint on `{ doctorID, time }`.
  - `models/Invoice.js` (lines 5–37), `models/Document.js` (lines 5–33), `models/CheckNotes.js` (lines 6–38): Zero indexes defined.
  - `models/LabResult.js` (lines 4–50): Only `patientId` has `index: true` (line 8); `doctorId` has no index.
  - `models/MedicalCode.js` (lines 48–50): Defines `{ type: 1, code: 1 }` with `{ unique: true }`. However, custom doctor codes share this namespace via `docId` (line 42). Two doctors adding the same custom code triggers duplicate key error `E11000`. Text index `{ description: 'text', code: 'text' }` (line 50) is never used in `controllers/medicalCodesController.js`.
- **Schema Drift & Identifier Inconsistency:**
  - Doctor reference: `doc_id` (`Patients.js:7`, `Visit.js:10`), `doctorID` (`Appointment.js:10`), `docId` (`CheckNotes.js:7`, `Invoice.js:6`, `MedicalCode.js:42`, `FavoriteCode.js:5`), `doctorId` (`LabResult.js:10`), `userId` (`Document.js:6`).
  - Patient reference: `pId` (`Visit.js:6`, `CheckNotes.js:11`, `Document.js:14`, `Invoice.js:10`), `patientID` (`Appointment.js:6`), `patientId` (`LabResult.js:5`).
  - In `middleware/authMiddleware.js` (line 16): `req.user = decoded.id` assigns a string ID. But in `controllers/medicalCodesController.js` (lines 156, 194, 225, 254, 266), the code references `req.user?._id`, which is `undefined`, causing custom codes and favorites to fail or save with `docId: undefined`.
- **Security Vulnerabilities in Schemas:**
  - `models/User.js` (line 42): `password` lacks `select: false`. In `controllers/userController.js` (lines 65–68), passwords are encrypted using reversible symmetric AES (`CryptoJS.AES.encrypt(password, process.env.JWTSECRET)`), despite `"bcryptjs": "^2.4.3"` being installed.
  - `controllers/userController.js:deletePatientHitory` (lines 487–521): Does not verify that the target patient `pId` belongs to `req.user`. It deletes from `Patients`, `Visit`, `Document`, `Invoice`, `Appointment`, but leaves orphan records in `CheckNotes` and `LabResult`.

### Query Efficiency & Controller Bottlenecks
- `controllers/patientController.js` (lines 209–212): `Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNumber)` performs an unindexed scan and memory sort.
- `controllers/patientController.js` (lines 805–818): `searchPatientsGlobal` runs 9 unanchored case-insensitive `$regex` filters inside an `$or` block, forcing full collection scans (`COLLSCAN`) on every search.
- `controllers/appointmentController.js` (lines 430–453): `allAppointments` executes `Appointment.find(apptQuery).sort({ createdAt: -1 })` with NO limit and NO pagination.
- `controllers/appointmentController.js` (lines 412–417): `appointmentReport` executes 4 parallel `countDocuments()` queries on an unindexed collection.
- `controllers/Invoice/getInvoiceAnalytics.js` (lines 16–53): Executes 5 simultaneous unindexed aggregation and count queries via `Promise.all`.
- `controllers/medicalCodesController.js` (lines 104–116): `searchMedicalCodes` uses `$or: [{ code: searchRegex }, { description: searchRegex }]` with case-insensitive `RegExp`, bypassing the defined text index and scanning all codes on every autocomplete keystroke.
- `controllers/Visits/visitController.js` (lines 9–17): `getOpenAiKey()` synchronously reads the 56 KB `openaiController.js` file from disk (`fs.readFileSync`) on every visit creation/edit.

### Memory Leaks, Stream Lifecycles & File Management
- **Puppeteer Headless Process Leak:** In `controllers/Downloads/reportDocx.js` (lines 206–218), `createPdfFromHtml` launches `puppeteer.launch()` per request. If `page.setContent` or `page.pdf` throws, `await browser.close()` is never executed because it is outside a `try ... finally` block. Orphaned Chromium instances remain resident in RAM.
- **Multer Leaks & Windows Locking:**
  - `controllers/labController.js` (lines 172–174): Unsupported or PDF uploads trigger early return without deleting `req.file.path`.
  - `controllers/openaiController.js` (lines 10–26): `fs.createReadStream(file.path)` passed to `openai.audio.transcriptions.create`. In `finally`, `fs.unlink(file.path)` can fail with `EBUSY` on Windows if the stream descriptor is not yet released. In line 21, `e.error.message` throws `TypeError` if `e.error` is undefined.
  - `controllers/Documents/Upload.js` (line 23): `doc.save()` is executed without `await`, emitting unhandled promise rejections on failure.
  - Lingering artifact: A 22.4 MB PDF file (`file-1728558226867.pdf`) exists in `pdfs/`.

### Redis / Caching Layer
- `package.json` specifies `"ioredis": "^5.3.2"` (line 41) and `"redis": "^4.6.13"` (line 55).
- A search for `redis` across all `.js` files returned zero occurrences. Neither library is imported or used. There is zero caching for static medical codes, note types, user profiles, or calendar schedules.

---

## 2. Logic Chain

1. **Observations:** 10 out of 14 models define zero indexes. The fields queried in controllers (`doc_id`, `pId`, `doctorID`, `patientID`, `time`, `checkInDate`) have no indexes. Many queries use unanchored regex (`$regex: ... , $options: 'i'`) or sort on `createdAt` without compound indexing.
   **Deduction:** Every such query results in a MongoDB `COLLSCAN`. In-memory sorting of patient and appointment collections will exceed MongoDB's 32 MB limit as collections grow, leading to runtime 500 errors and high database CPU/memory consumption.

2. **Observations:** Foreign keys are raw strings without `ref` schemas. Staff profiles exist both in `User` arrays and independent `Doctor`/`Assistant` collections. Deletion endpoints do not cascade cleanly to `CheckNotes` and `LabResult`.
   **Deduction:** Relational integrity is compromised. Mongoose `.populate()` is completely broken. Orphan records accumulate silently upon patient or visit deletion.

3. **Observations:** `reportDocx.js` executes `puppeteer.launch()` per PDF request without a `try ... finally` block around `browser.close()`. Multer saves files to disk without size limits, and `labController.js` exits early on invalid file types without deleting uploaded files.
   **Deduction:** Server memory and disk space will leak under normal operation. A single failed PDF render leaves a 200 MB Chromium process alive, and repeated failed uploads permanently fill the `./uploads` directory.

4. **Observations:** Both `ioredis` and `redis` are installed dependencies, but neither is imported in any `.js` file. Autocomplete medical code searches run regex against MongoDB on every keystroke.
   **Deduction:** The platform suffers from ghost dependency bloat and operates entirely without a caching tier. Serving static reference data (ICD-10/CPT codes, note types) directly from MongoDB degrades autocomplete responsiveness and saturates database connection pools.

---

## 3. Caveats

- **Active Production Traffic:** Investigation was performed statically on the codebase; actual database query execution plans (`explain('executionStats')`) were not run against live MongoDB instances with millions of production documents.
- **External Services:** AWS S3 buckets, OpenAI API keys, and Twilio credentials were not invoked during read-only investigation.
- No other caveats.

---

## 4. Conclusion

The AIMS-2026 platform has critical scalability, stability, and security liabilities rooted in its data and memory layers:
1. **Severe Index Deficit:** Missing compound and single-field indexes on core collections will cause production crashes via memory sort limits and slow down clinical search workflows.
2. **Resource & Memory Leaks:** Puppeteer browser process leaks and Multer disk leaks represent acute server crash risks (OOM and ENOSPC).
3. **Ghost Caching:** The lack of a Redis caching layer forces high-frequency static reads to hit MongoDB, severely undermining response times.
4. **Security Vulnerabilities:** Symmetric password encryption and missing multi-tenant deletion authorization require immediate remediation.

Full detailed technical analysis, line references, and the architectural remediation blueprint have been documented in:
`C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_2/survey_report.md`

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Missing Indexes in Models:**
   - Inspect `models/Patients.js`, `models/Visit.js`, `models/Appointment.js`, `models/Invoice.js`, `models/Document.js`, `models/CheckNotes.js`. Observe absence of `.index(...)` calls and lack of `index: true` on query fields.
2. **Verify Puppeteer Process Leak:**
   - Inspect `controllers/Downloads/reportDocx.js` lines 206–218. Confirm that `await browser.close()` is on line 216 without an enclosing `finally` block around `page.setContent` and `page.pdf`.
3. **Verify Zero Redis Usage:**
   - Run Ripgrep command across all `.js` files:
     ```powershell
     rg -i "require\(['\"](ioredis|redis)['\"]\)" C:/Users/jasme/teamwork_projects/aims_2026 --glob "*.js"
     ```
     Result will be empty (no matches).
4. **Verify Symmetric Password Encryption:**
   - Inspect `controllers/userController.js` lines 65–68 and 123–125. Confirm `CryptoJS.AES.encrypt` and `CryptoJS.AES.decrypt` with `process.env.JWTSECRET`.
5. **Verify Multer Upload Leak:**
   - Inspect `controllers/labController.js` lines 172–174. Confirm that `res.status(400)` is returned without calling `fs.unlinkSync(req.file.path)`.
