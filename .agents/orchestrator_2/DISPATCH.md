# Dispatch Assignment

## 2026-09-07T23:31:26Z

You are the Project Orchestrator for the AIMS-2026 Healthcare Platform Optimization and Defect Remediation task.

## Working Directory
- Agent metadata directory: C:/Users/jasme/teamwork_projects/aims_2026/.agents/orchestrator_2
- Project working directory: C:/Users/jasme/teamwork_projects/aims_2026
- Authoritative user request file: C:/Users/jasme/teamwork_projects/aims_2026/ORIGINAL_REQUEST.md

## Mission & Scope
Implement production-safe quality, accuracy, and speed optimizations from the AIMS-2026 audit, resolve critical functional defects without breaking existing live API contracts, and produce a comprehensive developer handoff dossier for the peer developer.

## Requirements

### R1. Functional Defect Remediation & Clinical Accuracy
Fix identified silent runtime bugs without altering external endpoint contracts:
1. Repair the `voiceMethod` quick-upload audio routing defect in `controllers/openaiController.js` (ensure quick-upload returns raw transcription without inappropriate questionnaire parsing).
2. Replace destructive `.replace(/json/g, '')` and markdown regex cleaning with robust, non-destructive JSON parser routines across all AI controllers (e.g. `controllers/openaiController.js`, `controllers/clinicalSummaryController.js`, `controllers/soapNoteController.js`, `controllers/medicationController.js`, `controllers/codingController.js`, etc. — ensure no medical terms like "json" are stripped).
3. Wire safety alerts from `validateRedFlags` into note generation so clinical contraindications are detected and surfaced in the response.

### R2. Database Indexing & High-Speed Query Optimization
Add targeted compound Mongoose indexes to eliminate high-latency `COLLSCAN` operations across hot query paths:
1. `models/Patients.js`: Compound index on `fullName`, `phoneNumber`, and `email` for rapid search.
2. `models/Appointment.js`: Compound indexes on `date` and `status` for calendar lookups.
3. `models/Visit.js`: Indexes on `patientId` and `visitDate`.
4. `models/MedicalCode.js`: Text/compound index on `code` and `description` for code auto-completion.

### R3. Resource Lifecycle & Memory Leak Hardening
Harden asynchronous resource handling to prevent production server crashes:
1. Wrap Puppeteer browser launches in `try ... finally { await browser.close(); }` blocks to eliminate stranded Chromium processes.
2. Audit Multer temporary file cleanup in file/audio upload flows to prevent disk accumulation and file descriptor leaks (ensure unlinked/cleaned up in finally/error paths).

### R4. Peer Developer Handoff Dossier & Backwards Compatibility
Ensure zero breaking changes to existing production endpoints, and compile a comprehensive `DEVELOPER_CHANGELOG.md` in the working directory `C:/Users/jasme/teamwork_projects/aims_2026` that documents:
- Exact files modified and functions touched.
- Before-and-after behavior and architectural rationale.
- Backwards compatibility guarantees for the live webapp.
- Step-by-step test commands and evaluation checklist for the peer developer.

### Verification & Integrity
- Run syntax checks (`node --check <file>`) on all modified files.
- Verify zero regression in existing contracts.

Maintain your `plan.md`, `progress.md`, and `BRIEFING.md` inside `C:/Users/jasme/teamwork_projects/aims_2026/.agents/orchestrator_2/`.
When all tasks and subtasks are completed and thoroughly verified, report completion and full handoff details back to the Sentinel.
