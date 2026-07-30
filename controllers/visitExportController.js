const asyncHandler = require('express-async-handler');
const Visit = require('../models/Visit');
const Patient = require('../models/Patients');

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
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'Innovative Medical Wellness',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: 'Patient Visit Summary',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({
            text: `Patient: ${patient?.fullName || 'N/A'}`,
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph(`Date: ${visit.date || visit.createdAt?.toISOString().split('T')[0] || 'N/A'}`),
          new Paragraph(`DOB: ${patient?.dateOfBirth || 'N/A'} | Phone: ${patient?.phoneNumber || 'N/A'}`),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Chief Complaint', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.chiefComplaint || 'Not recorded'),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Subjective', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.subjective || 'Not recorded'),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Objective', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.objective || 'Not recorded'),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Assessment', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.Assessment || 'Not recorded'),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Plan', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.Plan || 'Not recorded'),
          new Paragraph({ spacing: { after: 200 } }),
          new Paragraph({ text: 'Medications', heading: HeadingLevel.HEADING_3 }),
          new Paragraph(visit.med || 'None'),
          new Paragraph({ spacing: { after: 200 } }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `visit-summary-${visit.date || 'export'}.docx`;

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
