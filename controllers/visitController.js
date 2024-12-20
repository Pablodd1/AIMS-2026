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
      const { id, page = 1, limit = 3 } = req.query;

      if (!id) {
          return res.status(400).json({
              response: false,
              msg: "Missing required parameter: id",
          });
      }

      // Parse page and limit to ensure they are numbers
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
          return res.status(400).json({
              response: false,
              msg: "Invalid page or limit value. Both must be positive integers.",
          });
      }

      // Calculate skip value for pagination
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch paginated visits
      const visits = await Visit.find({ pId: id })
          .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
          .skip(skip)
          .limit(limitNumber);

      // Fetch total count for metadata
      const totalCount = await Visit.countDocuments({ pId: id });

      return res.status(200).json({
          response: true,
          visits,
          pagination: {
              total: totalCount,
              page: pageNumber,
              limit: limitNumber,
              totalPages: Math.ceil(totalCount / limitNumber),
          },
      });
  } catch (e) {
      return res.status(500).json({
          response: false,
          msg: "An error occurred while fetching visits.",
      });
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
