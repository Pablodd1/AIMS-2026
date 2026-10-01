# Empirical Challenge & Stress Test Report

**Target Document:** `AUDIT_AND_DESIGN_REPORT.md`  
**Target Codebase:** AIMS-2026 Electronic Health Record (EHR) & AI Smart Medical Assistant  
**Auditor/Challenger:** Challenger 2 (Empirical Challenger / Adversarial Critic)  
**Date:** September 7, 2026  
**Execution Harness:** `tests/empirical_challenge_suite.js` (Executed on Node.js v24.14.0)  
**Empirical Artifact:** `tests/empirical_results.json`  

---

## Challenge Summary

**Overall risk assessment**: **CRITICAL**

The empirical challenge suite executed runnable stress tests, simulation harnesses, and schema inspections against the four focal areas specified in the dispatch:
1. **String Corruption via `.replace(/json/g, '')` in `controllers/openaiController.js:268,487`**: 
   - *Adversarial Refutation:* The audit report's specific text claims that `"Johnson"` becomes `"ohnson"` and `"Json Street"` becomes `" Street"` were **empirically disproven**. `"Johnson"` does not contain the substring `"json"`, and the regex `/json/g` is case-sensitive so capital `"Json"` is untouched.
   - *Confirmed Critical Flaws:* The regex **does** corrupt actual lowercase `"json"` occurrences (e.g. `"json_schema_version"` -> `"_schema_version"`, `"output_format": "json"` -> `"output_format": ""`). 
   - *Novel Critical Vulnerability Discovered:* If OpenAI wraps code in uppercase ````JSON\n[...]\n````, `.replace(/json/g, '')` fails to strip `"JSON"`. `JSON.parse` crashes, `parseData` returns `null`, and `extractArrayKey(null)` returns `[]`, causing **silent 100% patient data erasure**.
2. **Quick Audio Upload Routing Defect in `openaiController.js:1278-1281` vs `voiceMethod`**: **CONFIRMED CRITICAL P0**. When `type === 'upload'`, `voiceMethod(req.file, 'quick-upload')` branches into the `else` block and runs the 31-question intake questionnaire parser (`extractAnswersforUpdate`). The prompt sent to OpenAI receives `Transcript:\n[object Object],[object Object]...` due to array string coercion, completely discarding the clinical dialogue.
3. **Multi-Tenant Unique Key Collision in `models/MedicalCode.js`**: **CONFIRMED HIGH P1**. Compound index `{ type: 1, code: 1 }` with `{ unique: true }` enforces global uniqueness across clinics. Doctor B's custom code collides with Doctor A's custom code, throwing MongoDB `E11000 duplicate key error`. Additionally, `medicalCodesController.js:167` blocks Doctor B at the application layer with HTTP 409.
4. **Query Regex Bottlenecks & Dead Text Index**: **CONFIRMED HIGH P1**. `Patient.find` evaluates 9 unanchored case-insensitive regular expressions per document across an unindexed `doc_id` collection. For 25,000 patients, worst-case searches execute **225,000 regex evaluations**, blocking the Node.js event loop. In `medicalCodesController.js`, regex searches completely bypass the Mongoose text index `{ description: 'text', code: 'text' }`.

---

## Challenges

### [Critical] Challenge 1: Quick Audio Upload Pipeline Inversion & `[object Object]` Prompt Corruption

- **Assumption challenged**: The endpoint `/api/post/generateReportFromAudioFile` assumes that calling `voiceMethod(req.file, 'quick-upload')` will transcribe audio and return the doctor-patient conversation text in `r.msg`.
- **Attack scenario**: 
  1. A clinician records or uploads an ambient clinical consultation (`.wav` / `.m4a` / `.mp3`) and posts to `/api/post/generateReportFromAudioFile` with `type: 'upload'`.
  2. Line 1279 invokes `voiceMethod(req.file, 'quick-upload')`.
  3. Inside `voiceMethod(file, type)` (`openaiController.js:649-685`), the control flow evaluates:
     ```javascript
     if (type == "create") {
       // runs extractAnswers(result.msg)
     } else {
       // 'quick-upload' enters HERE!
       const [answers] = await Promise.all([extractAnswersforUpdate(result.msg)]);
       const parsed = parseData(answers);
       return { response: true, msg: extractArrayKey(parsed) };
     }
     ```
  4. `extractAnswersforUpdate` instructs GPT-4o-mini to extract answers for an intake questionnaire of 31 predefined questions.
  5. `extractArrayKey(parsed)` extracts an **Array of 31 Question-Answer Objects** (e.g. `[{ id: 1, question: "...", answer: "..." }, ...]`).
  6. In `generateReportFromAudioFile` (line 1280), `transcript` is assigned this Array of Objects (`transcript = r && r.msg;`).
  7. In line 1299, the prompt is concatenated: `prompt + '\n\nTranscript:\n' + transcript`.
  8. In JavaScript, concatenating a string with an Array of Objects invokes `Array.prototype.toString()`, converting `transcript` into:
     `"Transcript:\n[object Object],[object Object],[object Object],[object Object]..."`.
  9. OpenAI receives literal `[object Object]` strings instead of clinical dialogue. The model hallucinates or outputs empty SOAP notes.
  10. Line 1307 returns `{ original: transcript }` to the frontend, exposing the parsed intake array rather than the acoustic transcript.
- **Blast radius**: Every clinician using the quick audio upload feature experiences complete loss of consultation data and receives hallucinated, clinically dangerous notes.
- **Mitigation**:
  1. In `openaiController.js:649`, add an explicit branch in `voiceMethod` for `type === 'quick-upload'` (or `raw`) that immediately returns `{ response: true, msg: result.msg }` (the raw Whisper transcription string).
  2. Alternatively, in `generateReportFromAudioFile`, bypass `voiceMethod` entirely and call `speechToText(req.file)` directly.
  3. Add runtime type validation before prompt construction: `if (typeof transcript !== 'string') throw new Error('Transcript must be string')`.

---

### [Critical] Challenge 2: Refutation of Audit Report Examples vs. Discovery of Uppercase Code Fence Total Data Loss in `.replace(/json/g, '')`

- **Assumption challenged**: 
  1. `AUDIT_AND_DESIGN_REPORT.md` (Section 5.8, lines 1076–1077) claimed:
     - *"A patient whose last name is 'Johnson' is corrupted to 'ohnson'."*
     - *"A clinical note mentioning 'Json Street' is corrupted to ' Street'."*
  2. `openaiController.js:268,487` assumes that chained `.replace(/```/g, '').replace(/json/g, '')` safely strips Markdown code fences from LLM responses without adverse side-effects.
- **Attack scenario & Empirical Refutation**:
  - **Empirical Refutation of Report Claim:**
    We ran tests against the exact string replacement `str.replace(/json/g, '')`:
    - `"David Johnson".replace(/json/g, '')` yields `"David Johnson"` (NOT `"David ohnson"`). "Johnson" has letters `j-o-h-n-s-o-n`; it contains no substring `"json"`.
    - `"123 Json Street".replace(/json/g, '')` yields `"123 Json Street"` (NOT `"123  Street"`). The regex is `/json/g` (case-sensitive); capital `"Json"` is ignored.
  - **Discovery of True Severe Vulnerabilities:**
    1. **Key Corruption:** A response with keys such as `{"json_schema_version": "1.0", "patient_json_data": {}}` becomes `{"_schema_version": "1.0", "patient__data": {}}`, mangling data contracts.
    2. **Value Erasure:** Any legitimate clinical mention containing lowercase `"json"` (e.g., lowercase `"json street"`, `"json parser"`, `"format": "json"`) has the word deleted.
    3. **Fatal Uppercase Fence Crash (P0 Data Loss):**
       OpenAI frequently formats code fences with uppercase tags:
       ````JSON
       [{"id": 1, "question": "Chief Complaint", "answer": "Acute lumbar spine pain"}]
       ````
       When this occurs:
       - `.replace(/```/g, '')` removes the backticks.
       - `.replace(/json/g, '')` does NOT match `"JSON"`.
       - `cleanedString` begins with `"JSON\n[{..."`.
       - `JSON.parse(cleanedString)` throws: `SyntaxError: Unexpected token 'J', "JSON\n[{"id"... is not valid JSON`.
       - In `openaiController.js:790` (`parseData`), the catch block logs error and returns `null`.
       - In `openaiController.js:671`, `extractArrayKey(null)` returns `[]` (empty array).
       - The clinician receives `{ success: true, data: [] }`. **All intake questionnaire data is permanently and silently lost.**
- **Blast radius**: Complete data loss on any LLM response utilizing uppercase ````JSON` code fences; mangled JSON payload keys on responses utilizing `json` attributes.
- **Mitigation**:
  Replace both lines (`openaiController.js:268,487`) with an anchored regex fence stripper:
  ```javascript
  const cleanedString = response.choices[0].message.content
    .replace(/^```(?:json|JSON)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  ```
  Alternatively, configure OpenAI API request with `response_format: { type: "json_object" }` and eliminate code fences entirely.

---

### [High] Challenge 3: Multi-Tenant Custom Medical Code Unique Index Collision

- **Assumption challenged**: `models/MedicalCode.js` assumes that indexing `{ type: 1, code: 1 }` with `{ unique: true }` provides adequate uniqueness for medical codes while allowing doctors to add custom codes (`isCustom: true`, `docId`).
- **Attack scenario**:
  1. Doctor Alpha (`docId: "doc_alpha_123"`) adds a custom CPT code for their clinic:
     `{ type: "cpt", code: "99214-CUSTOM", description: "Alpha Extended Exam", isCustom: true, docId: "doc_alpha_123" }`.
  2. Doctor Beta (`docId: "doc_beta_456"`), belonging to an entirely different clinic tenant, attempts to create their own custom code with the same identifier:
     `{ type: "cpt", code: "99214-CUSTOM", description: "Beta Rehab Protocol", isCustom: true, docId: "doc_beta_456" }`.
  3. **Application Level Block:** In `controllers/medicalCodesController.js:167`:
     ```javascript
     const existing = await MedicalCode.findOne({ type, code });
     if (existing) {
       return res.status(409).json({ response: false, msg: 'Code already exists', code: existing });
     }
     ```
     The query omits `docId`, returning HTTP 409 to Doctor Beta and leaking Doctor Alpha's code object in the response.
  4. **Database Level Crash:** Even if the controller check were bypassed, MongoDB's unique index `{ type: 1, code: 1 }` throws:
     `E11000 duplicate key error collection: aims.medicalcodes index: type_1_code_1 dup key: { type: "cpt", code: "99214-CUSTOM" }`.
  5. **`undefined` `docId` Bug:** In `controllers/medicalCodesController.js:156`:
     `const docId = req.user?._id || req.body.docId;`
     Because `authMiddleware.js` assigns `req.user = decoded.id` (primitive string), `req.user._id` evaluates to `undefined`. If `req.body.docId` is omitted, `docId` is stored as `null`, converting custom codes into global system codes!
- **Blast radius**: Multi-tenant isolation failure; cross-tenant code collisions; denial of service on custom code creation; inadvertent promotion of doctor custom codes to system-wide catalog.
- **Mitigation**:
  1. Drop index `type_1_code_1` in `models/MedicalCode.js`.
  2. Create a compound index with tenant scope:
     ```javascript
     MedicalCodeSchema.index({ type: 1, code: 1, docId: 1 }, { unique: true });
     ```
  3. Or use a partial filter expression separating system codes from custom codes:
     ```javascript
     MedicalCodeSchema.index(
       { type: 1, code: 1 },
       { unique: true, partialFilterExpression: { isCustom: false } }
     );
     MedicalCodeSchema.index(
       { type: 1, code: 1, docId: 1 },
       { unique: true, partialFilterExpression: { isCustom: true } }
     );
     ```
  4. Fix `controllers/medicalCodesController.js:156` to read `const docId = req.user;`.
  5. Scope duplicate check to `docId`: `MedicalCode.findOne({ type, code, docId })`.

---

### [High] Challenge 4: Query Regex COLLSCAN Bottlenecks & Mongoose Text Index Bypass

- **Assumption challenged**: The search implementation in `controllers/patientController.js:805-818` and `controllers/medicalCodesController.js:95-134` assumes that MongoDB regular expressions provide responsive, scalable autocomplete search.
- **Attack scenario & Benchmark Results**:
  - In `patientController.js:searchPatientsGlobal`:
    ```javascript
    const regex = { $regex: escapedQuery, $options: 'i' };
    Patient.find({
      doc_id: req.user,
      $or: [
        { fullName: regex }, { email: regex }, { phoneNumber: regex },
        { dateOfBirth: regex }, { address: regex }, { insuranceProvider: regex },
        { insurancePolicyNumber: regex }, { medications: regex }, { allergies: regex }
      ]
    }).limit(20);
    ```
  - **Empirical Benchmark on Synthetic Patient Collections (`tests/empirical_challenge_suite.js`):**
    | Collection Size | Worst-Case Search Latency (COLLSCAN) | Regex Evaluations | Regex Tests / Doc |
    |---|---|---|---|
    | **1,000 patients** | 2.06 ms | 9,000 | 9.0 |
    | **5,000 patients** | 4.50 ms | 45,000 | 9.0 |
    | **10,000 patients** | 7.67 ms | 90,000 | 9.0 |
    | **25,000 patients** | 19.74 ms | 225,000 | 9.0 |
  - **Keystroke Concurrency Burst:** 25 rapid search requests against 10,000 patients pinned the Node.js event loop for **49.44 ms**.
  - Because `doc_id` is completely unindexed in `models/Patients.js`, MongoDB cannot pre-filter by doctor, forcing a full collection scan across all tenants' patients on every character typed.
  - **Text Index Bypass in `medicalCodesController.js`:**
    - `models/MedicalCode.js:50` defines `MedicalCodeSchema.index({ description: 'text', code: 'text' })`.
    - However, `controllers/medicalCodesController.js:105-108` queries:
      ```javascript
      filter.$or = [{ code: searchRegex }, { description: searchRegex }];
      ```
    - MongoDB query planner **never** routes regex queries to text indexes. The text index consumes memory and write overhead without ever being used.
- **Blast radius**: High latency on search bars; CPU saturation under multi-user typing; MongoDB Atlas tier quota exhaustion.
- **Mitigation**:
  1. Add compound indexes to `models/Patients.js`:
     `PatientSchema.index({ doc_id: 1, fullName: 1 });`
     `PatientSchema.index({ doc_id: 1, phoneNumber: 1 });`
     `PatientSchema.index({ doc_id: 1, email: 1 });`
  2. In `controllers/patientController.js`, replace unanchored regex with prefix anchors (`^query`) or MongoDB `$text` search with an Atlas Search index.
  3. In `controllers/medicalCodesController.js`, update search to use `{ $text: { $search: query } }` or prefix matching on indexed code fields.

---

## Stress Test Results

| Test ID | Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **ST-01** | Audit Claim: "Johnson" string replacement | Report claimed "Johnson" -> "ohnson" | "Johnson" is unaltered (contains no "json") | **CHALLENGED / REFUTED** |
| **ST-02** | Audit Claim: "Json Street" string replacement | Report claimed "Json Street" -> " Street" | "Json Street" is unaltered (case-sensitive regex) | **CHALLENGED / REFUTED** |
| **ST-03** | Lowercase "json" deletion in clinical note | String intact | Substring deleted ("123 json street" -> "123  street") | **FAIL (DEFECT CONFIRMED)** |
| **ST-04** | API response key destruction | JSON keys preserved | Keys mutilated (`json_schema_version` -> `_schema_version`) | **FAIL (DEFECT CONFIRMED)** |
| **ST-05** | Uppercase ````JSON` code fence from OpenAI | Clean parse into JSON | Crash on `JSON.parse`, returns `null`, data completely erased | **FAIL (CRITICAL BUG FOUND)** |
| **ST-06** | Quick Audio Upload routing in `generateReportFromAudioFile` | Raw transcript passed to SOAP generator | Array of 31 intake Q&As passed; coerced to `[object Object]` | **FAIL (CRITICAL BUG CONFIRMED)** |
| **ST-07** | Doctor B creates custom CPT code existing for Doctor A | Independent custom code created | Blocked by Controller (409) and DB (E11000 duplicate key) | **FAIL (MULTI-TENANT BUG CONFIRMED)** |
| **ST-08** | Custom code creation with corrected compound index | Both tenants succeed | Independent storage under `{ type, code, docId }` | **PASS (FIX VERIFIED)** |
| **ST-09** | Scalability of unanchored regex across 25k patients | Sub-millisecond indexed lookup | 19.74 ms, 225,000 regex evaluations on single query | **FAIL (PERFORMANCE BOTTLENECK CONFIRMED)** |
| **ST-10** | Text index utilization in `medicalCodesController.js` | Uses `$text` index | Completely bypassed by `$or` regex, forces full COLLSCAN | **FAIL (INDEX BYPASS CONFIRMED)** |

---

## Unchallenged Areas

- **Domain 1 (Authentication Backdoor at `index.js:93`):** Verified by inspections; out of scope for empirical test assignment.
- **Domain 3 (Puppeteer Headless Chromium Leaks & PDF Streams):** Resource leak analysis documented in report; memory profiling was not within the assigned four tasks.
- **Domain 5 (UI/UX Blueprint & CSS Tokens):** Design system specifications and HTML accessibility evaluations are visual/frontend design deliverables outside empirical backend testing scope.
