// Range-of-motion post-processing: deficit % vs AMA baselines + comparison tables.
const { ROM_REGION_INDEX } = require('../config/clinicalBaselines');

// Normalize an LLM ROM entry into a lookup key. Tolerant of wording variation:
//   region "Cervical Spine"/"Cervical" -> "cervical"; movement "Flexion" -> "flexion";
//   "Right Lateral Flexion" -> "lateralFlexionRight", "Left Rotation" -> "rotationLeft".
function normalizeMovement(movement) {
  const s = String(movement || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  const lateral = /lateral|side bend|sidebend/.test(s);
  const right = /\bright\b/.test(s);
  const left = /\bleft\b/.test(s);
  if (/dorsiflexion|plantarflexion|plantar flexion|dorsal flexion/.test(s)) return s.replace(/\s+/g, '');
  if (/flexion|forward/.test(s)) return lateral ? (right ? 'lateralFlexionRight' : (left ? 'lateralFlexionLeft' : 'lateralFlexion')) : 'flexion';
  if (/extension|backward/.test(s)) return 'extension';
  if (/rotation|rotary/.test(s)) return right ? 'rotationRight' : (left ? 'rotationLeft' : 'rotation');
  if (lateral) return right ? 'lateralFlexionRight' : (left ? 'lateralFlexionLeft' : 'lateralFlexion');
  return s.replace(/\s+/g, '');
}

function normalizeRegion(region) {
  const s = String(region || '').toLowerCase();
  if (s.includes('cervic') || s.includes('neck')) return 'cervical';
  if (s.includes('lumb') || s.includes('low back')) return 'lumbar';
  if (s.includes('thorac') || s.includes('dorsal')) return 'thoracic';
  return 'cervical'; // default: no baseline table -> deficit 0
}

// Compute deficit % for a single measured movement. Returns { normal, deficitPct }.
// deficitPct is 0 when no baseline exists (unknown region/movement) or measured >= normal.
function calculateRomDeficit(entry) {
  const region = normalizeRegion(entry.region);
  const movement = normalizeMovement(entry.movement);
  const table = ROM_REGION_INDEX[region];
  const baseline = table && table[movement];
  const measured = Number(entry.measured);
  if (!baseline || !Number.isFinite(measured)) return { normal: null, deficitPct: 0, matched: false };
  const normal = baseline.normal;
  const deficitPct = Math.max(0, (normal - measured) / normal * 100);
  return { normal, deficitPct, matched: true };
}

// Build the full comparison array for a visit's rangeOfMotion entries,
// annotated with normal baseline + deficit %. Returns array of row objects.
function buildRomTable(rangeOfMotion) {
  const entries = Array.isArray(rangeOfMotion) ? rangeOfMotion : [];
  return entries.map((e) => {
    const { normal, deficitPct, matched } = calculateRomDeficit(e);
    return {
      region: e.region || null,
      movement: e.movement || null,
      measured: Number.isFinite(Number(e.measured)) ? Number(e.measured) : null,
      normal,
      deficitPct: matched ? Number(deficitPct.toFixed(1)) : null,
      painElicited: !!e.painElicited,
      matched,
    };
  });
}

// Extract a numeric pain/VAS score (0-10) from free text. Returns null if none found.
// ponytail: naive regex scan of the subjective/objective text; a dedicated VAS field
// is the upgrade path if the frontend ever exposes one.
function extractPainScale(text) {
  if (!text) return null;
  const s = String(text);
  const m = s.match(/(?:pain|VAS|severity)?[^\d]{0,20}(?:is|of|:|)?\s*(\d{1,2})\s*\/\s*10/i) ||
            s.match(/\b(\d{1,2})\s*\/\s*10\b/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 0 && n <= 10) return n;
  }
  return null;
}

// Compute longitudinal deltas between a baseline visit and a current visit.
// Both are plain objects (lean). Pure — no I/O. Returns:
// { vas: {baseline,current,reductionPct}, rom: [...], adl: [...], ortho: [...], daysBetween }
function computeReExamDeltas(baseline, current) {
  const b = baseline || {};
  const c = current || {};
  const bVas = extractPainScale(`${b.subjective || ''} ${b.objective || ''}`);
  const cVas = extractPainScale(`${c.subjective || ''} ${c.objective || ''}`);

  // ROM: match baseline/current entries by region+movement key
  const bRom = buildRomTable(b.rangeOfMotion || []);
  const cRom = buildRomTable(c.rangeOfMotion || []);
  const key = (r) => `${normalizeRegion(r.region)}:${normalizeMovement(r.movement)}`;
  const rom = cRom.filter(r => r.matched).map((cr) => {
    const br = bRom.find((x) => key(x) === key(cr));
    if (!br || !br.matched || br.measured == null || cr.measured == null) return null;
    const delta = Number((cr.measured - br.measured).toFixed(1));
    return {
      region: cr.region,
      movement: cr.movement,
      baseline: br.measured,
      current: cr.measured,
      normal: cr.normal,
      change: delta,
      improved: delta > 0,
    };
  }).filter(Boolean);

  // ADL: match by activity string
  const bAdl = b.impactOnADL || [];
  const cAdl = c.impactOnADL || [];
  const sev = { 'MILD': 1, 'MODERATE': 2, 'SEVERE': 3, 'COMPLETE_INABILITY': 4 };
  const adl = cAdl.map((cItem) => {
    const bItem = bAdl.find((x) => (x.activity || '').toLowerCase() === (cItem.activity || '').toLowerCase());
    if (!bItem || !sev[cItem.severity] || !sev[bItem.severity]) return null;
    const delta = sev[bItem.severity] - sev[cItem.severity]; // positive = improved
    return { activity: cItem.activity, baseline: bItem.severity, current: cItem.severity, change: delta, improved: delta > 0 };
  }).filter(Boolean);

  // Orthopedic tests: compare test names present in each visit's objective text
  const orthoTests = [
    { name: 'Straight Leg Raise', re: /straight leg raise|SLR/i },
    { name: 'Kemp\'s Test', re: /kemp/i },
    { name: 'Jackson Compression', re: /jackson/i },
    { name: 'Spurling\'s Test', re: /spurling/i },
  ];
  const ortho = orthoTests.map((t) => {
    const bText = `${b.objective || ''}`;
    const cText = `${c.objective || ''}`;
    const bPos = bText && t.re.test(bText) && /positive|\+/.test(bText);
    const cPos = cText && t.re.test(cText) && /positive|\+/.test(cText);
    const bPres = bText && t.re.test(bText);
    const cPres = cText && t.re.test(cText);
    if (!bPres && !cPres) return null;
    return { test: t.name, baseline: bPos ? 'Positive' : (bPres ? 'Negative' : 'Not tested'), current: cPos ? 'Positive' : (cPres ? 'Negative' : 'Not tested'), resolved: bPos && !cPos };
  }).filter(Boolean);

  // Days between visits (using createdAt when available)
  let daysBetween = null;
  const bDate = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date) : null);
  const cDate = c.createdAt ? new Date(c.createdAt) : (c.date ? new Date(c.date) : null);
  if (bDate && cDate && !isNaN(bDate) && !isNaN(cDate)) {
    daysBetween = Math.max(0, Math.round((cDate - bDate) / 86400000));
  }

  const vas = (bVas != null || cVas != null)
    ? { baseline: bVas, current: cVas, reductionPct: (bVas != null && cVas != null) ? Number((((bVas - cVas) / bVas) * 100).toFixed(1)) : null }
    : null;

  return { vas, rom, adl, ortho, daysBetween };
}

module.exports = { calculateRomDeficit, buildRomTable, normalizeRegion, normalizeMovement, extractPainScale, computeReExamDeltas };