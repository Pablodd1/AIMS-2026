# Handoff Report — Survey Explorer 1 (Backend Architecture, Security & HIPAA)

**Agent:** Survey Explorer 1  
**Working Directory:** `C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_1`  
**Date:** September 7, 2026  
**Type:** Hard Handoff (Investigation Complete)  
**Detailed Report Reference:** `C:/Users/jasme/teamwork_projects/aims_2026/.agents/explorer_survey_1/survey_report.md`

---

## 1. Observation

Direct observations extracted from the codebase:

1. **Authentication Backdoor (`index.js:93`)**:
   ```javascript
   app.get('/api/get/checkUserToken',(req,res)=>{
     const t=req.headers.authorization?.split(' ')[1];
     if(!t)return res.json({response:true,msg:'token is valid',role:'Admin'});
     try{
       const d=require('jsonwebtoken').verify(t,process.env.JWTSECRET);
       return res.json({response:true,msg:'token is valid',role:'Admin'});
     }catch(e){
       return res.json({response:false,msg:'token is not valid'})
     }
   })
   ```
   When `req.headers.authorization` is undefined, `!t` evaluates to `true`, returning `{ response: true, msg: 'token is valid', role: 'Admin' }`.

2. **Unprotected Core PHI Endpoints (`index.js:119,122,123,177,254,256,281,282`)**:
   - Line 119: `app.post('/api/post/createPatient', createPatient)`
   - Line 122: `app.get('/api/get/getPatientById', getPatientById)`
   - Line 123: `app.post('/api/post/updatePatient', updatePatient)`
   - Line 177: `app.get('/api/get/test', testFunc)`
   - Line 254: `app.post('/api/get/calenderDates', calenderDates)`
   - Line 281: `app.post('/api/post/reportDocxDirectDownload', reportDocxDirectDownload)`
   - Line 282: `app.post('/api/post/ameriarePatientDocument', ameriarePatientDocument)`
   None of these endpoints include `protect` or any other authentication middleware.

3. **Indefinite JWT Token Lifespan (`config/generateToken.js:3-5`)**:
   ```javascript
   const generateToken = (id) => {
     return jwt.sign({ id }, process.env.JWTSECRET);
   };
   ```
   No `expiresIn` property is specified. Tokens never expire.

4. **Symmetric AES Password Storage & Plaintext Return (`controllers/userController.js:65-68,658-664,745-751`)**:
   - Lines 65-68: Passwords stored via `CryptoJS.AES.encrypt(password, process.env.JWTSECRET).toString()`.
   - Lines 660-663:
     ```javascript
     const bytes = CryptoJS.AES.decrypt(obj.password, process.env.JWTSECRET);
     const originalText = bytes.toString(CryptoJS.enc.Utf8);
     obj['password'] = originalText;
     assistantsList.push(obj);
     ```
   - Lines 747-750: Identical plaintext password decryption and assignment in `getDoctors`.

5. **Hardcoded Cloud and Service Credentials**:
   - `controllers/AWS/AwsClient.js:7-9`:
     ```javascript
     accessKeyId: 'AKIAXWMA6W5C7HXEPS4V',
     secretAccessKey: "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"
     ```
   - `controllers/Twilio/twilio.js:8-9`:
     ```javascript
     const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC038061eedcc47e1d7705b722fbb0eb81';
     const authToken = process.env.TWILIO_AUTH_TOKEN || '28729102e2163caa3555992f580e1013';
     ```
   - `controllers/Cloudinary/cloudinay.js:4-6`:
     ```javascript
     cloud_name: 'dklqbx5k0',
     api_key: '586219556714458',
     api_secret: 'JY7qKHk1QeMN5FqaW4lPf9N3k1E'
     ```
   - `controllers/mailController.js:269-270`:
     ```javascript
     user: process.env.INSPECTION_EMAIL || "alihamzanasir0306@gmail.com",
     pass: process.env.INSPECTION_PASS || "rvxk igwu dmxd ecwj"
     ```

6. **Hardcoded Real Patient PHI**:
   - `controllers/Downloads/reportDocx.js:500-562`: Commented-out clinical note containing real patient name "Elvis Valdez", date of accident November 4, 2024, physical examination notes, psychiatric evaluation, and treatment plan.
   - `test.js:5-89`: Identical real patient record committed as active test fixture.

7. **Missing Database Indexes**:
   - `models/Patients.js`: Zero schema indexes defined.
   - `models/Visit.js`: Zero schema indexes defined.
   - `models/Appointment.js`: Zero schema indexes defined.
   - `models/Document.js`: Zero schema indexes defined.

8. **Crash Bugs**:
   - `controllers/adminController.js:33-41`: Missing `return` after validation error triggers `TypeError: Cannot read properties of null (reading 'role')` on `user.role` check when `user` is null.
   - `controllers/adminController.js:132`: Reference to undeclared `username` in `createDoctor`.
   - `controllers/appointmentController.js:137-154`: Dereferences `patientInfo` and `newAppointment` in `finally` without null guards.
   - `controllers/Visits/visitController.js:139`: Queries `Visit.updateOne({ _id: pId })` using patient ID instead of visit ID.

9. **Dead Code & Phantom Dependencies**:
   - `middleware/errorMiddleware.js`: Exports `notFound` and `errorHandler`, but neither is imported in `index.js`.
   - `package.json`: Contains `ioredis`, `redis`, `cron`, `node-cron`, `socket.io`, `ws`, and `sib-api-v3-sdk`, none of which are used in application runtime logic.

---

## 2. Logic Chain

1. **Observations 1, 2 & 3 → Critical Authentication Failure**:
   - Because `index.js:93` explicitly returns `role: 'Admin'` when no token is provided, any unauthenticated client querying this endpoint receives admin credentials.
   - Because core endpoints like `/api/get/getPatientById` and `/api/post/updatePatient` omit `protect` entirely, authentication is not enforced on medical data access.
   - Because `generateToken` omits `expiresIn`, any token issued is valid forever, violating HIPAA § 164.312(a)(2)(iii).

2. **Observation 4 → Severe Credential Exposure & Breach**:
   - Symmetrically encrypting passwords with the JWT secret allows two-way decryption by anyone with access to the secret.
   - Decrypting and returning cleartext passwords in `/api/get/getAssistants` and `/api/get/getDoctors` compromises all staff credentials to any authenticated caller.

3. **Observations 5 & 6 → Direct HIPAA Violations & Regulatory Exposure**:
   - Storing live AWS S3 IAM credentials, Twilio auth tokens, Cloudinary secrets, and Gmail passwords in git-tracked source files grants unrestricted access to storage buckets containing patient documents.
   - Hardcoding identifiable patient health records ("Elvis Valdez") into `reportDocx.js` and `test.js` constitutes an impermissible disclosure under 45 CFR § 164.502.

4. **Observations 7, 8 & 9 → Systemic Architectural & Operational Instability**:
   - The absence of Mongoose indexes across `Patients`, `Visit`, and `Appointment` causes MongoDB to perform full collection scans for every query, leading to latency and resource exhaustion under production loads.
   - Unhandled exceptions in `adminController.js` and `appointmentController.js` cause server crashes or 500 error propagation.
   - The presence of unused packages and unmounted error handlers demonstrates architectural erosion and lack of testing.

---

## 3. Caveats

1. **Frontend Integration Scope**: Only the backend codebase (`aims-2026`) was investigated; client-side consumer behavior (e.g., Next.js frontend code handling tokens) was not directly audited, though backend contracts were evaluated against deployed requirements.
2. **Dynamic Penetration Testing**: Investigation was strictly read-only source code review; no live HTTP attack payloads or network scans were executed.
3. **Third-Party Service Status**: The validity of the hardcoded AWS keys, Twilio credentials, and Gmail passwords was not actively verified against third-party APIs to avoid triggering rate limits or unauthorized external access.

---

## 4. Conclusion

The AIMS-2026 backend architecture contains multiple critical vulnerabilities that prohibit production deployment:
- **Authentication & Authorization**: Compromised by a backdoor on `/api/get/checkUserToken`, non-expiring JWTs, two-way symmetric password storage, plaintext password exposure, and absence of RBAC.
- **Data Security & HIPAA**: Unprotected endpoints expose full patient PHI, live cloud credentials are hardcoded, and real patient medical records are committed in source code.
- **Architecture & Reliability**: Unindexed schemas, crash bugs, dead error handling middleware, and unbounded memory consumption in PDF generation represent severe operational liabilities.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Backdoor (`index.js:93`)**:
   Inspect `index.js` lines 92–94:
   ```powershell
   Get-Content -Path "C:\Users\jasme\teamwork_projects\aims_2026\index.js" | Select -Index 91,92,93,94
   ```

2. **Verify Hardcoded AWS Credentials (`controllers/AWS/AwsClient.js:7-9`)**:
   ```powershell
   Get-Content -Path "C:\Users\jasme\teamwork_projects\aims_2026\controllers\AWS\AwsClient.js"
   ```

3. **Verify Hardcoded Patient PHI (`controllers/Downloads/reportDocx.js:500-510`)**:
   ```powershell
   Get-Content -Path "C:\Users\jasme\teamwork_projects\aims_2026\controllers\Downloads\reportDocx.js" | Select-String -Pattern "Elvis Valdez"
   ```

4. **Verify Plaintext Password Disclosures (`controllers/userController.js:658-664, 745-751`)**:
   ```powershell
   Get-Content -Path "C:\Users\jasme\teamwork_projects\aims_2026\controllers\userController.js" | Select-String -Pattern "originalText"
   ```

5. **Verify Unprotected Endpoints (`index.js`)**:
   Grep `index.js` for routes lacking `protect`:
   ```powershell
   Select-String -Path "C:\Users\jasme\teamwork_projects\aims_2026\index.js" -Pattern "getPatientById|updatePatient|/api/get/test"
   ```
