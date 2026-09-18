# DEVELOPER CHANGELOG

## 2026-09-17 — Clinical Moat: PI Defense, MSK ROM, Re-Exam, Billing Audit

Additive, backwards-compatible. No payload or response envelope removed. All new
endpoints behind `protect`. New Visit fields are optional (no `required`), so
existing docs are unaffected.

### New files
- `config/clinicalBaselines.js` — AMA Guides 5th/6th ed. normal ROM (cervical + lumbar), degrees.
- `Helper/romCalculator.js` — ROM deficit % math, movement/region normalization, ROM comparison table, pain-scale extraction, and longitudinal re-exam delta computation. Pure, no I/O.
- `Helper/billingAuditor.js` — deterministic chiropractic CPT audit (98940/98941/98942 downcoding + upcoding, M99.0x subluxation pairing guard).
- `tests/clinical_moat_suite.js` — 19 assertions over ROM math, billing audit triggers, re-exam deltas, pain-scale extraction.

### Visit model (`models/Visit.js`)
Added optional fields (all additive): `personalInjuryDossier`, `mechanismOfInjury`,
`impactOnADL`, `causationStatement`, `rangeOfMotion`, `romAnalysis`, `auditResults`.

### `controllers/Visits/visitController.js`
- `createVisit` now persists the new PI/ROM fields, computes `romAnalysis` (via `buildRomTable`)
  and `auditResults` (via `auditChiropracticBilling`) server-side, and returns both in the
  response envelope (additive — existing consumers ignore them).
- New `generateReExamReport` — `POST /api/v1/visits/generate-reexam-report`.
  Body `{ patientId, baselineVisitId?, currentVisitId? }`. Defaults: baseline = oldest visit,
  current = newest. Computes deterministic deltas (VAS, ROM, ADL, ortho, days-between) and
  compiles a payer/counsel-ready narrative via `gpt-4o`. Returns
  `{ response, comparativeNarrative, deltas, baselineVisitId, currentVisitId, readyForExport }`.

### `controllers/openaiController.js`
- `generateNoteWithHistory`: prompt now extracts `rangeOfMotion` (array) and
  `personalInjuryDossier` (object) when accident/trauma or ROM dictation is present;
  response adds `romAnalysis` when ROM extracted.
- `generateReportFromAudioFile`: prompt + response extended with `rangeOfMotion` and
  `personalInjuryDossier` (defaults `[]` / `null` when absent).

### `controllers/visitExportController.js`
- `exportVisitDocx` renders a "Range of Motion (vs AMA Guides)" table when the visit has
  `rangeOfMotion` (Measured / Normal / Deficit % / Pain Elicited columns).

### `index.js`
- Registered `POST /api/v1/visits/generate-reexam-report` (protected).

### Verification
- `node --check` clean on all touched files.
- `node tests/clinical_moat_suite.js` → 19 passed, 0 failed.
- `tests/remediation_verification_suite.js` referenced in the original directive does not
  exist in this repo (no `tests/` dir previously); the moat suite above is the net-new coverage.
