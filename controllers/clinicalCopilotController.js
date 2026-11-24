const asyncHandler = require('express-async-handler');
const OpenAI = require('openai');
const Patient = require('../models/Patients');
const Visit = require('../models/Visit');
const CheckNotes = require('../models/CheckNotes');
const User = require('../models/User');

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY || 'missing-key' });

function computeAgeFromDob(dob) {
  if (!dob) return null;
  const ts = Date.parse(String(dob));
  if (isNaN(ts)) return null;
  const diff = Date.now() - ts;
  const age = Math.floor(diff / (365.25 * 86400000));
  return age >= 0 && age <= 120 ? age : null;
}

/**
 * Strips ALL direct PHI (fullName, email, phoneNumber, address, exact DOB, insurance IDs)
 * and keeps ONLY clinical context so a physician can brainstorm safely with AI.
 */
function buildDeidentifiedDossier(patient, visits = [], checkIns = []) {
  if (!patient) return null;
  const age = computeAgeFromDob(patient.dateOfBirth);
  const dossier = {
    ageYears: age,
    gender: patient.gender || 'Not stated',
    visitReason: patient.visitReason || '',
    symptomDescription: patient.symptomDescription || '',
    symptomDuration: patient.symptomDuration || '',
    symptomSeverity: patient.symptomSeverity || patient.painScale || '',
    symptomTriggers: patient.symptomTriggers || '',
    painLocation: patient.painLocation || '',
    painQuality: patient.painQuality || '',
    functionalLimitations: patient.functionalLimitations || '',
    medications: patient.medications || 'Not stated',
    allergies: patient.allergies || 'Not stated',
    chronicConditions: patient.chronicConditions || '',
    pastSurgeries: patient.pastSurgeries || '',
    familyMedicalHistory: patient.familyMedicalHistory || '',
    lifestyle: [patient.occupation, patient.smoking, patient.alcohol, patient.exerciseAndDiet].filter(Boolean).join('; '),
    intakeSummary: patient.summary || '',
    visitCount: Math.max(Number(patient.visitCount || 0), visits.length, checkIns.length),
    recentVisits: (visits || []).slice(0, 5).map((v) => ({
      date: v.date || (v.createdAt ? String(v.createdAt).slice(0, 10) : ''),
      chiefComplaint: v.chiefComplaint || '',
      subjective: String(v.subjective || '').slice(0, 500),
      objective: String(v.objective || v.physicalExamination || '').slice(0, 500),
      assessment: String(v.Assessment || '').slice(0, 400),
      plan: String(v.Plan || '').slice(0, 400),
      dxCodes: Array.isArray(v.dxCodes) ? v.dxCodes.map((d) => (typeof d === 'string' ? d : d.code)).filter(Boolean) : [],
      cptCodes: Array.isArray(v.cptCodes) ? v.cptCodes.map((c) => (typeof c === 'string' ? c : c.code)).filter(Boolean) : [],
    })),
  };

  const lines = [
    `DE-IDENTIFIED PATIENT PROFILE (PHI STRIPPED):`,
    `- Demographics: ${age != null ? age + ' y/o' : 'Age not stated'}, ${dossier.gender}`,
    dossier.visitReason ? `- Presenting Reason: ${dossier.visitReason}` : null,
    dossier.symptomDescription ? `- Symptoms: ${dossier.symptomDescription}${dossier.symptomDuration ? ' (Duration: ' + dossier.symptomDuration + ')' : ''}${dossier.symptomSeverity ? ' (Severity: ' + dossier.symptomSeverity + ')' : ''}` : null,
    dossier.painLocation ? `- Pain Location/Quality: ${dossier.painLocation} ${dossier.painQuality}`.trim() : null,
    dossier.functionalLimitations ? `- Functional/ADL Limits: ${dossier.functionalLimitations}` : null,
    `- Medications: ${dossier.medications}`,
    `- Allergies: ${dossier.allergies}`,
    dossier.chronicConditions ? `- Chronic Conditions / PMH: ${dossier.chronicConditions}` : null,
    dossier.pastSurgeries ? `- Surgical History: ${dossier.pastSurgeries}` : null,
    dossier.familyMedicalHistory ? `- Family History: ${dossier.familyMedicalHistory}` : null,
    dossier.intakeSummary ? `- Intake Summary: ${dossier.intakeSummary}` : null,
    `- Recorded Visits: ${dossier.visitCount}`,
  ].filter(Boolean);

  if (dossier.recentVisits.length) {
    lines.push('\nRECENT CLINICAL NOTES (DE-IDENTIFIED):');
    dossier.recentVisits.forEach((v, idx) => {
      lines.push(`[Visit ${idx + 1} | ${v.date || 'DOS N/A'}] CC: ${v.chiefComplaint || 'N/A'} | Assessment: ${v.assessment || 'N/A'} | Plan: ${v.plan || 'N/A'}${v.dxCodes.length ? ' | Dx: ' + v.dxCodes.join(', ') : ''}`);
    });
  }

  return { dossier, contextText: lines.join('\n') };
}

async function fetchWithTimeout(url, ms = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function searchPubMedAndFda(query) {
  const q = String(query || '').trim().slice(0, 140);
  if (!q) return { sources: [], evidenceText: '' };
  const sources = [];
  const notes = [];

  const [pmSearch, fdaData] = await Promise.all([
    fetchWithTimeout(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&term=${encodeURIComponent(q)}`),
    fetchWithTimeout(`https://api.fda.gov/drug/label.json?search=${encodeURIComponent(q)}&limit=2`),
  ]);

  if (pmSearch && pmSearch.esearchresult && Array.isArray(pmSearch.esearchresult.idlist) && pmSearch.esearchresult.idlist.length) {
    const ids = pmSearch.esearchresult.idlist.slice(0, 3).join(',');
    const sum = await fetchWithTimeout(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids}`);
    if (sum && sum.result) {
      pmSearch.esearchresult.idlist.slice(0, 3).forEach((pmid) => {
        const item = sum.result[pmid];
        if (item && item.title) {
          const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
          sources.push({ source: 'PubMed', title: item.title, url, date: item.pubdate || '' });
          notes.push(`PubMed (${pmid}, ${item.pubdate || ''}): ${item.title}`);
        }
      });
    }
  }

  if (fdaData && Array.isArray(fdaData.results)) {
    fdaData.results.slice(0, 2).forEach((r) => {
      const name = (r.openfda && ((r.openfda.brand_name && r.openfda.brand_name[0]) || (r.openfda.generic_name && r.openfda.generic_name[0]))) || 'FDA Drug Label';
      const inter = Array.isArray(r.drug_interactions) ? String(r.drug_interactions[0]).slice(0, 450) : '';
      const warn = Array.isArray(r.boxed_warning) ? String(r.boxed_warning[0]).slice(0, 300) : '';
      if (inter || warn) {
        sources.push({ source: 'OpenFDA', title: `${name} — FDA Label / Interactions`, url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(name)}` });
        notes.push(`OpenFDA (${name}): ${warn ? 'BOXED WARNING: ' + warn + ' ' : ''}${inter ? 'INTERACTIONS: ' + inter : ''}`);
      }
    });
  }

  return { sources, evidenceText: notes.join('\n') };
}

/**
 * GET /api/get/deidentifiedPatientContext?patientId=...
 */
const getDeidentifiedPatientContext = asyncHandler(async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ response: false, msg: 'patientId required' });
    const caller = await User.findById(req.user).select('admin').lean().catch(() => null);
    const scope = caller && caller.admin ? { _id: patientId } : { _id: patientId, doc_id: req.user };
    const patient = await Patient.findOne(scope).lean();
    if (!patient) return res.status(404).json({ response: false, msg: 'Patient not found' });

    const [visits, checkIns] = await Promise.all([
      Visit.find({ pId: String(patient._id) }).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
      CheckNotes.find({ pId: String(patient._id) }).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
    ]);

    const built = buildDeidentifiedDossier(patient, visits, checkIns);
    return res.json({ response: true, ...built });
  } catch (e) {
    console.error('getDeidentifiedPatientContext error:', e.message);
    return res.status(500).json({ response: false, msg: e.message });
  }
});

const PHYSICIAN_COPILOT_PROMPT = `You are AIMS Physician Clinical Copilot — an attending-level medical doctor AI assistant operating across the FULL SCOPE OF MEDICINE (internal medicine, orthopedics, neurology, musculoskeletal/chiropractic, pain management, pharmacology, labs, imaging, regenerative/wellness, and urgent red-flag triage).

CORE DIRECTIVES:
1. You are assisting a licensed physician/clinician. Respond with structured, evidence-based, physician-grade clinical reasoning.
2. When a DE-IDENTIFIED PATIENT PROFILE and clinical notes are provided, synthesize the patient's symptoms, age/sex, medications, allergies, PMH, and prior notes directly into your reasoning. NEVER ask for or repeat patient identifying information (name, DOB, phone, address).
3. Cover as relevant to the doctor's query:
   - Ranked Differential Diagnosis (most likely + must-not-miss red flags)
   - Drug-Drug, Drug-Disease, and Allergy Interaction Check (explicitly flag contraindications, renal/hepatic/QT/bleeding/serotonin/sedation risks)
   - Diagnostic Workup (targeted labs, imaging, orthopedic/neuro exam maneuvers)
   - Evidence-Based Treatment & Medication Options (first-line, alternatives, dosing considerations)
   - Online Literature / FDA Evidence (cite any PubMed/OpenFDA findings provided)
4. Be concise, scannable (bulleted headings), honest about uncertainty, and never fabricate citations.`;

/**
 * POST /api/post/clinicalBrainstorm
 * Body: { question, patientId?, history?, onlineSearch?: boolean }
 */
const clinicalBrainstorm = asyncHandler(async (req, res) => {
  try {
    const { question, patientId = '', history = [], onlineSearch = true } = req.body || {};
    const q = String(question || '').trim();
    if (!q) return res.status(400).json({ response: false, msg: 'Clinical question is required.' });

    let deidContext = '';
    if (patientId) {
      const caller = await User.findById(req.user).select('admin').lean().catch(() => null);
      const scope = caller && caller.admin ? { _id: patientId } : { _id: patientId, doc_id: req.user };
      const patient = await Patient.findOne(scope).lean().catch(() => null);
      if (patient) {
        const [visits, checkIns] = await Promise.all([
          Visit.find({ pId: String(patient._id) }).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
          CheckNotes.find({ pId: String(patient._id) }).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
        ]);
        const built = buildDeidentifiedDossier(patient, visits, checkIns);
        if (built) deidContext = built.contextText;
      }
    }

    let sources = [];
    let evidenceText = '';
    if (onlineSearch) {
      const searchRes = await searchPubMedAndFda(q);
      sources = searchRes.sources;
      evidenceText = searchRes.evidenceText;
    }

    const recentHistory = Array.isArray(history)
      ? history.slice(-8).map((h) => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: String(h.content || '').slice(0, 1500),
        }))
      : [];

    const userParts = [];
    if (deidContext) userParts.push(deidContext);
    if (evidenceText) userParts.push('LIVE PUBMED / OPENFDA EVIDENCE:\n' + evidenceText);
    userParts.push('PHYSICIAN QUESTION:\n' + q);

    const completion = await openai.chat.completions.create({
      model: process.env.AIMS_COPILOT_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: PHYSICIAN_COPILOT_PROMPT },
        ...recentHistory,
        { role: 'user', content: userParts.join('\n\n') },
      ],
    });

    const answer = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || 'No clinical response generated.';
    return res.json({
      response: true,
      answer,
      phiStripped: !!patientId,
      sources,
    });
  } catch (e) {
    console.error('clinicalBrainstorm error:', e.message);
    return res.status(500).json({ response: false, msg: e.message || 'Clinical copilot failed' });
  }
});

module.exports = {
  buildDeidentifiedDossier,
  getDeidentifiedPatientContext,
  clinicalBrainstorm,
};
