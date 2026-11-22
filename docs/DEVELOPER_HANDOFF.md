# AIMS-2026 Developer Handoff & Deployment Guide

> **Last updated:** 2026-11-22  
> **Live production URL:** `https://aimedicalscriber.com` (backend API behind Nginx at `/aims-service1/*`)  
> **Companion frontend repo:** `Pablodd1/aims-frontend-build` (private repo; served from `/home/aims/frontend-build`)

This document gives any developer picking up the codebase an accurate map of **how the platform works**, **what changed in the 2026-11-22 platform audit & hardening pass**, **which API/schema invariants must never be broken**, and **how to verify and deploy safely**.

---

## 1. System Architecture at a Glance

AIMS is a split-repository clinic platform running on a Hostinger VPS (`147.93.47.17`) behind Nginx:

1. **Backend (`Pablodd1/AIMS-2026`, `/home/aims/aims-backend-node.js`):**
   - Express + Mongoose monolith running on port `4000` (see `INVENTORY.md`: migrated to `systemd` `aims-backend.service`, with `pm2` / `.env` notes preserved where applicable).
   - Serves `/api/*` (proxied externally under `https://aimedicalscriber.com/aims-service1/api/*`).
   - Authentication: JWT Bearer tokens (`protect` middleware for clinical staff; `patientAuth` middleware for patient portal).
   - **Important constraint:** **Do NOT rotate, invalidate, or reset existing user/doctor/assistant/patient passwords** unless explicitly directed during a coordinated credential migration window.
2. **Frontend (`Pablodd1/aims-frontend-build`, `/home/aims/frontend-build`):**
   - Pre-built Create React App bundle (`static/js/main.68168baa.js`, `static/css/main.97a814e1.css`) **plus runtime overlay scripts** (`aims-scribe-ui.js`, `aims-settings-analytics.js`, `aims-clinical-enhancements.js`) and **standalone clinical HTML micro-apps** (`dx-cpt-codes/`, `scribe/`, `quick-note/`, `audio-notes/`, `red-flags/`, `treatment-plan/`, `translate/`, `summary/`, `payments-reconcile/`, `consent/`).
   - See `FRONTEND_DEVELOPER_GUIDE.md` in `aims-frontend-build` for DOM-coexistence rules.

---

## 2. Summary of Backend Changes (Why Each Change Was Made)

### A. Clinical Integrity, Billing Compliance & Export Contracts

1. **AMA Range of Motion Normalization — [`Helper/romCalculator.js`](../Helper/romCalculator.js)**
   - **Why:** OpenAI extraction returns `{ region, movement, measured, painElicited }`, while manual/frontend inputs or older tools sometimes used `motion` and `painPresent`.
   - **Change:** `calculateRomDeficit` and `buildRomTable` now accept `entry.movement || entry.motion` and `!!(entry.painElicited || entry.painPresent)`.
   - **Invariant:** Keep both field names supported when reading `Visit.rangeOfMotion`.

2. **Chiropractic / E&M Billing Compliance — [`controllers/medicalCodesController.js`](../controllers/medicalCodesController.js)**
   - **Why:** `runBillingCompliance` only ran basic checks on object arrays (`{ code }`), silently missed string codes, didn't enforce CPT **Modifier 25** check on same-day E&M + CMT (`992xx` + `9894x`), and didn't cross-check documented spinal regions against `98940/98941/98942`.
   - **Change:** Normalizes both strings and objects, verifies `modifier` includes `'25'` on `992xx` when billed same-day with `9894x`, and invokes `auditChiropracticBilling` whenever `objective`, `physicalExamination`, or `rangeOfMotion` are passed.
   - **Response Envelope Invariant:**
     ```json
     {
       "response": true,
       "data": {
         "compliant": true,
         "issues": [],
         "auditResults": { "passed": true, "findings": [] },
         "totalChecks": 2,
         "passedChecks": 2
       }
     }
     ```
     *Note:* `runBillingCompliance` uses `response: true` + `data: {...}` (NOT top-level `success`/`issues`). Both `aims-scribe-ui.js` and `dx-cpt-codes/index.html` were updated to match this exact contract.

3. **Visit History & DOCX Export — [`controllers/visitExportController.js`](../controllers/visitExportController.js) & [`controllers/Visits/visitController.js`](../controllers/Visits/visitController.js)**
   - **Why:**
     - `getPatientVisits` (`GET /api/get/getPatientVisits?patientId=<id>`) omitted clinical-moat fields (`performedToday`, `plannedFuture`, `rangeOfMotion`, `romAnalysis`, `auditResults`, `signedBy`, `signedAt`, `personalInjuryDossier`, etc.).
     - `exportVisitDocx` (`GET /api/get/exportVisitDocx/:visitId`) omitted `CPT Modifier` labels (e.g. `99213 (-25)`) and `Personal Injury / Causation Dossier` narrative blocks in the Word export.
     - `getVists` (`GET /api/get/getVists?id=<patientId>`) returned a combined count, confusing reception Check-Ins (`CheckIn`) with dictated SOAP `Visit` notes.
   - **Change:** Expanded `.select(...)` in `getPatientVisits`, rendered PI Dossier + CPT modifiers (`code (-modifier)`) in `exportVisitDocx`, and added non-breaking additive fields (`checkInsCount`, `visitCount`, `visitDates`) in `getVists` while simplifying `getOpenAiKey()` to read env vars directly.
   - **Query Param Gotcha for Frontend Devs:**
     - `GET /api/get/getVists` expects `?id=<patientId>`
     - `GET /api/get/getPatientVisits` expects `?patientId=<patientId>` (NOT `?pId=`)

### B. Invoice Ledger Pagination & Patient Enrichment

- **[`controllers/Invoice/getAllByStatus.js`](../controllers/Invoice/getAllByStatus.js) & [`controllers/Invoice/getAlIInvoices.js`](../controllers/Invoice/getAlIInvoices.js)**
  - **Why:** `getAllByStatus` hardcoded `limit = 3` (cutting off the Paid Invoices modal at 3 items) and omitted patient names; `getAllInvoices` hardcoded `limit = 3`.
  - **Change:** Increased `getAllByStatus` default limit to `100` (clamped `1..500`), joined `Patient.fullName` onto each invoice (`patientName`), and made `getAllInvoices` accept configurable `limit` (default `25`, clamped `1..200`).

### C. Non-Password Security Hardening (Zero Password Rotation)

1. **Plaintext Password Leak Removal — [`controllers/userController.js`](../controllers/userController.js) & [`controllers/adminController.js`](../controllers/adminController.js)**
   - Excluded `-password` in `getUserInfo`, `getRecentUsers`, `fetchAllDoctors`, and `fetchAllAdmins`.
   - Stripped `password` from `getAssistant` response while returning additive boolean `hasPassword` (matching `getDoctors`).
   - Removed plaintext `console.log(username, email, password, ...)` from `createDoctor`.
   - Updated `sendQrCode` URL base to `process.env.FRONTEND_URL || 'https://aimedicalscriber.com'`.
2. **Removed Hardcoded Secrets & Stale Domain References:**
   - [`controllers/Cloudinary/cloudinay.js`](../controllers/Cloudinary/cloudinay.js): Moved `cloud_name`, `api_key`, and `api_secret` to `process.env.CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
   - [`public/daily-schedule-settings.html`](../public/daily-schedule-settings.html): Cleared pre-filled email/password form defaults and changed hardcoded `https://hamzaalitesting.site/aims-service1` to `window.location.origin + '/aims-service1'`.
   - Added [`.env.example`](../.env.example) (tracked via `!.env.example` in `.gitignore`) documenting every required environment variable without secrets.
3. **Express Edge, Upload & Route Hardening — [`index.js`](../index.js) & [`controllers/localstorage.js`](../controllers/localstorage.js)**
   - Added `app.set('trust proxy', 1)`, `app.disable('x-powered-by')`, and defensive headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`), positioned before `mountLocalStorage` so `/uploads` shares CORS/security headers cleanly.
   - Replaced raw MIME suffix split in `uploadSet1` Multer storage with a safe `SAFE_MIME_EXT` map + `100MB` file size cap.
   - Added `protect` middleware to `/api/post/setEmptyPic`, `/api/post/sendQrCode`, and `/api/post/inspectionDownload`.
   - Added `publicRateLimit` to unauthenticated intake endpoints (`/api/post/extractIntakeEntities`: 30/15m, `/api/post/publicIntake`: 20/15m) so `/intake/<docId>` keeps working without staff login while preventing abuse.
   - **Deliberately deferred auth:** `/api/post/generateReportFromAudioFile` and `/api/get/transcription` keep existing auth semantics to guarantee zero breakage while old browser caches cycle out after frontend deployment.
   - Made `UPLOAD_ROOT` in `localstorage.js` portable (`process.env.AIMS_UPLOAD_ROOT`, `/home/aims/uploads` when `/home/aims` exists, otherwise `./uploads`).

---

## 3. Local Verification Commands

```bash
# 1. Syntax check entry point
npm run build

# 2. Pure logic + offline controller regression suites (no DB required)
npm test
# Runs:
#   node tests/clinical_moat_suite.js   (19 assertions: ROM math, chiropractic audit, re-exam deltas)
#   node tests/platform_audit_suite.js  (8 assertions: Modifier 25, getAllByStatus enrichment, exportVisitDocx AST/DOCX, static security checks)

# 3. Route health audit via Jev System-1
node scripts/jev-audit.mjs
```

> **Note on Windows / CI environments without full `npm install`:**  
> `tests/platform_audit_suite.js` stubs missing Mongoose/Express helper modules (`express-async-handler`, `models/*`, and `docx` when absent locally) via `Module._load` so unit logic and controller contracts still execute cleanly without a MongoDB connection. Always test against a live DB/staging server before toggling auth middleware.

---

## 4. Production VPS Deployment Checklist (Read Before Deploying)

1. **MANDATORY FIRST STEP — Set Cloudinary Env Vars on VPS:**  
   Before pulling this backend onto `/home/aims/aims-backend-node.js`, verify that BOTH `.env` and any active PM2 `ecosystem.config.js` / systemd unit environment file on the VPS include:
   ```env
   CLOUDINARY_CLOUD_NAME=<existing cloud name>
   CLOUDINARY_API_KEY=<existing key>
   CLOUDINARY_API_SECRET=<existing secret>
   ```
   Without those three variables, `controllers/consentController.js` image uploads will fail because hardcoded credentials were removed from `controllers/Cloudinary/cloudinay.js`.

2. **Check `FRONTEND_URL`:**  
   Ensure `FRONTEND_URL=https://aimedicalscriber.com` is present so QR code & email links resolve to production.

3. **Backend Service Restart (`aims_2026`):**
   - Pull & verify service unit (`systemctl status aims-backend` — or `pm2 status` if running under PM2; confirm which process manager owns port `4000` with `ss -tulpn | grep 4000` first!).
   - Restart service and smoke-check:
     ```bash
     curl -fsS http://127.0.0.1:4000/api/health
     ```

4. **Frontend Manual Deploy (`aims-frontend-build`):**
   - Remember `Pablodd1/aims-frontend-build` is **private** and has no CI auto-deploy workflow. Sync built assets to `/home/aims/frontend-build` and reload Nginx only if headers/routes changed.
   - Verify cache-busted script query parameters in `/home/aims/frontend-build/index.html` (`?v=scribe-drag2`, `aims-settings-analytics.js?v=2`, `aims-clinical-enhancements.js?v=1`).

5. **Repo Security Reminder:**
   - `Pablodd1/AIMS-2026` is currently **public** on GitHub; **never** commit `.env` or dump real credentials/secrets in commit messages or markdown docs.
