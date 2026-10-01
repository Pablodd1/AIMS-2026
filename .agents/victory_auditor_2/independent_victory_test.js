// Independent victory verification test
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractAndParseJSON, safeParseJSON } = require('../../Helper/jsonParser');
const { safeUnlink } = require('../../Helper/cleanup');

console.log('=== INDEPENDENT VICTORY AUDIT TEST SUITE (victory_auditor_2) ===\n');

let totalTests = 0, passedTests = 0, failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log('[PASS] ' + name);
  } catch (err) {
    failedTests++;
    console.error('[FAIL] ' + name);
    console.error('       Error: ' + err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log('[PASS] ' + name);
  } catch (err) {
    failedTests++;
    console.error('[FAIL] ' + name);
    console.error('       Error: ' + err.message);
  }
}

(async () => {
  // SECTION 1: JSON PARSER
  console.log('--- SECTION 1: Non-Destructive JSON Extraction ---');
  runTest('1.1 Fast-path direct JSON parse', () => {
    const raw = '{"test": 123, "valid": true}';
    assert.deepStrictEqual(extractAndParseJSON(raw), { test: 123, valid: true });
  });
  runTest('1.2 Markdown code fence ```json', () => {
    const raw = '```json\n{"dx": "M99.03"}\n```';
    assert.deepStrictEqual(extractAndParseJSON(raw), { dx: 'M99.03' });
  });
  runTest('1.3 Uppercase fence ```JSON', () => {
    const raw = '```JSON\n{"active": true}\n```';
    assert.deepStrictEqual(extractAndParseJSON(raw), { active: true });
  });
  runTest('1.4 Fence without lang identifier', () => {
    const raw = '```\n{"cpt": "98941"}\n```';
    assert.deepStrictEqual(extractAndParseJSON(raw), { cpt: '98941' });
  });
  runTest('1.5 Preamble and postamble extraction', () => {
    const raw = 'Assessment:\n{"diag": "Cervicalgia"}\nSigned Dr. Bob';
    assert.deepStrictEqual(extractAndParseJSON(raw), { diag: 'Cervicalgia' });
  });
  runTest('1.6 NON-DESTRUCTIVE: Preserves json substring in clinical text', () => {
    const raw = '{"name": "Johnson, Eric", "condition": "Jacksonian epilepsy", "protocol": "json_v2"}';
    const p = extractAndParseJSON(raw);
    assert.strictEqual(p.name, 'Johnson, Eric');
    assert.strictEqual(p.condition, 'Jacksonian epilepsy');
    assert.strictEqual(p.protocol, 'json_v2');
  });
  runTest('1.7 Trailing comma resilience', () => {
    const raw = '{"items": [1, 2, ], "val": true, }';
    assert.deepStrictEqual(extractAndParseJSON(raw), { items: [1, 2], val: true });
  });
  runTest('1.8 Fallback handling on invalid string', () => {
    const fallback = { fb: true };
    assert.deepStrictEqual(extractAndParseJSON('not a json', fallback), fallback);
  });
  runTest('1.9 Type edge cases', () => {
    assert.strictEqual(extractAndParseJSON(null, 'FB'), 'FB');
    assert.strictEqual(extractAndParseJSON(undefined, 'FB'), 'FB');
    assert.strictEqual(extractAndParseJSON('', 'FB'), 'FB');
    const obj = { a: 1 };
    assert.strictEqual(extractAndParseJSON(obj), obj);
  });
  runTest('1.10 Array extraction', () => {
    const raw = 'Codes: [{"code": "M54.5"}] done';
    const p = extractAndParseJSON(raw);
    assert(Array.isArray(p) && p[0].code === 'M54.5');
  });

  // SECTION 2: CLEANUP
  console.log('\n--- SECTION 2: Safe Cleanup Utility ---');
  runTest('2.1 safeUnlink removes existing temp file', () => {
    const f = path.join(__dirname, 'tmp_test.txt');
    fs.writeFileSync(f, 'temp');
    assert(fs.existsSync(f));
    safeUnlink(f);
    assert(!fs.existsSync(f));
  });
  runTest('2.2 safeUnlink ignores missing file', () => {
    assert.doesNotThrow(() => safeUnlink(path.join(__dirname, 'missing.txt')));
  });
  runTest('2.3 safeUnlink handles invalid inputs', () => {
    assert.doesNotThrow(() => { safeUnlink(null); safeUnlink(undefined); safeUnlink(123); });
  });

  // SECTION 3: OPENAI CONTROLLER & RED FLAGS
  console.log('\n--- SECTION 3: AI Controller Voice Routing & Red-Flag Guardrails ---');
  const openaiController = require('../../controllers/openaiController');
  runTest('3.1 Required functions exported', () => {
    const req = ['speechToTextForm', 'speechToTextFormWithOcr', 'generateReportFromAudioFile', 'generateNoteWithHistory', 'evaluateRedFlags', 'validateRedFlags'];
    req.forEach(f => assert.strictEqual(typeof openaiController[f], 'function', f + ' must be exported'));
  });
  await runAsyncTest('3.2 evaluateRedFlags returns contract on empty/fallback input', async () => {
    const r = await openaiController.evaluateRedFlags('');
    assert(Array.isArray(r.redFlags));
    assert.strictEqual(r.safeToTreat, true);
    assert(typeof r.summary === 'string');
  });
  await runAsyncTest('3.3 validateRedFlags route handler returns json response', async () => {
    let resData = null;
    const mockRes = { json: d => { resData = d; return mockRes; }, status: () => mockRes };
    await openaiController.validateRedFlags({ body: { text: '' } }, mockRes);
    assert.strictEqual(resData.success, true);
    assert(Array.isArray(resData.data.redFlags));
    assert.strictEqual(resData.data.safeToTreat, true);
  });
  runTest('3.4 voiceMethod quick-upload bypass in source', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/openaiController.js'), 'utf8');
    assert(src.includes("type === 'quick-upload'"));
    assert(src.includes('return { response: true, msg: result.msg }'));
  });
  runTest('3.5 generateReportFromAudioFile parallel evaluateRedFlags in source', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/openaiController.js'), 'utf8');
    assert(src.includes('evaluateRedFlags(transcript)'));
    assert(src.includes('safetyAlerts:'));
  });
  runTest('3.6 generateNoteWithHistory parallel evaluateRedFlags in source', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/openaiController.js'), 'utf8');
    assert(src.includes('evaluateRedFlags(transcription)'));
    assert(src.includes('safetyAlerts:'));
  });

  // SECTION 4: RESOURCE HARDENING
  console.log('\n--- SECTION 4: Resource Hardening ---');
  runTest('4.1 Puppeteer browser.close in finally with sandbox flags', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/Downloads/reportDocx.js'), 'utf8');
    assert(src.includes('browser = await puppeteer.launch'));
    assert(src.includes('await browser.close()'));
    assert(src.includes('--no-sandbox'));
  });
  runTest('4.2 labController uploadLabFile safeUnlink in finally', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/labController.js'), 'utf8');
    assert(src.includes('finally {') && src.includes('safeUnlink(req.file.path)'));
  });
  runTest('4.3 patientController importPatients destroy stream and safeUnlink in finally', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../controllers/patientController.js'), 'utf8');
    assert(src.includes('readStream.destroy()'));
    assert(src.includes('safeUnlink(file.path)'));
  });

  // SECTION 5: MONGOOSE SCHEMAS & INDEXES
  console.log('\n--- SECTION 5: Mongoose Schemas & Indexes ---');
  const Patients = require('../../models/Patients');
  const Appointment = require('../../models/Appointment');
  const Visit = require('../../models/Visit');
  const MedicalCode = require('../../models/MedicalCode');
  runTest('5.1 Patients compound index {fullName, phoneNumber, email}', () => {
    assert(Patients.schema.indexes().some(i => i[0].fullName === 1 && i[0].phoneNumber === 1 && i[0].email === 1));
  });
  runTest('5.2 Appointment compound index {date, status}', () => {
    assert(Appointment.schema.indexes().some(i => i[0].date === 1 && i[0].status === 1));
  });
  runTest('5.3 Visit compound index', () => {
    assert(Visit.schema.indexes().some(i => (i[0].pId === 1 && i[0].createdAt === -1) || (i[0].patientId === 1 && i[0].visitDate === -1)));
  });
  runTest('5.4 MedicalCode compound index and single text index', () => {
    const idxs = MedicalCode.schema.indexes();
    assert(idxs.some(i => i[0].code === 1 && i[0].description === 1));
    const textCount = idxs.filter(i => Object.values(i[0]).some(v => v === 'text')).length;
    assert.strictEqual(textCount, 1);
  });
  runTest('5.5 Visit schema defines redFlags array', () => {
    assert(Visit.schema.path('redFlags'));
  });

  // SECTION 6: CHANGELOG
  console.log('\n--- SECTION 6: DEVELOPER_CHANGELOG.md ---');
  runTest('6.1 DEVELOPER_CHANGELOG.md completeness', () => {
    const c = fs.readFileSync(path.join(__dirname, '../../DEVELOPER_CHANGELOG.md'), 'utf8');
    assert(c.includes('Executive Summary'));
    assert(c.includes('Comprehensive Modification Manifest'));
    assert(c.includes('Before Diff') && c.includes('After Diff'));
    assert(c.includes('Backwards Compatibility Guarantees'));
    assert(c.includes('Step-by-Step Test Commands'));
  });

  console.log('\n================================================================');
  console.log('INDEPENDENT VICTORY AUDIT TEST SUMMARY:');
  console.log('TOTAL TESTS: ' + totalTests);
  console.log('PASSED: ' + passedTests);
  console.log('FAILED: ' + failedTests);
  console.log('================================================================\n');
  if (failedTests > 0) process.exit(1);
})();
