const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== FORENSIC INTEGRITY AUDIT TEST RUN ===');

// Check 1: jsonParser integrity
const { extractAndParseJSON, safeParseJSON } = require('../../Helper/jsonParser');
assert.strictEqual(typeof extractAndParseJSON, 'function');
assert.strictEqual(extractAndParseJSON, safeParseJSON);

// Test fence stripping without deleting 'json'
const inputWithJson = '```json\n{"name": "David Johnson", "address": "123 json street", "json_format": "json"}\n```';
const parsedJson = extractAndParseJSON(inputWithJson);
assert.strictEqual(parsedJson.name, 'David Johnson');
assert.strictEqual(parsedJson.address, '123 json street');
assert.strictEqual(parsedJson.json_format, 'json');

// Test uppercase fence
const uppercaseFence = '```JSON\n{"key": "value"}\n```';
assert.deepStrictEqual(extractAndParseJSON(uppercaseFence), { key: 'value' });

// Test trailing commas
const trailing = '{"items": [1, 2, ], "done": true, }';
assert.deepStrictEqual(extractAndParseJSON(trailing), { items: [1, 2], done: true });

// Test preamble / postamble conversational text
const conversational = 'Doctor note results:\n```json\n{"summary": "Healthy patient"}\n```\nEnd of transcript.';
assert.deepStrictEqual(extractAndParseJSON(conversational), { summary: 'Healthy patient' });

// Test fallback
assert.strictEqual(extractAndParseJSON(null, 'FB'), 'FB');
assert.strictEqual(extractAndParseJSON('', 'FB'), 'FB');
assert.strictEqual(extractAndParseJSON('not json', 'FB'), 'FB');
console.log('Check 1 (jsonParser integrity): PASS');

// Check 2: cleanup integrity
const { safeUnlink } = require('../../Helper/cleanup');
const testFile = path.join(__dirname, 'test_tmp_file.txt');
fs.writeFileSync(testFile, 'test');
assert.ok(fs.existsSync(testFile));
safeUnlink(testFile);
assert.ok(!fs.existsSync(testFile));
assert.doesNotThrow(() => safeUnlink(null));
assert.doesNotThrow(() => safeUnlink('non_existent.txt'));
console.log('Check 2 (safeUnlink integrity): PASS');

// Check 3: Schema indexes
const Patients = require('../../models/Patients');
const Appointment = require('../../models/Appointment');
const Visit = require('../../models/Visit');
const MedicalCode = require('../../models/MedicalCode');

const pIndexes = Patients.schema.indexes();
assert.ok(pIndexes.some(i => i[0].fullName === 1 && i[0].phoneNumber === 1 && i[0].email === 1));
assert.ok(pIndexes.some(i => i[0].email === 1));
assert.ok(pIndexes.some(i => i[0].doc_id === 1 && i[0].createdAt === -1));
assert.ok(pIndexes.some(i => i[0].doc_id === 1 && i[0].fullName === 1 && i[0].phoneNumber === 1));
console.log('Check 3A (Patients schema indexes): PASS (4 indexes verified)');

const aIndexes = Appointment.schema.indexes();
assert.ok(aIndexes.some(i => i[0].date === 1 && i[0].status === 1));
assert.ok(aIndexes.some(i => i[0].doctorID === 1 && i[0].status === 1));
assert.ok(aIndexes.some(i => i[0].doctorID === 1 && i[0].time === 1 && i[0].status === 1));
assert.ok(aIndexes.some(i => i[0].patientID === 1 && i[0].createdAt === -1));
console.log('Check 3B (Appointment schema indexes): PASS (4 indexes verified)');

const vIndexes = Visit.schema.indexes();
assert.ok(vIndexes.some(i => i[0].pId === 1 && i[0].createdAt === -1));
assert.ok(vIndexes.some(i => i[0].patientId === 1 && i[0].visitDate === -1));
assert.ok(vIndexes.some(i => i[0].doc_id === 1 && i[0].createdAt === -1));
console.log('Check 3C (Visit schema indexes): PASS (3 indexes verified)');

const mIndexes = MedicalCode.schema.indexes();
const textIdxCount = mIndexes.filter(i => Object.values(i[0]).includes('text')).length;
assert.strictEqual(textIdxCount, 1, 'Must have exactly 1 text index');
assert.ok(mIndexes.some(i => i[0].code === 1 && i[0].description === 1 && !Object.values(i[0]).includes('text')));
assert.ok(mIndexes.some(i => i[0].type === 1 && i[0].code === 1 && i[0].description === 1));
console.log('Check 3D (MedicalCode schema indexes): PASS (1 text index preserved + 2 B-tree compound indexes verified)');

// Check 4: Puppeteer lifecycle in reportDocx.js
const reportDocxSrc = fs.readFileSync(path.join(__dirname, '../../controllers/Downloads/reportDocx.js'), 'utf8');
assert.ok(reportDocxSrc.includes('try {'), 'createPdfFromHtml must have try block');
assert.ok(reportDocxSrc.includes('finally {'), 'createPdfFromHtml must have finally block');
assert.ok(reportDocxSrc.includes('await browser.close();'), 'finally block must close browser');
assert.ok(reportDocxSrc.includes('if (browser)'), 'browser close must check if (browser)');
console.log('Check 4 (Puppeteer lifecycle in reportDocx.js): PASS');

// Check 5: Multer temporary file cleanup in controllers
const labSrc = fs.readFileSync(path.join(__dirname, '../../controllers/labController.js'), 'utf8');
assert.ok(labSrc.includes('finally {'), 'labController must have finally block');
assert.ok(labSrc.includes('safeUnlink(req.file.path)'), 'labController must safeUnlink in finally');

const patientSrc = fs.readFileSync(path.join(__dirname, '../../controllers/patientController.js'), 'utf8');
assert.ok(patientSrc.includes('finally {'), 'patientController must have finally block');
assert.ok(patientSrc.includes('safeUnlink(file.path)'), 'patientController must safeUnlink in finally');

const openaiSrc = fs.readFileSync(path.join(__dirname, '../../controllers/openaiController.js'), 'utf8');
assert.ok(openaiSrc.includes('safeUnlink(req.file.path)'), 'openaiController must safeUnlink');
console.log('Check 5 (Multer temporary file cleanup): PASS');

// Check 6: voiceMethod quick-upload genuine routing
const openaiController = require('../../controllers/openaiController');
assert.strictEqual(typeof openaiController.voiceMethod, 'function');
assert.strictEqual(typeof openaiController.evaluateRedFlags, 'function');

const vmStart = openaiSrc.indexOf('async function voiceMethod');
const vmSrc = openaiSrc.substring(vmStart, vmStart + 1200);
assert.ok(vmSrc.includes("type === 'quick-upload' || type === 'quickUpload' || type === 'raw' || type === 'transcribe'"), 'Must contain quick-upload bypass');
assert.ok(vmSrc.includes('return { response: true, msg: result.msg };'), 'Must return raw speechToText text');
assert.ok(vmSrc.includes('if (type == "create")'), 'Must preserve create branch');
assert.ok(vmSrc.includes('extractAnswers(result.msg)'), 'Must call extractAnswers on create');
assert.ok(vmSrc.includes('extractAnswersforUpdate(result.msg)'), 'Must call extractAnswersforUpdate on other');
console.log('Check 6 (voiceMethod genuine logic and branching): PASS');

// Check 7: Red flags persistence in Visit
const visitDoc = new Visit({
  pId: 'patient123',
  redFlags: [{ severity: 'critical', category: 'neurological', description: 'numbness' }]
});
assert.strictEqual(visitDoc.redFlags.length, 1);
assert.strictEqual(visitDoc.redFlags[0].description, 'numbness');
console.log('Check 7 (Visit redFlags persistence): PASS');

// Check 8: No hardcoded test overrides or mock bypasses
const allFilesToCheck = [
  '../../Helper/jsonParser.js',
  '../../Helper/cleanup.js',
  '../../models/Patients.js',
  '../../models/Appointment.js',
  '../../models/Visit.js',
  '../../models/MedicalCode.js',
  '../../controllers/openaiController.js',
  '../../controllers/labController.js',
  '../../controllers/Visits/visitController.js',
  '../../controllers/Downloads/reportDocx.js',
  '../../controllers/patientController.js'
];

allFilesToCheck.forEach(rel => {
  const content = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  assert.ok(!content.includes('// mock'), `No mock in ${rel}`);
  assert.ok(!content.includes('/* mock'), `No mock in ${rel}`);
  assert.ok(!content.includes('return "PASS"'), `No fake return in ${rel}`);
  assert.ok(!content.includes('return true; // fake'), `No fake return in ${rel}`);
});
console.log('Check 8 (Absence of mock/facade patterns): PASS');

console.log('\n=== ALL FORENSIC INTEGRITY CHECKS COMPLETED CLEANLY ===');

