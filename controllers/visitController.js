const asyncHandler = require("express-async-handler");
const Visit = require("../models/Visit");
const Patient = require("../models/Patients");

const createVisit = asyncHandler(async (req, res) => {
  try {
    const {
      doc_id,
      pId,
      all,
      soapNotesSummary,
      subjective,
      objective,
      chiefComplaint,
      HPI,
      PMH,
      Allergy,
      ROS,
      physicalExamination,
      Assessment,
      med,
      cptCodes,
      icdCodes,
      dxCodes,
      Plan,
      Rationale,
      mode,
    } = req.body;

    if (mode == "generate") {
      const visit = new Visit({
        doc_id,
        pId,
        all,
        soapNotesSummary,
        subjective,
        objective,
        chiefComplaint,
        HPI,
        PMH,
        Allergy,
        ROS,
        physicalExamination,
        Assessment,
        med,
        cptCodes,
        icdCodes,
        dxCodes,
        Plan,
        Rationale,
      });

      await visit.save();

      res.json({ response: true, msg: "Visited registered", id: visit._id });
    } else if (mode == "edit") {
      const visit = await Visit.updateOne(
        { _id: pId },
        {
          soapNotesSummary,
          subjective,
          objective,
          chiefComplaint,
          HPI,
          PMH,
          Allergy,
          ROS,
          physicalExamination,
          Assessment,
          med,
          cptCodes,
          icdCodes,
          dxCodes,
          Plan,
          Rationale,
        }
      );

      res.json({ response: true, msg: "Report updated" });
    }

    // }
  } catch (e) {
    res.status(500).json({ response: false, error: e.message });
  }
});

const viewReport = asyncHandler(async (req, res) => {
  try {
    const { visitId } = req.query;

    const visit = await Visit.findOne({ _id: visitId });

    const patient = await Patient.findOne({ _id: visit.pId });

    return res.status(200).json({ response: true, patient, visit });
  } catch (e) {
    return res.json({ response: false });
  }
});

const editReport = asyncHandler(async (req, res) => {
  try {
    const { visitId } = req.query;

    const visit = await Visit.findOne({ _id: visitId });

    return res.status(200).json({ response: true, visit });
  } catch (e) {
    return res.json({ response: false });
  }
});

const getVists = asyncHandler(async (req, res) => {
  try {
    const visits = await Visit.find({ pId: req.query.id });
    res.status(200).json({ visits, response: true });
  } catch (e) {
    res.json({ response: false });
  }
});

const delVisit = asyncHandler(async (req, res) => {
  try {
    await Visit.deleteOne({ _id: req.query.id });
    res.status(200).json({ response: true });
  } catch (e) {
    res.json({ response: false });
  }
});

const updateVisitDate = asyncHandler(async (req, res) => {
  try {
    const { id, date } = req.body;

    await Visit.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          date,
        },
      }
    );

    return res.json({ response: true, msg: "Visit date changed" });
  } catch (e) {
    return res.json({ response: false });
  }
});

const recentVisit = asyncHandler(async (req, res) => {
  try {
    const { patientId } = req.query;

    const visit = await Visit.findOne({ pId: patientId }).sort({ createdAt: -1 }).select('subjective objective Plan soapNotesSummary');
    if(visit == null){
      return res.status(200).json({response:true,paient:[],msg:"no patient visit"})
     }

    const patient = await Patient.findOne({ _id: patientId}).select('fullName dateOfBirth gender date ');
    return res.status(200).json({ response: true, patient, visit });
  } catch (e) {
    return res.json({ response: false });
  }
});

module.exports = {
  createVisit,
  viewReport,
  getVists,
  editReport,
  delVisit,
  updateVisitDate,
  recentVisit
};
