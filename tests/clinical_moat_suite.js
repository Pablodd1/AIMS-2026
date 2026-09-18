// Clinical moat verification suite — pure logic, no DB/network.
// Covers: ROM deficit math, billing audit triggers, re-exam delta calc, PI schema passthrough.
const assert = require('assert');
const { calculateRomDeficit, buildRomTable, extractPainScale, computeReExamDeltas, normalizeMovement, normalizeRegion } = require('../Helper/romCalculator');
const { auditChiropracticBilling } = require('../Helper/billingAuditor');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.error('  FAIL ' + name + ' -> ' + e.message); }
}

console.log('== ROM deficit math ==');
test('cervical flexion 30 -> 40% deficit vs 50 normal', () => {
  const r = calculateRomDeficit({ region: 'Cervical Spine', movement: 'Flexion', measured: 30 });
  assert.strictEqual(r.normal, 50);
  assert.strictEqual(r.deficitPct, 40);
  assert.strictEqual(r.matched, true);
});
test('lumbar flexion 60 -> 0% (at normal)', () => {
  const r = calculateRomDeficit({ region: 'Lumbar', movement: 'Flexion', measured: 60 });
  assert.strictEqual(r.normal, 60);
  assert.strictEqual(r.deficitPct, 0);
});
test('measured above normal clamps to 0%', () => {
  const r = calculateRomDeficit({ region: 'Cervical', movement: 'Extension', measured: 70 });
  assert.strictEqual(r.deficitPct, 0);
});
test('unknown region -> deficit 0, matched false', () => {
  const r = calculateRomDeficit({ region: 'Ankle', movement: 'Dorsiflexion', measured: 10 });
  assert.strictEqual(r.matched, false);
  assert.strictEqual(r.deficitPct, 0);
});
test('movement normalization: "Right Lateral Flexion" -> lateralFlexionRight', () => {
  assert.strictEqual(normalizeMovement('Right Lateral Flexion'), 'lateralFlexionRight');
  assert.strictEqual(normalizeMovement('Left Rotation'), 'rotationLeft');
  assert.strictEqual(normalizeMovement('Flexion'), 'flexion');
});
test('buildRomTable annotates deficit + pain flag', () => {
  const table = buildRomTable([
    { region: 'Cervical Spine', movement: 'Flexion', measured: 30, painElicited: true },
  ]);
  assert.strictEqual(table.length, 1);
  assert.strictEqual(table[0].deficitPct, 40.0);
  assert.strictEqual(table[0].painElicited, true);
});

console.log('== Billing audit ==');
test('98941 with 1 region -> CRITICAL + downcode warning', () => {
  const r = auditChiropracticBilling({
    objective: 'cervical pain on palpation',
    cptCodes: [{ code: '98941' }],
    icdCodes: [{ code: 'M99.01' }],
  });
  assert.strictEqual(r.passed, false);
  assert.ok(r.findings.some(f => f.severity === 'CRITICAL' && f.code === '98941'));
});
test('98942 with <5 regions -> CRITICAL', () => {
  const r = auditChiropracticBilling({
    objective: 'cervical, thoracic, lumbar segments treated',
    cptCodes: ['98942'],
    icdCodes: [{ code: 'M99.03' }],
  });
  assert.strictEqual(r.passed, false);
  assert.ok(r.findings.some(f => f.code === '98942' && f.severity === 'CRITICAL'));
});
test('98940 with 2 documented regions + subluxation -> passes', () => {
  const r = auditChiropracticBilling({
    objective: 'cervical and lumbar segments adjusted',
    cptCodes: [{ code: '98940' }],
    icdCodes: [{ code: 'M99.01' }],
  });
  assert.strictEqual(r.passed, true);
});
test('98941 with all 5 regions documented -> passes', () => {
  const r = auditChiropracticBilling({
    objective: 'cervical thoracic lumbar sacral pelvic regions adjusted',
    cptCodes: [{ code: '98941' }],
    icdCodes: [{ code: 'M99.02' }],
  });
  assert.strictEqual(r.passed, true);
});
test('98940 without subluxation dx -> M99.0X_MISSING warning (still passes)', () => {
  const r = auditChiropracticBilling({
    objective: 'cervical and lumbar regions adjusted',
    cptCodes: [{ code: '98940' }],
    icdCodes: [{ code: 'M54.5' }],
  });
  assert.strictEqual(r.passed, true);
  assert.ok(r.findings.some(f => f.code === 'M99.0X_MISSING' && f.severity === 'WARNING'));
});
test('region detection is substring-safe (pelvic vs ilium)', () => {
  const r = auditChiropracticBilling({
    objective: 'neck, mid back, low back, si joint, ilium',
    cptCodes: [{ code: '98942' }],
    icdCodes: [{ code: 'M99.05' }],
  });
  assert.strictEqual(r.passed, true);
});

console.log('== Re-exam deltas ==');
test('VAS 8/10 -> 3/10 = 62.5% reduction', () => {
  const d = computeReExamDeltas(
    { subjective: 'pain is 8/10' },
    { subjective: 'pain now 3/10' }
  );
  assert.strictEqual(d.vas.baseline, 8);
  assert.strictEqual(d.vas.current, 3);
  assert.strictEqual(d.vas.reductionPct, 62.5);
});
test('ROM improvement: cervical flexion 30 -> 40 = +10', () => {
  const d = computeReExamDeltas(
    { rangeOfMotion: [{ region: 'Cervical', movement: 'Flexion', measured: 30 }] },
    { rangeOfMotion: [{ region: 'Cervical', movement: 'Flexion', measured: 40 }] }
  );
  assert.strictEqual(d.rom.length, 1);
  assert.strictEqual(d.rom[0].change, 10);
  assert.strictEqual(d.rom[0].improved, true);
});
test('ADL improvement: SEVERE -> MILD = +2', () => {
  const d = computeReExamDeltas(
    { impactOnADL: [{ activity: 'Sleeping', severity: 'SEVERE' }] },
    { impactOnADL: [{ activity: 'Sleeping', severity: 'MILD' }] }
  );
  assert.strictEqual(d.adl.length, 1);
  assert.strictEqual(d.adl[0].change, 2);
  assert.strictEqual(d.adl[0].improved, true);
});
test('ortho test resolution: SLR positive -> negative resolves', () => {
  const d = computeReExamDeltas(
    { objective: 'Straight Leg Raise positive' },
    { objective: 'Straight Leg Raise negative' }
  );
  assert.ok(d.ortho.some(o => o.test === 'Straight Leg Raise' && o.resolved === true));
});
test('daysBetween computed from createdAt', () => {
  const d = computeReExamDeltas(
    { createdAt: '2026-01-01T00:00:00Z' },
    { createdAt: '2026-01-15T00:00:00Z' }
  );
  assert.strictEqual(d.daysBetween, 14);
});

console.log('== extractPainScale ==');
test('no pain scale -> null', () => {
  assert.strictEqual(extractPainScale('patient feels better today'), null);
});
test('"8/10" recognized', () => {
  assert.strictEqual(extractPainScale('pain level 8/10'), 8);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
