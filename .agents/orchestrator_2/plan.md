# Execution Plan: AIMS-2026 Healthcare Platform Optimization & Defect Remediation

## Objective
Implement production-safe quality, accuracy, and speed optimizations from the AIMS-2026 audit, resolve critical functional defects without breaking existing live API contracts, and produce a comprehensive developer handoff dossier for the peer developer.

## Milestones & Work Breakdown

### Phase 0: Survey & Technical Investigation
- **Explorer 1 (Clinical AI & JSON Parsing)**:
  - Deep-dive into `controllers/openaiController.js` for `voiceMethod` quick-upload audio routing defect.
  - Audit all AI controllers (`openaiController.js`, `clinicalSummaryController.js`, `soapNoteController.js`, `medicationController.js`, `codingController.js`, etc.) for `.replace(/json/g, '')` and markdown fence regex stripping.
  - Audit `validateRedFlags` integration in note generation (`soapNoteController.js` and related routes) to surface clinical contraindications safely in API responses without breaking schema.
- **Explorer 2 (Database Indexing & Resource Lifecycle)**:
  - Deep-dive into `models/Patients.js`, `models/Appointment.js`, `models/Visit.js`, `models/MedicalCode.js` for compound index definitions.
  - Deep-dive into Puppeteer invocations (e.g., `reportDocx.js`, `index.js`, controllers) for `try ... finally { await browser.close(); }`.
  - Deep-dive into Multer temporary file cleanup across all audio/document upload endpoints (`fs.unlinkSync` / `fs.unlink` error/finally handling).
- **Consolidation**:
  - Synthesize findings into `PROJECT.md` with explicit file lists, function lines, interface contracts, and regression risks.

### Milestone 1: Functional Defect Remediation & Clinical Accuracy (R1)
- Repair `voiceMethod` in `controllers/openaiController.js`: return raw transcription when mode is quick-upload instead of routing to questionnaire parser.
- Implement robust, non-destructive JSON parser helper utility (handling ````json ... ```` fences, raw JSON, whitespace, without stripping the substring "json").
- Refactor all AI controllers to use the robust non-destructive parser.
- Connect `validateRedFlags` in note generation to return red flag alerts/contraindications in the response payload while preserving existing fields.
- Worker implementation -> Reviewers -> Challenger -> Auditor -> Gate check.

### Milestone 2: Database Indexing & High-Speed Query Optimization (R2)
- Add compound index on `fullName`, `phoneNumber`, `email` in `models/Patients.js`.
- Add compound indexes on `date` and `status` in `models/Appointment.js`.
- Add indexes on `patientId` and `visitDate` in `models/Visit.js`.
- Add text/compound index on `code` and `description` in `models/MedicalCode.js`.
- Ensure multi-tenant docId safety and zero duplicate index key build failures.
- Worker implementation -> Reviewers -> Challenger -> Auditor -> Gate check.

### Milestone 3: Resource Lifecycle & Memory Leak Hardening (R3)
- Wrap all Puppeteer browser launches in `try ... finally { if (browser) await browser.close(); }` blocks.
- Audit and harden Multer upload handlers so temp files in `uploads/` are unconditionally cleaned up even on exceptions.
- Worker implementation -> Reviewers -> Challenger -> Auditor -> Gate check.

### Milestone 4: Developer Handoff Dossier & Regression Verification (R4)
- Compile `DEVELOPER_CHANGELOG.md` at project root documenting exact files touched, before/after behavior, architectural rationale, backwards compatibility guarantees, and peer verification checklist.
- Verify `node --check` syntax on all modified files.
- Run regression tests to verify live endpoint contracts remain fully intact.
- Comprehensive Gate verification (Reviewers, Challenger, Auditor).

### Phase 5: Handoff & Final Reporting
- Prepare `handoff.md`.
- Report completed status and dossier to Sentinel via `send_message`.
