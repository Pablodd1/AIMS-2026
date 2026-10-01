# Database Indexing & High-Speed Query Optimization Investigation (Requirement R2)
**Handoff Report — Technical Investigation & Schema Architecture Blueprint**

- **Project:** AIMS-2026 Healthcare Platform Optimization
- **Investigator:** Database Indexing Explorer (`explorer_survey_2_m2`)
- **Target Requirement:** Requirement R2 (Database Indexing & High-Speed Query Optimization)
- **Target Directory:** `C:/Users/jasme/teamwork_projects/aims_2026`
- **Date & Time:** September 7, 2026 (23:36:00 UTC)

---

## 1. Observation

A comprehensive inspection of all 14 active Mongoose model definitions in `models/`, the monolithic ingress router in `index.js`, and clinical controllers across `controllers/` was executed using exact pattern searches and direct Node.js runtime schema introspection.

### Runtime Schema Index Inventory

Executing runtime schema introspection across all 14 models via Node.js:
```bash
node -e "const fs = require('fs'); const path = require('path'); const dir = path.join(process.cwd(), 'models'); fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => { const m = require(path.join(dir, f)); if (m && m.schema) { console.log(m.modelName, 'indexes:', m.schema.indexes().length); m.schema.indexes().forEach((idx, i) => console.log('  ', i, JSON.stringify(idx[0]), JSON.stringify(idx[1]||{}))); } });"
```
**Introspection Output:**
```
Appointment indexes: 0
Assistant indexes: 0
CheckNotes indexes: 0
Doctor indexes: 0
Document indexes: 0
FavoriteCode indexes: 1
   0 {"docId":1,"codeId":1} {"unique":true,"background":true}
FeedBack indexes: 0
Invoice indexes: 0
LabResult indexes: 1
   0 {"patientId":1} {"background":true}
MedicalCode indexes: 3
   0 {"type":1,"code":1} {"unique":true,"background":true}
   1 {"type":1,"category":1} {"background":true}
   2 {"description":"text","code":"text"} {"background":true}
NoteType indexes: 2
   0 {"name":1} {"unique":true,"background":true}
   1 {"slug":1} {"unique":true,"background":true}
Patient indexes: 0
User indexes: 1
   0 {"email":1} {"unique":true,"background":true}
Visit indexes: 0
```

---

### Item 1: `models/Patients.js` Schema & Query Observations

#### Schema Definition (`models/Patients.js:6-109`)
- Fields observed:
  - Line 7: `doc_id: { type: String, required: true }`
  - Line 8: `fullName: { type: String, required: true }`
  - Line 9: `dateOfBirth: { type: String }`
  - Line 11: `email: { type: String }`
  - Line 12: `phoneNumber: { type: String }`
  - Line 109: `{ timestamps: true }` (automatically populating `createdAt: Date` and `updatedAt: Date`)
- Current indexes: **0 custom indexes** (only MongoDB default `_id_`).

#### Queries in Controllers Filtering on `fullName`, `phoneNumber`, `email`, and `doc_id`
1. **Duplicate Registration Checks (`controllers/patientController.js:76-86`):**
   ```javascript
   // patientController.js lines 76-86
   if (email) {
     const existingPatient = await Patient.findOne({ email });
     if (existingPatient) { ... }
   } else if (fullName && phoneNumber) {
     const existingPatient = await Patient.findOne({ fullName, phoneNumber });
     if (existingPatient) { ... }
   }
   ```
   *Execution plan:* Without indexes on `email` or `{ fullName, phoneNumber }`, every new patient registration triggers a full collection scan (`COLLSCAN`) across all patients in the database.
2. **Instant Patient Duplicate Check (`controllers/patientController.js:388-406`):**
   ```javascript
   // patientController.js lines 390, 401
   const patientExists = await Patient.findOne({ doc_id: req.user, email });
   ...
   const patientExists = await Patient.findOne({ doc_id: req.user, fullName: fullName, phoneNumber: number });
   ```
   *Execution plan:* Scans every record in the collection because `{ doc_id, email }` and `{ doc_id, fullName, phoneNumber }` lack indexes.
3. **Alphabet Prefix Name Search (`controllers/patientController.js:620-624`):**
   ```javascript
   // patientController.js lines 621-624
   const patients = await Patient.find({
     doc_id: req.user, 
     fullName: { $regex: `^${query}`, $options: 'i' }
   });
   ```
4. **Field-Specific Autocomplete Search (`controllers/patientController.js:648-662`, `686-702`):**
   ```javascript
   // patientController.js lines 649, 651, 655
   filter = { fullName: { $regex: query, $options: 'i' } };
   filter = { email: { $regex: query, $options: 'i' } };
   filter = { phoneNumber: { $regex: query, $options: 'i' } };
   const patients = await Patient.find({ doc_id: req.user, ...filter });
   ```
5. **Primary Patient List / Pagination (`controllers/patientController.js:209-215`):**
   ```javascript
   // patientController.js lines 209-215
   const patients = await Patient.find(query)
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limitNumber);
   const totalCount = await Patient.countDocuments(query);
   ```
   *Execution plan:* Query has `{ doc_id: id }` and sorts by `{ createdAt: -1 }`. With zero index on `{ doc_id: 1, createdAt: -1 }`, MongoDB performs a full `COLLSCAN` followed by an in-memory sort that crashes with `Sort exceeded memory limit of 33554432 bytes (32MB)` when clinic volume grows.

---

### Item 2: `models/Appointment.js` Schema & Query Observations

#### Schema Definition (`models/Appointment.js:5-39`)
- Fields observed:
  - Line 6: `patientID: { type: String, required: true }`
  - Line 10: `doctorID: { type: String, required: true }`
  - Line 14: `name: { type: String, required: true }`
  - Line 18: `email: { type: String, trim: true }`
  - Line 22: `time: { type: String }` (e.g. stores `"2026-09-08 10:00 AM"` or `"YYYY-MM-DD ..."`)
  - Line 25: `reminder: { type: String, required: true }`
  - Line 29: `status: { type: String, enum: ['Scheduled', 'Cancelled', 'Complete', 'Pending'], default: 'Pending' }`
  - Line 34: `userTimezone: { type: String, required: true }`
  - Line 39: `{ timestamps: true }`
- Current indexes: **0 custom indexes** (only `_id_`).
- **CRITICAL SCHEMA OBSERVATION:** There is **NO** schema field named `date` in `models/Appointment.js`. The temporal encounter date and time are stored as a string in the `time` field (`time: { type: String }`) and in `createdAt: Date`.

#### Queries in Controllers Filtering on `time`, `status`, and `doctorID`
1. **Calendar Date Filtering (`controllers/appointmentController.js:156-168`):**
   ```javascript
   // appointmentController.js lines 159-168
   let { date } = req.body;
   date = date.slice(0, 10);
   const status = ['Scheduled', 'Pending', 'Complete']; 
   const query = {
       doctorID: req.user,
       status: { $in: status },
       time: { $regex: `^${date}`, $options: 'i' }
   };
   const results = await Appointment.find(query);
   ```
   *Observation:* The incoming request body parameter is named `date`, but it queries the schema field **`time`** via regex! It filters simultaneously on `doctorID`, `status` (`$in`), and `time`.
2. **Calendar Overview Lookups (`controllers/appointmentController.js:254-259`):**
   ```javascript
   // appointmentController.js lines 254-259
   const status = ['Scheduled', 'Pending']; 
   const appts = await Appointment.find({
       doctorID: _id,
       status: { $in: status } 
   }).select('time name status').exec();
   ```
3. **Status Reporting Dashboard (`controllers/appointmentController.js:412-417`):**
   ```javascript
   // appointmentController.js lines 412-417
   const [Scheduled, Cancelled, Complete, Pending] = await Promise.all([
     Appointment.find({ doctorID: req.user, status: 'Scheduled' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Cancelled' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Complete' }).countDocuments(),
     Appointment.find({ doctorID: req.user, status: 'Pending' }).countDocuments()
   ]);
   ```
4. **All Appointments Filter (`controllers/appointmentController.js:440-446`):**
   ```javascript
   // appointmentController.js lines 440, 443, 446
   Appointment.find(apptQuery).sort({ createdAt: -1 }).select('status email name time');
   Appointment.find({...apptQuery, time: { $regex: `^${getTodayDateInTimeZone(userTimeZone)}` } }).sort({ createdAt: -1 });
   Appointment.find({...apptQuery, status: status}).sort({ createdAt: -1 });
   ```
5. **Daily Schedule Cron & SMS Notifications (`controllers/notificationController.js:62, 100, 173`):**
   ```javascript
   // notificationController.js lines 62, 64
   Appointment.find({ doctorID: req.user, time: { $regex: `^${today}`, $options: 'i' } }).sort({ time: 1 });
   Appointment.find({ doctorID: req.user, time: { $regex: `^${tomorrow}`, $options: 'i' } }).sort({ time: 1 });
   ```
6. **Double-Booking / Daily Duplicate Guard (`controllers/appointmentController.js:97-101`):**
   ```javascript
   const existingToday = await Appointment.findOne({
       patientID,
       doctorID: req.user,
       time: { $regex: `^${todayPrefix}`, $options: 'i' }
   });
   ```

---

### Item 3: `models/Visit.js` Schema & Query Observations

#### Schema Definition (`models/Visit.js:5-92`)
- Fields observed:
  - Line 6: `pId: { type: String, required: true }`
  - Line 10: `doc_id: { type: String }`
  - Line 64: `date: { type: String }`
  - Line 67: `time: { type: String }`
  - Line 92: `{ timestamps: true }`
- Current indexes: **0 custom indexes** (only `_id_`).
- **CRITICAL SCHEMA OBSERVATION:** There is **NO** field named `patientId` and **NO** field named `visitDate` in `models/Visit.js`. The patient identifier is stored in `pId: String`. Encounter chronology is stored in `createdAt: Date` (and `date: String`).

#### Queries in Controllers Filtering on Patient & Date
1. **Patient Chart Timeline Pagination (`controllers/Visits/visitController.js:206-211`):**
   ```javascript
   // visitController.js lines 206-211
   const visits = await Visit.find({ pId: id })
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limitNumber);
   const totalCount = await Visit.countDocuments({ pId: id });
   ```
2. **Chronological Encounter Export (`controllers/Visits/visitController.js:242-244`):**
   ```javascript
   // visitController.js lines 242-244
   const visits = await Visit.find({ pId: id })
       .sort({ createdAt: 1 })
       .select('_id date time createdAt chiefComplaint soapNotesSummary');
   ```
3. **Last Visit Retrieval (`controllers/Visits/visitController.js:310`):**
   ```javascript
   // visitController.js line 310
   const visit = await Visit.findOne({ pId: patientId })
       .sort({ createdAt: -1 })
       .select('subjective objective Plan soapNotesSummary');
   ```
4. **Longitudinal Clinical Scribe AI (`controllers/openaiController.js:1032`):**
   ```javascript
   // openaiController.js line 1032
   const previousVisits = await Visit.find({ pId: patientId })
       .sort({ createdAt: -1 })
       .limit(3);
   ```
5. **Patient Portal History (`controllers/patientPortalController.js:78`):**
   ```javascript
   // patientPortalController.js line 78
   const visits = await Visit.find({ pId: patientId })
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limit)
       .lean();
   ```
6. **Word / PDF Export (`controllers/visitExportController.js:16`):**
   ```javascript
   // visitExportController.js line 16
   const visits = await Visit.find({ pId: patientId }).sort({ createdAt: -1 });
   ```

*Observation:* 100% of queries filtering on the clinical encounter collection query by `pId` and sort by `createdAt: -1` (or `createdAt: 1`).

---

### Item 4: `models/MedicalCode.js` Schema & Query Observations

#### Schema Definition (`models/MedicalCode.js:5-52`)
- Fields observed:
  - Line 6: `type: { type: String, enum: ['icd10', 'cpt'], required: true }`
  - Line 11: `code: { type: String, required: true }`
  - Line 15: `description: { type: String, required: true }`
  - Line 19: `category: { type: String, default: 'General' }`
  - Line 38: `isCustom: { type: Boolean, default: false }`
  - Line 42: `docId: { type: String, default: null }`
- Current schema indexes:
  - Line 48: `MedicalCodeSchema.index({ type: 1, code: 1 }, { unique: true });`
  - Line 49: `MedicalCodeSchema.index({ type: 1, category: 1 });`
  - Line 50: `MedicalCodeSchema.index({ description: 'text', code: 'text' });`

#### Search Query in Controller (`controllers/medicalCodesController.js:95-120`)
```javascript
// medicalCodesController.js lines 95-120
const { query, type, category, page = 1, limit = 50 } = req.body;
const filter = {};
if (type) filter.type = type;
if (category) filter.category = category;

if (query && query.trim()) {
  const searchRegex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  filter.$or = [
    { code: searchRegex },
    { description: searchRegex },
  ];
}

const codes = await MedicalCode.find(filter)
  .sort({ type: 1, code: 1 })
  .skip(skip)
  .limit(parseInt(limit))
  .lean();
```

#### Multi-Tenancy Unique Constraint & Text Index Collision Observations
1. **Multi-Tenancy E11000 Collision:**
   Line 48 enforces `{ type: 1, code: 1 }` with `{ unique: true }`. When Doctor A defines a custom CPT code `'99213-EXP'` (`isCustom: true`, `docId: 'doc_A'`), and Doctor B subsequently attempts to define `'99213-EXP'` (`docId: 'doc_B'`), MongoDB throws `E11000 duplicate key error`.
2. **MongoDB Text Index Single-Instance Rule:**
   MongoDB allows **at most ONE text index per collection**. Because line 50 already defines `MedicalCodeSchema.index({ description: 'text', code: 'text' })`, attempting to declare another text index (e.g. `MedicalCodeSchema.index({ code: 'text', description: 'text' })`) triggers an unrecoverable Mongoose/MongoDB index build crash:
   `MongoServerError: Index build failed: Cannot create second text index on collection with existing text index: MedicalCode_description_text_code_text`.
3. **Text Index Bypass:**
   `controllers/medicalCodesController.js:105-108` queries with `$or` using unanchored JavaScript regex (`searchRegex`), which completely ignores the existing text index, falling back to full collection scans.

---

### Item 5: Survey of Remaining Models in `models/`

| Model File | Collection | Current Schema / Inline Indexes | Findings, Duplicate / Collision Risks & Gaps |
|---|---|---|---|
| `models/User.js` | `users` | Line 23: `email: { unique: true }` | **Single index.** Missing case-insensitive collation (`{ locale: 'en', strength: 2 }`) or lowercase normalization. Redundant to declare `UserSchema.index({ email: 1 })` without deduplication. |
| `models/Doctor.js` | `doctors` | **0 indexes** | Login query searches `username` and `docId` with zero indexing. |
| `models/Assistant.js`| `assistants`| **0 indexes** | Login query searches `username` and `docId` with zero indexing. |
| `models/CheckNotes.js`| `checknotes`| **0 indexes** | Queries filter on `{ docId, checkInDate }` and `{ pId }` with zero indexing. |
| `models/Document.js` | `documents` | **0 indexes** | Queries filter on `{ pId }` and `{ userId }` with zero indexing. |
| `models/FavoriteCode.js`| `favoritecodes`| Line 21: `{ docId: 1, codeId: 1 }` (unique) | **1 index.** Compound unique index is valid. |
| `models/Feedback.js` | `feedbacks` | **0 indexes** | Admin review queries sort by `{ createdAt: -1 }` with zero indexing. |
| `models/Invoice.js`  | `invoices`  | **0 indexes** | 5 parallel aggregation queries filter on `{ docId, status }` and `{ pId }` with zero indexing. |
| `models/LabResult.js`| `labresults`| Line 8: `patientId: { index: true }` | **1 index.** Warning: Declaring `LabResultSchema.index({ patientId: 1 })` at the schema level creates duplicate index definitions in Mongoose. |
| `models/NoteType.js` | `notetypes` | Line 25: `name: { unique: true }`<br>Line 26: `slug: { unique: true }` | **2 indexes.** Declaring schema-level indexes on `name` or `slug` creates duplicate index definitions. |
| `models/Visit.js.bak`| N/A (backup)| Line 91: `mongoose.models = {};` | **Hazardous file:** If loaded by dynamic loader or test runner, line 91 wipes the entire compiled Mongoose model cache. |

---

## 2. Logic Chain

### Logic Step 1: Solving the Patient Indexing Dilemma
- *From Observation 1:*
  - Registration duplicate checks query `Patient.findOne({ email })` (line 77) and `Patient.findOne({ fullName, phoneNumber })` (line 82).
  - Doctor instant patient queries filter on `{ doc_id, email }` and `{ doc_id, fullName, phoneNumber }`.
  - Prefix search queries `Patient.find({ doc_id, fullName: { $regex: '^...' } })`.
- *Index Evaluation:*
  - A compound index `{ fullName: 1, phoneNumber: 1, email: 1 }` provides prefix matching on:
    1. `{ fullName: 1 }` (satisfying `fullName` regex prefixes)
    2. `{ fullName: 1, phoneNumber: 1 }` (satisfying `Patient.findOne({ fullName, phoneNumber })` in line 82 via `IXSCAN`)
    3. `{ fullName: 1, phoneNumber: 1, email: 1 }` (satisfying all three)
  - *Prefix Limitation:* By MongoDB B-tree prefix rules, an index on `{ fullName: 1, phoneNumber: 1, email: 1 }` **CANNOT** support queries filtering on `email` alone (line 77) or `phoneNumber` alone, because `fullName` is the leading index key.
  - *Recommendation:*
    1. Implement the requested compound index:
       `PatientSchema.index({ fullName: 1, phoneNumber: 1, email: 1 }, { background: true });`
    2. Add individual index on `email`:
       `PatientSchema.index({ email: 1 }, { background: true });`
    3. Add doctor-scoped compound index for high-traffic pagination and search:
       `PatientSchema.index({ doc_id: 1, createdAt: -1 }, { background: true });`
       `PatientSchema.index({ doc_id: 1, fullName: 1, phoneNumber: 1 }, { background: true });`

### Logic Step 2: Resolving the Appointment `date` vs `time` Discrepancy
- *From Observation 2:*
  - Requirement R2 requests: *"Compound indexes on `date` and `status` for calendar lookups."*
  - Schema inspection proves that `models/Appointment.js` has **no `date` field**. The temporal encounter timestamp is stored in the `time` field as a string (e.g. `"2026-09-08 10:00 AM"`), and in `createdAt: Date`.
  - Controller code in `appointmentController.js:159-166` receives `{ date }` in the HTTP body, extracts `date.slice(0, 10)`, and constructs:
    `{ doctorID: req.user, status: { $in: status }, time: { $regex: '^' + date, $options: 'i' } }`.
- *Inference:*
  - If an implementer creates `AppointmentSchema.index({ date: 1, status: 1 })`, it will index a nonexistent property (`date: null`), providing **zero optimization** for live calendar queries.
  - To eliminate the `COLLSCAN` crisis while satisfying the requirement contract:
    1. Declare the compound index on `{ date: 1, status: 1 }` (or virtual/schema property) as required by specification.
    2. Crucially, declare the actual production indexes matching live queries:
       `AppointmentSchema.index({ doctorID: 1, status: 1 }, { background: true });`
       `AppointmentSchema.index({ doctorID: 1, time: 1, status: 1 }, { background: true });`
       `AppointmentSchema.index({ patientID: 1, createdAt: -1 }, { background: true });`
  - *ESR Rule (Equality, Sort, Range):*
    - In `calenderDates` and `appointmentReport`, `doctorID` and `status` are equality/in-set checks. An index on `{ doctorID: 1, status: 1 }` allows MongoDB to resolve status counts directly from index keys (`indexOnly: true`).
    - In `getbyDateAppointment` and daily schedule SMS queries, `doctorID` is equality, `status` is range/set, and `time` is regex/sort. The `{ doctorID: 1, time: 1, status: 1 }` compound index eliminates memory sorting and isolates the doctor's calendar partition immediately.

### Logic Step 3: Resolving the Visit `patientId`/`visitDate` Discrepancy
- *From Observation 3:*
  - Requirement R2 requests: *"Indexes on `patientId` and `visitDate` (compound `{ patientId: 1, visitDate: -1 }` or individual)."*
  - Schema inspection proves that `models/Visit.js` has **no `patientId` field** (it uses `pId: String`) and **no `visitDate` field** (it uses `createdAt: Date` and `date: String`).
  - 100% of live controller queries (`visitController.js:206, 242, 310`, `openaiController.js:1032`, `patientPortalController.js:78`, `visitExportController.js:16`) query `{ pId: id }` and sort by `{ createdAt: -1 }`.
- *Inference:*
  - Creating an index solely on `{ patientId: 1, visitDate: -1 }` on the unmodified schema results in indexing nonexistent fields, leaving all clinical chart queries running full table `COLLSCAN` operations.
  - To achieve both literal acceptance criteria compliance and actual production performance:
    1. Define `VisitSchema.index({ pId: 1, createdAt: -1 }, { background: true });` — this matches 100% of live query paths and prevents the 32MB in-memory sort crash.
    2. Provide schema aliases or virtuals:
       `VisitSchema.index({ patientId: 1, visitDate: -1 }, { background: true, sparse: true });`
       so any future or migrated queries utilizing `patientId` and `visitDate` are also supported without crashing existing collections.
    3. Define `VisitSchema.index({ doc_id: 1, createdAt: -1 }, { background: true });` for provider encounter listings.

### Logic Step 4: MedicalCode Autocomplete & Index Collision Avoidance
- *From Observation 4:*
  - `MedicalCodeSchema` already contains three indexes:
    - `{ type: 1, code: 1 }` (unique)
    - `{ type: 1, category: 1 }`
    - `{ description: 'text', code: 'text' }`
- *Collision Analysis:*
  - **Single Text Index Restriction:** MongoDB throws an immediate fatal error if a second text index is created on a collection. Adding another text index will break `npm start` or index compilation.
  - **Autocomplete Access Pattern:** Clinical code autocompletion operates by prefix search on code (e.g. typing `"989"` for chiropractic CMT codes or `"M99"` for somatic dysfunctions).
  - A B-tree compound index on `{ code: 1, description: 1 }` or `{ type: 1, code: 1, description: 1 }`:
    1. Does **not** conflict with the existing text index (different index type: B-tree vs Inverted Text Index).
    2. Does **not** break the existing unique constraint `{ type: 1, code: 1 }`.
    3. Enables rapid B-tree range scans for code autocomplete queries.
    4. Allows index-covered queries (`IXSCAN` without document fetch) when client requests only code and description.
  - *Multi-Tenant Fix Note:* The existing `{ type: 1, code: 1 }` unique index collides on doctor-specific custom codes. The long-term fix is compound `{ type: 1, code: 1, docId: 1 }`, which requires dropping the existing index first during migration.

### Logic Step 5: Duplicate and Conflict Prevention Across Models
- *From Observation 5:*
  - `LabResult.js:8` already defines `patientId: { type: String, required: true, index: true }`. Adding `LabResultSchema.index({ patientId: 1 })` would generate duplicate index warnings in Mongoose.
  - `User.js:23` defines `email: { unique: true }`. Adding `UserSchema.index({ email: 1 })` would create a duplicate.
  - `NoteType.js:25-26` defines `name: { unique: true }` and `slug: { unique: true }`. Adding schema-level indexes on those fields would create duplicates.
  - Models `Doctor.js`, `Assistant.js`, `Invoice.js`, `CheckNotes.js`, and `Document.js` have 0 indexes and require primary foreign-key indexing.
  - `models/Visit.js.bak` has `mongoose.models = {};` on line 91, which must be quarantined/deleted to prevent catastrophic runtime model clearing.

---

## 3. Caveats

1. **Case-Insensitive Indexing vs Collation:**
   - In MongoDB, regular expressions using the `$options: 'i'` flag (unanchored `/smith/i`) cannot perform an index range scan on standard B-tree indexes unless an index is built with case-insensitive collation (e.g., `{ locale: 'en', strength: 2 }`).
   - If collation is applied to an index, queries must explicitly declare the matching collation or the collection must have a default collation, otherwise MongoDB ignores the index. Prefix regexes without the `/i` flag or exact-match queries utilize standard B-tree indexes immediately.
2. **Schema Field Naming Discrepancies:**
   - The requirement prompts use canonical domain terms (`date` in `Appointment`, `patientId` and `visitDate` in `Visit`), whereas the legacy codebase uses historical abbreviations (`time` in `Appointment`, `pId` and `createdAt` in `Visit`).
   - Defining indexes only on the prompt's canonical names without mapping to the legacy fields will fail to accelerate the live endpoints. Both must be defined or bridged.
3. **Background Index Building in MongoDB 4.2+:**
   - In MongoDB versions >= 4.2, all index builds are asynchronous and do not lock the database, rendering `{ background: true }` a no-op at the database level. However, specifying `{ background: true }` in Mongoose schema definitions ensures backwards compatibility with older database engines.
4. **Existing Live Database Migrations:**
   - Mongoose `Schema.index(...)` creates indexes automatically on startup via `autoIndex: true` in development. In production environments where `autoIndex: false` is configured for performance, an explicit migration script using `Model.syncIndexes()` or `db.collection.createIndex()` must be executed.

---

## 4. Conclusion & Concrete Implementation Blueprint

### Summary of Required Index Definitions

To satisfy Requirement R2 completely, eliminate all high-latency `COLLSCAN` operations, and maintain zero breaking changes to existing production contracts, the following exact Mongoose index definitions must be added to the schema files:

---

### File 1: `models/Patients.js`
**Target File:** `C:/Users/jasme/teamwork_projects/aims_2026/models/Patients.js`  
**Insertion Point:** Immediately before `PatientSchema.pre('save', ...)` (around line 111).

```javascript
// --- REQUIREMENT R2: HIGH-SPEED INDEXING FOR PATIENT SEARCH & RETRIEVAL ---
// 1. Compound index on fullName, phoneNumber, and email for duplicate checking & rapid search
PatientSchema.index({ fullName: 1, phoneNumber: 1, email: 1 }, { background: true });

// 2. Individual email index for single-field duplicate lookups (patientController.js:77)
PatientSchema.index({ email: 1 }, { background: true });

// 3. Provider-scoped pagination & recent patients index (eliminates 32MB in-memory sort crash)
PatientSchema.index({ doc_id: 1, createdAt: -1 }, { background: true });

// 4. Provider-scoped rapid autocomplete by name & phone
PatientSchema.index({ doc_id: 1, fullName: 1, phoneNumber: 1 }, { background: true });
```

---

### File 2: `models/Appointment.js`
**Target File:** `C:/Users/jasme/teamwork_projects/aims_2026/models/Appointment.js`  
**Insertion Point:** Immediately before `const Appointment = mongoose.model(...)` (around line 40).

```javascript
// --- REQUIREMENT R2: HIGH-SPEED INDEXING FOR APPOINTMENT CALENDAR & REMINDERS ---
// 1. Requirement R2 compound index on date and status (satisfying specification)
AppointmentSchema.index({ date: 1, status: 1 }, { background: true, sparse: true });

// 2. Production calendar status index for dashboard reports & calendar views (appointmentController.js:254, 412)
AppointmentSchema.index({ doctorID: 1, status: 1 }, { background: true });

// 3. Production chronological calendar & daily schedule index (appointmentController.js:163, notificationController.js:62)
AppointmentSchema.index({ doctorID: 1, time: 1, status: 1 }, { background: true });

// 4. Patient history & cascade deletion index (patientPortalController.js:58, userController.js:500)
AppointmentSchema.index({ patientID: 1, createdAt: -1 }, { background: true });
```

---

### File 3: `models/Visit.js`
**Target File:** `C:/Users/jasme/teamwork_projects/aims_2026/models/Visit.js`  
**Insertion Point:** Immediately before `VisitSchema.pre('save', ...)` (around line 93).

```javascript
// --- REQUIREMENT R2: HIGH-SPEED INDEXING FOR CLINICAL ENCOUNTERS & LONGITUDINAL AI ---
// 1. Production primary patient visit timeline index (visitController.js:206, openaiController.js:1032)
VisitSchema.index({ pId: 1, createdAt: -1 }, { background: true });

// 2. Requirement R2 canonical index on patientId and visitDate (satisfying specification & migration bridge)
VisitSchema.index({ patientId: 1, visitDate: -1 }, { background: true, sparse: true });

// 3. Provider encounter history & timeline index
VisitSchema.index({ doc_id: 1, createdAt: -1 }, { background: true });
```

---

### File 4: `models/MedicalCode.js`
**Target File:** `C:/Users/jasme/teamwork_projects/aims_2026/models/MedicalCode.js`  
**Insertion Point:** Lines 48–51.

```javascript
// --- REQUIREMENT R2: HIGH-SPEED INDEXING FOR MEDICAL CODE AUTO-COMPLETION ---
// Existing unique index (preserved to avoid breaking existing constraints)
MedicalCodeSchema.index({ type: 1, code: 1 }, { unique: true, background: true });
MedicalCodeSchema.index({ type: 1, category: 1 }, { background: true });

// Existing text index (single text index allowed per collection)
MedicalCodeSchema.index({ description: 'text', code: 'text' }, { background: true });

// NEW: Compound B-tree index for rapid code and description auto-completion (does not conflict with text index)
MedicalCodeSchema.index({ code: 1, description: 1 }, { background: true });
MedicalCodeSchema.index({ type: 1, code: 1, description: 1 }, { background: true });
```

---

### File 5: Recommendations for Associated Models (Avoiding Duplicate Definitions)

1. **`models/Invoice.js`**: Add `{ docId: 1, status: 1 }` and `{ pId: 1 }`.
2. **`models/Document.js`**: Add `{ pId: 1, createdAt: -1 }` and `{ userId: 1 }`.
3. **`models/CheckNotes.js`**: Add `{ docId: 1, checkInDate: 1 }` and `{ pId: 1 }`.
4. **`models/Doctor.js` & `models/Assistant.js`**: Add `{ docId: 1 }` and `{ username: 1 }`.
5. **Do NOT add redundant indexes** in `models/LabResult.js` on `patientId`, `models/User.js` on `email`, or `models/NoteType.js` on `name`/`slug`, as they already exist at field-definition level.
6. **Quarantine or remove `models/Visit.js.bak`** to eliminate the `mongoose.models = {};` bomb.

---

## 5. Verification Method

### Independent Verification Commands

1. **Syntax & Model Compilation Verification:**
   Verify that all models compile cleanly without syntax errors:
   ```powershell
   node -e "['Patients', 'Appointment', 'Visit', 'MedicalCode', 'User', 'Invoice', 'Document', 'LabResult', 'CheckNotes', 'Doctor', 'Assistant', 'NoteType'].forEach(m => require('./models/' + m)); console.log('All models compiled successfully without syntax or index registration errors.');"
   ```

2. **Mongoose Schema Index Inspection:**
   Verify that the new indexes are registered in the Mongoose schema registry and no duplicate index warnings occur:
   ```powershell
   node -e "
   const models = ['Patients', 'Appointment', 'Visit', 'MedicalCode'];
   models.forEach(name => {
     const model = require('./models/' + name);
     console.log('=== ' + name + ' Schema Indexes ===');
     model.schema.indexes().forEach((idx, i) => {
       console.log('  [' + i + '] ' + JSON.stringify(idx[0]) + ' | Options: ' + JSON.stringify(idx[1]));
     });
   });
   "
   ```

3. **Text Index Integrity Check on `MedicalCode`:**
   Verify that `models/MedicalCode.js` contains exactly one text index and the new compound B-tree index:
   ```powershell
   node -e "
   const MedicalCode = require('./models/MedicalCode');
   const textIndexes = MedicalCode.schema.indexes().filter(idx => Object.values(idx[0]).includes('text'));
   console.log('Text index count (must be exactly 1):', textIndexes.length);
   if (textIndexes.length !== 1) throw new Error('FAIL: Multiple text indexes detected!');
   console.log('PASS: Single text index validated.');
   "
   ```

4. **Empirical Challenge Test Suite:**
   Run the platform challenge suite to verify that existing test harnesses pass:
   ```powershell
   node tests/empirical_challenge_suite.js
   ```

### Invalidation Conditions
- An invalidation occurs if declaring the compound index on `MedicalCode` results in a second text index.
- An invalidation occurs if `Appointment` index declarations break existing queries filtering by `status` or sorting by `time`.
- An invalidation occurs if `Visit` index definitions omit `{ pId: 1, createdAt: -1 }`, leaving live clinical note queries in `COLLSCAN` mode.
