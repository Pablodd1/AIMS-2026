## 2026-09-07T23:32:35Z
You are the Database Indexing Explorer for the AIMS-2026 platform optimization project.
Working directory: C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_2_m2
Project directory: C:/Users/jasme/teamwork_projects/aims_2026

First, read:
- C:/Users/jasme/teamwork_projects/aims_2026/ORIGINAL_REQUEST.md
- C:/Users/jasme/teamwork_projects/aims_2026/AUDIT_AND_DESIGN_REPORT.md

Your mission is to perform a comprehensive technical investigation of Requirement R2 (Database Indexing & High-Speed Query Optimization):
1. In `models/Patients.js`:
   - Inspect existing schema fields, types, and current indexes.
   - Search `controllers/patientController.js`, `index.js`, and other files for queries that search or filter patients by `fullName`, `phoneNumber`, and `email`.
   - Design the compound index on `{ fullName: 1, phoneNumber: 1, email: 1 }` (or appropriate order/collation/background options) to eliminate COLLSCAN operations.
2. In `models/Appointment.js`:
   - Inspect existing schema and indexes.
   - Search queries filtering on `date` and `status` (and `doctorID`).
   - Design the compound indexes on `{ date: 1, status: 1 }` (and check interaction with `doctorID`).
3. In `models/Visit.js`:
   - Inspect existing schema and indexes.
   - Search queries filtering on `patientId` and `visitDate`.
   - Design the indexes on `patientId` and `visitDate` (compound `{ patientId: 1, visitDate: -1 }` or individual).
4. In `models/MedicalCode.js`:
   - Inspect existing schema and indexes, particularly the existing unique index on `{ type: 1, code: 1 }` noted in the audit.
   - Search queries searching `code` and `description` for auto-completion in `controllers/codingController.js` and `index.js`.
   - Design the text/compound index on `code` and `description` to ensure fast search without breaking existing unique constraints or index builds.
5. Survey other models in `models/` to identify any duplicate or conflicting index declarations.

Write a complete, structured report to `C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_2_m2/handoff.md`.
Include exact file paths, line numbers, schema code snippets, query analysis, and exact proposed Mongoose index definitions.
When finished, send a message back to the parent orchestrator with your summary.
