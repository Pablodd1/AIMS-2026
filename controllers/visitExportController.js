const asyncHandler = require('express-async-handler');
const Visit = require('../models/Visit');
const Patient = require('../models/Patients');
const { buildRomTable } = require('../Helper/romCalculator');

// Get visit timeline for a patient
const getPatientVisits = asyncHandler(async (req, res) => {
  try {
    const { patientId, page = 1, limit = 20 } = req.query;

    if (!patientId) {
      return res.status(400).json({ response: false, msg: 'Patient ID required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const visits = await Visit.find({ pId: patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('soapNotesSummary subjective objective Assessment Plan med cptCodes icdCodes date createdAt chiefComplaint')
      .lean();

    const total = await Visit.countDocuments({ pId: patientId });

    return res.json({
      response: true,
      visits,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get patient visits error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Export patient visit summary as DOCX
const exportVisitDocx = asyncHandler(async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId).lean();
    if (!visit) {
      return res.status(404).json({ response: false, msg: 'Visit not found' });
    }

    const patient = await Patient.findById(visit.pId).select('fullName dateOfBirth phoneNumber email').lean();

    // Dynamic require for docx (avoid crash on missing module)
    let docx;
    try {
      docx = require('docx');
    } catch (e) {
      return res.status(500).json({ response: false, msg: 'DOCX module not available. Run: npm install docx' });
    }
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = docx;

    // Build a range-of-motion comparison table when the visit has ROM data
    const romRows = [];
    if (Array.isArray(visit.rangeOfMotion) && visit.rangeOfMotion.length) {
      const rom = buildRomTable(visit.rangeOfMotion);
      romRows.push(new TableRow({
        children: ['Region / Motion', 'Measured', 'Normal', 'Deficit %', 'Pain Elicited'].map(h =>
          new TableCell({ children: [new Paragraph({ text: h, bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })
        ),
      }));
      rom.forEach((r) => {
        romRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(`${r.region || '—'} ${r.movement || ''}`)] }),
            new TableCell({ children: [new Paragraph(r.measured != null ? `${r.measured}°` : '—')] }),
            new TableCell({ children: [new Paragraph(r.normal != null ? `${r.normal}°` : '—')] }),
            new TableCell({ children: [new Paragraph(r.deficitPct != null ? `${r.deficitPct}%` : '—')] }),
            new TableCell({ children: [new Paragraph(r.painElicited ? 'YES (Positive)' : 'No')] }),
          ],
        }));
      });
    }

    // ---- document helpers ----------------------------------------------
    const P = (text, opts) => new Paragraph(Object.assign({ text: String(text == null ? '' : text) }, opts || {}));
    const H = (text) => new Paragraph({ text: String(text), heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 60 } });
    const sec = (label, value) => {
      const t = String(value == null ? '' : value).trim();
      if (!t) return [];
      return [H(label), P(t, { spacing: { after: 120 } })];
    };
    // Older visits stored some fields as JSON blobs (physicalExamination, etc.) — flatten for print.
    const flatten = (v) => {
      if (v == null || typeof v !== 'string') return v;
      const s = v.trim();
      if (s.startsWith('{') || s.startsWith('[')) {
        try {
          const o = JSON.parse(s);
          if (Array.isArray(o)) return o.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
          return Object.keys(o).map((k) => k.replace(/[_-]+/g, ' ').trim() + ': ' + (typeof o[k] === 'object' && o[k] !== null ? JSON.stringify(o[k]) : o[k])).join('\n');
        } catch (e) { return v; }
      }
      return v;
    };
    const codeTable = (label, items, withUnits) => {
      if (!Array.isArray(items) || !items.length) return [];
      const headers = withUnits ? ['Code', 'Description', 'Units'] : ['Code', 'Description'];
      const rows = [
        new TableRow({ children: headers.map((h2) => new TableCell({ children: [new Paragraph({ text: h2, bold: true })], width: { size: 20, type: WidthType.PERCENTAGE } })) }),
        ...items.map((it) => new TableRow({
          children: (withUnits ? [it.code, it.description || '', String(it.units || 1)] : [it.code, it.description || ''])
            .map((c2) => new TableCell({ children: [new Paragraph(String(c2 == null ? '—' : c2))] })),
        })),
      ];
      return [H(label), new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }), P('', { spacing: { after: 120 } })];
    };

    // ---- document body: full structured note, no red flags (final record) ----
    const provider = visit.signedBy || visit.signatureName || '';
    const children = [
      new Paragraph({ text: 'Innovative Medical Wellness', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: 'Patient Visit Note', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
      P(`Patient: ${patient?.fullName || 'N/A'}    DOB: ${patient?.dateOfBirth || 'N/A'}`, { spacing: { before: 160 } }),
      P(`Date of service: ${visit.date || 'N/A'}${visit.time ? ' — ' + visit.time : ''}    Phone: ${patient?.phoneNumber || 'N/A'}`),
      P(`Provider: ${provider || '_______________________'}`, { spacing: { after: 120 } }),
      ...sec('Chief Complaint', flatten(visit.chiefComplaint)),
      ...sec('History of Present Illness (HPI)', flatten(visit.HPI)),
      ...sec('Past Medical History (PMH)', flatten(visit.PMH)),
      ...sec('Subjective', flatten(visit.subjective)),
      ...sec('Objective', flatten(visit.objective)),
      ...sec('Physical Examination', flatten(visit.physicalExamination)),
      ...sec('Performed Today', flatten(visit.performedToday)),
      ...sec('Planned / Future (not yet done)', flatten(visit.plannedFuture)),
      ...sec('Assessment', flatten(visit.Assessment)),
    ];
    // Medical rationale is stored as JSON ({"Medical Rationale": "..."}) — decode for print.
    let rationaleText = '';
    if (visit.Rationale) {
      try {
        const rj = JSON.parse(visit.Rationale);
        rationaleText = (rj && typeof rj === 'object') ? Object.keys(rj).map((k) => k + ': ' + rj[k]).join('\n') : String(visit.Rationale);
      } catch (e) { rationaleText = String(visit.Rationale); }
    }
    children.push(...sec('Medical Rationale', rationaleText));
    children.push(...sec('Plan', flatten(visit.Plan)));
    children.push(...sec('Medications', flatten(visit.med)));
    children.push(...sec('Allergies', flatten(visit.Allergy)));
    children.push(...sec('Summary', flatten(visit.soapNotesSummary)));
    if (typeof visit.ROS === 'string' && visit.ROS.trim()) {
      try {
        const ros = JSON.parse(visit.ROS);
        const lines = Object.keys(ros)
          .filter((k) => ros[k] && String(ros[k].description || '').trim() && !/^not discussed during the consultation\.?$/i.test(String(ros[k].description).trim()))
          .map((k) => `${k}: ${ros[k].description}`);
        if (lines.length) children.push(...sec('Review of Systems', lines.join('\n')));
      } catch (e) {}
    }
    children.push(...codeTable('Diagnosis (ICD-10)', (Array.isArray(visit.icdCodes) && visit.icdCodes.length) ? visit.icdCodes : visit.dxCodes));
    children.push(...codeTable('Procedures (CPT)', visit.cptCodes, true));
    if (romRows.length) {
      children.push(H('Range of Motion (vs AMA Guides)'));
      children.push(new Table({ rows: romRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(P('', { spacing: { after: 120 } }));
    }
    children.push(P('', { spacing: { before: 300 } }));
    children.push(P('_______________________________________'));
    children.push(P(visit.signedAt
      ? `Signed electronically by ${visit.signatureName || visit.signedBy} on ${new Date(visit.signedAt).toLocaleString()}`
      : `${provider || 'Provider'} — signature`));
    children.push(P(`Generated from the recorded consultation by AIMS Scribe — ${new Date().toLocaleString()}`, { spacing: { before: 80 } }));

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `visit-note-${visit.date || 'export'}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Export visit error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

module.exports = {
  getPatientVisits,
  exportVisitDocx,
};
