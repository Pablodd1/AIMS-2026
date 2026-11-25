// Platform audit & hardening regression suite — unit tests + source security audit (runs offline with stubbed models when DB/deps are absent).
const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const stubInvoice = { find: () => {}, countDocuments: async () => 0 };
const stubPatient = { find: () => {}, findById: () => {}, updateOne: async () => ({}) };
const stubVisit = { find: () => {}, findById: () => {} };
const stubAppointment = { find: () => {} };
const stubCheckNotes = { find: () => {} };
const stubUser = { findById: () => ({ select: () => ({ lean: async () => ({ clinicName: 'Innovative Medical Wellness' }) }) }) };
const stubDocxCapture = { calls: [] };

const stubDocx = {
  Document: function (opts) { stubDocxCapture.calls.push(opts); this.opts = opts; },
  Packer: { toBuffer: async (doc) => Buffer.from(JSON.stringify(doc.opts)) },
  Paragraph: function (opts) { this.type = 'Paragraph'; this.opts = opts; },
  HeadingLevel: { HEADING_1: 'H1', HEADING_2: 'H2', HEADING_3: 'H3' },
  AlignmentType: { CENTER: 'CENTER' },
  Table: function (opts) { this.type = 'Table'; this.opts = opts; },
  TableRow: function (opts) { this.type = 'TableRow'; this.opts = opts; },
  TableCell: function (opts) { this.type = 'TableCell'; this.opts = opts; },
  WidthType: { PERCENTAGE: 'PERCENTAGE' },
};

let usedStubDocx = false;
const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'express-async-handler') return (fn) => fn;
  if (request.endsWith('/models/Invoice') || request.endsWith('\\models\\Invoice')) return stubInvoice;
  if (request.endsWith('/models/Patients') || request.endsWith('\\models\\Patients')) return stubPatient;
  if (request.endsWith('/models/Visit') || request.endsWith('\\models\\Visit')) return stubVisit;
  if (request.endsWith('/models/Appointment') || request.endsWith('\\models\\Appointment')) return stubAppointment;
  if (request.endsWith('/models/CheckNotes') || request.endsWith('\\models\\CheckNotes')) return stubCheckNotes;
  if (request.endsWith('/models/User') || request.endsWith('\\models\\User')) return stubUser;
  if (request.endsWith('/Twilio/twilio') || request.endsWith('\\Twilio\\twilio')) return { sendMessage: async () => true };
  if (request.endsWith('/models/MedicalCode') || request.endsWith('\\models\\MedicalCode')) return {};
  if (request.endsWith('/models/FavoriteCode') || request.endsWith('\\models\\FavoriteCode')) return {};
  if (request === 'openai') {
    try { return origLoad.call(this, request, parent, isMain); }
    catch (_) {
      return function MockOpenAI() {
        this.chat = { completions: { create: async () => ({ choices: [{ message: { content: '{}' } }] }) } };
        this.audio = { speech: { create: async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }) } };
      };
    }
  }
  if (request === 'docx') {
    try { return origLoad.call(this, request, parent, isMain); }
    catch (_) { usedStubDocx = true; return stubDocx; }
  }
  return origLoad.call(this, request, parent, isMain);
};

const { runBillingCompliance } = require('../controllers/medicalCodesController');
const { getAllByStatus } = require('../controllers/Invoice/getAllByStatus');
const { exportVisitDocx } = require('../controllers/visitExportController');
const { syncVisitCount, dayOf } = require('../Helper/visitCounter');
const { sendSmsCampaign } = require('../controllers/notificationController');

let passed = 0;
let failed = 0;

function makeMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(k, v) { this.headers[String(k).toLowerCase()] = v; return this; },
    setHeader(k, v) { this.headers[String(k).toLowerCase()] = v; return this; },
    json(data) { this.body = data; return this; },
    send(data) { this.body = data; return this; },
  };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    failed++;
    console.error('  FAIL ' + name + ' -> ' + (e && e.stack ? e.stack : e));
  }
}

(async () => {
  try {
    console.log('== Billing Compliance Controller Tests ==');
    await test('Flags missing Modifier 25 when E/M (99213) billed with CMT (98941)', async () => {
      const req = {
        body: {
          dxCodes: [{ code: 'M99.01', primary: true }, { code: 'M54.2' }],
          cptCodes: [{ code: '99213', modifier: '' }, { code: '98941', units: 1 }],
          objective: 'Cervical, thoracic, and lumbar somatic dysfunction treated.',
        },
      };
      const res = makeMockRes();
      await runBillingCompliance(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.response, true);
      assert.ok(res.body.data.issues.some((i) => i.category === 'modifier_needed'), 'Expected modifier_needed issue');
    });

    await test('Passes Modifier 25 & region checks when modifier="25" and 3 regions + M99.01 present', async () => {
      const req = {
        body: {
          dxCodes: [{ code: 'M99.01', primary: true }, { code: 'M54.5' }],
          cptCodes: [{ code: '99213', modifier: '25' }, { code: '98941', units: 1 }],
          objective: 'Adjusted cervical, thoracic, and lumbar regions today.',
        },
      };
      const res = makeMockRes();
      await runBillingCompliance(req, res);
      assert.strictEqual(res.body.response, true);
      assert.strictEqual(res.body.data.compliant, true);
      assert.strictEqual(res.body.data.issues.length, 0, 'Unexpected issues: ' + JSON.stringify(res.body.data.issues));
      assert.strictEqual(res.body.data.auditResults.passed, true);
    });

    await test('Normalizes string CPT codes & catches missing Primary Dx + insufficient regions', async () => {
      const req = {
        body: {
          dxCodes: ['M99.03'],
          cptCodes: ['98941'],
          objective: 'Lumbar tension only.',
        },
      };
      const res = makeMockRes();
      await runBillingCompliance(req, res);
      assert.strictEqual(res.body.response, true);
      assert.ok(res.body.data.issues.some((i) => i.category === 'missing_primary'));
      assert.ok(res.body.data.issues.some((i) => i.category === 'region_substantiation' && i.code === '98941'));
    });

    console.log('== Invoice Pagination & Enrichment Tests ==');
    await test('getAllByStatus defaults limit to 100 and enriches patientName from Patient model', async () => {
      let capturedLimit = null;
      stubInvoice.find = () => ({
        sort: () => ({
          skip: () => ({
            limit(n) {
              capturedLimit = n;
              return { lean: async () => ([{ _id: 'inv1', pId: 'pat1', totalAmount: 150, status: 'paid' }]) };
            },
          }),
        }),
      });
      stubInvoice.countDocuments = async () => 1;
      stubPatient.find = () => ({
        select: () => ({
          lean: async () => ([{ _id: 'pat1', fullName: 'Jane Doe' }]),
        }),
      });

      const req = { query: { status: 'paid' }, user: 'doc1' };
      const res = makeMockRes();
      await getAllByStatus(req, res);
      assert.strictEqual(capturedLimit, 100);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.response, true);
      assert.strictEqual(res.body.invoices[0].patientName, 'Jane Doe');
    });

    console.log('== DOCX Export (AMA ROM + PI Dossier + Modifier) Test ==');
    await test('exportVisitDocx builds document with AMA ROM, PI Dossier, and CPT Modifier -25', async () => {
      stubVisit.findById = () => ({
        lean: async () => ({
          _id: 'vis1',
          pId: 'pat1',
          date: '2026-11-22',
          chiefComplaint: 'Neck pain post rear-end MVA',
          HPI: 'Rear-ended at stoplight.',
          Assessment: 'Cervical sprain/strain, cervicalgia',
          Plan: 'Chiropractic care 3x/wk for 4 weeks',
          icdCodes: [{ code: 'S13.4XXA', description: 'Cervical sprain', primary: true }],
          cptCodes: [{ code: '99213', modifier: '25', description: 'Office visit', units: 1 }, { code: '98940', description: 'CMT 1-2 regions', units: 1 }],
          rangeOfMotion: [{ region: 'Cervical', motion: 'flexion', measured: 30, normal: 50, painPresent: true }],
          personalInjuryDossier: {
            accidentRelated: true,
            dateOfInjury: '2026-11-10',
            mechanismOfInjury: { collisionType: 'Rear-end MVA', narrative: 'Struck from behind at 25mph.' },
            causationStatement: { attestationText: 'Injuries causally related within reasonable medical certainty.' },
          },
          signedBy: 'Dr. Test Provider',
          signedAt: new Date('2026-11-22T12:00:00Z'),
        }),
      });
      stubPatient.findById = () => ({
        select: () => ({
          lean: async () => ({ _id: 'pat1', fullName: 'MVA Patient', dateOfBirth: '1990-01-01', phoneNumber: '555-0100' }),
        }),
      });

      const req = { params: { visitId: 'vis1' } };
      const res = makeMockRes();
      await exportVisitDocx(req, res);
      assert.ok(Buffer.isBuffer(res.body), 'Expected DOCX Buffer response');
      assert.ok(String(res.headers['content-disposition'] || '').includes('.docx'));
      const serialized = usedStubDocx ? res.body.toString('utf8') : null;
      if (usedStubDocx) {
        assert.ok(serialized.includes('Personal Injury / Causation Dossier'), 'Missing PI Dossier heading in DOCX');
        assert.ok(serialized.includes('99213 (-25)'), 'Missing CPT modifier label in DOCX');
        assert.ok(serialized.includes('40%'), 'Missing AMA ROM deficit % in DOCX');
      } else {
        assert.strictEqual(res.body.slice(0, 2).toString('utf8'), 'PK', 'Expected valid ZIP/DOCX magic header');
      }
      console.log('      (docx mode: ' + (usedStubDocx ? 'mocked docx AST verification' : 'real docx ZIP buffer') + ')');
    });

    console.log('== Static Security & Config Audit ==');
    await test('No hardcoded secrets in Cloudinary config or daily-schedule HTML', () => {
      const cld = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'Cloudinary', 'cloudinay.js'), 'utf8');
      assert.ok(!/641122914835859|dl5mfrhqo/.test(cld), 'Cloudinary secret/name still hardcoded');
      const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'daily-schedule-settings.html'), 'utf8');
      assert.ok(!/DrDraesel@|9359!|hamzaalitesting/.test(html), 'Legacy credentials or old domain present in HTML');
    });

    await test('index.js configures proxy trust, security headers, safe multer, and route guards', () => {
      const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
      assert.ok(idx.includes("app.set('trust proxy', 1)"), 'Missing trust proxy');
      assert.ok(idx.includes('X-Content-Type-Options'), 'Missing security headers');
      assert.ok(idx.includes('SAFE_MIME_EXT'), 'Missing multer extension map');
      assert.ok(/setEmptyPic['"]\s*,\s*protect/.test(idx), 'Missing protect on setEmptyPic');
      assert.ok(/sendQrCode['"]\s*,\s*protect/.test(idx), 'Missing protect on sendQrCode');
      assert.ok(idx.includes('publicRateLimit'), 'Missing rate limit on public intake routes');
    });

    await test('userController & adminController strip password fields on queries', () => {
      const uc = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'userController.js'), 'utf8');
      const ac = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'adminController.js'), 'utf8');
      assert.ok(uc.includes(".select('-password')"), 'userController must exclude password');
      assert.ok(ac.includes(".select('-password')"), 'adminController must exclude password');
      assert.ok(!/console\.log\(username,\s*email,\s*password/.test(ac), 'Plaintext password log still present');
    });

    console.log('== Visit Counter & SMS Campaign Tests ==');
    await test('dayOf() normalizes ISO, YYYY-MM-DD, and M/D/YYYY dates accurately', () => {
      assert.strictEqual(dayOf('2026-11-23T10:54:22'), '2026-11-23');
      assert.strictEqual(dayOf('11/5/2026'), '2026-11-05');
      assert.strictEqual(dayOf('2026-02-28'), '2026-02-28');
      assert.strictEqual(dayOf('not-a-date'), null);
    });

    await test('syncVisitCount unions completed Appointments, Kiosk CheckNotes, and SOAP Visits', async () => {
      let savedUpdate = null;
      stubPatient.findById = () => ({ select: () => ({ lean: async () => ({ _id: 'pat9', fullName: 'Bury Patient' }) }) });
      stubAppointment.find = () => ({ lean: async () => ([{ time: '2026-11-23T10:54:22' }]) });
      stubCheckNotes.find = () => ({ lean: async () => ([{ checkInDate: '2026-11-23T10:54:22' }, { date: '2026-11-20' }]) });
      stubVisit.find = () => ({ lean: async () => ([{ date: '2026-11-18' }]) });
      stubPatient.updateOne = async (filter, update) => { savedUpdate = { filter, update }; };

      await syncVisitCount('pat9');
      assert.ok(savedUpdate, 'Expected Patient.updateOne to be called');
      assert.strictEqual(savedUpdate.update.$set.visitCount, 3, 'Expected 3 distinct clinic days');
      assert.deepStrictEqual(savedUpdate.update.$set.visitDates, ['2026-11-18', '2026-11-20', '2026-11-23']);
    });

    await test('sendSmsCampaign dryRun normalizes US E.164, deduplicates, and appends TCPA STOP', async () => {
      const req = {
        user: 'doc1',
        body: {
          campaignId: 'thanksgiving_registered',
          message: 'Happy Thanksgiving from {{clinic}}! Reach us at {{contact_email}}, website: {{website}}, email: {{company_email}}, or reply to text. Call if preferred.',
          dryRun: true,
          recipients: [
            { name: 'Alicia Martinez', phone: '(314) 813-7555', email: 'alicia@example.com' },
            { name: 'Alicia Duplicate', phone: '+13148137555' },
            { name: 'Bad Phone', phone: '123' },
            { name: 'Dr. Jeffrey Draesel', phone: '+13058641373', email: 'drjeffreydraesel@gmail.com' },
            { name: 'Maria Draysol', phone: '+13055559999' },
            { name: 'Caitlyn Moore', phone: '+13055558888' },
            { name: 'Caitlyn Draesel', phone: '+13055557777' },
          ],
        },
      };
      const res = makeMockRes();
      await sendSmsCampaign(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.response, true);
      assert.strictEqual(res.body.dryRun, true);
      assert.strictEqual(res.body.recipientCount, 1, 'Expected 1 deduplicated valid patient phone');
      assert.strictEqual(res.body.excludedStaffCount, 4, 'Expected 4 company/staff members to be blocked');
      assert.strictEqual(res.body.sampleRecipients[0].phone, '+13148137555');
      assert.ok(res.body.sampleMessage.includes('jasmel.acosta@gmail.com'), 'Expected contact_email interpolation');
      assert.ok(res.body.sampleMessage.includes('Reply STOP to opt out.'), 'Expected TCPA opt-out footer');
    });

    console.log('== Tactical Voice Command & Neural TTS Tests ==');
    await test('voiceCommandController covers all major AIMS modules & validates empty utterances', async () => {
      const { FULL_AIMS_ROUTES, voiceCommandPro, voiceSpeak } = require('../controllers/voiceCommandController');
      const paths = new Set(FULL_AIMS_ROUTES.map((r) => r.path));
      for (const reqPath of ['/TodayPatients', '/Patient', '/sms-center/', '/billing-ai/portal', '/dx-cpt-codes/', '/consent/', '/scribe/', '/voice-commander/', '/Settings', '/kiosk']) {
        assert.ok(paths.has(reqPath), 'FULL_AIMS_ROUTES missing ' + reqPath);
      }
      const resCmd = makeMockRes();
      await voiceCommandPro({ user: 'doc1', body: { text: '' } }, resCmd);
      assert.strictEqual(resCmd.statusCode, 400);
      const resTts = makeMockRes();
      await voiceSpeak({ user: 'doc1', body: { text: '' } }, resTts);
      assert.strictEqual(resTts.statusCode, 400);
    });

    console.log('== Physician Clinical Copilot (PHI-Stripping) Tests ==');
    await test('buildDeidentifiedDossier strips name/email/phone/address/exact DOB while keeping clinical context', () => {
      const { buildDeidentifiedDossier } = require('../controllers/clinicalCopilotController');
      const built = buildDeidentifiedDossier({
        fullName: 'Alicia Martinez',
        email: 'alicia@example.com',
        phoneNumber: '+13148137555',
        address: '123 Secret St, Miami FL',
        dateOfBirth: '1984-05-12',
        gender: 'Female',
        visitReason: 'Lower back pain radiating to left leg',
        medications: 'Lisinopril 10mg, Ibuprofen 600mg',
        allergies: 'Penicillin',
      }, [{ date: '2026-11-20', chiefComplaint: 'Lumbar radiculopathy', Assessment: 'M54.16', Plan: 'Decompression' }]);
      assert.ok(built && built.contextText, 'Expected contextText');
      assert.ok(!built.contextText.includes('Alicia'), 'PHI leak: fullName present');
      assert.ok(!built.contextText.includes('alicia@example.com'), 'PHI leak: email present');
      assert.ok(!built.contextText.includes('3148137555'), 'PHI leak: phone present');
      assert.ok(!built.contextText.includes('123 Secret St'), 'PHI leak: address present');
      assert.ok(!built.contextText.includes('1984-05-12'), 'PHI leak: exact DOB present');
      assert.ok(built.contextText.includes('Lower back pain') && built.contextText.includes('Lisinopril'), 'Clinical context missing');
      assert.ok(built.dossier.ageYears >= 40 && built.dossier.ageYears <= 45, 'Expected computed age in years');
    });

    console.log(`\nPlatform audit suite: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  } finally {
    Module._load = origLoad;
  }
})();
