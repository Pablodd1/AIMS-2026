const asyncHandler = require("express-async-handler");
const Visit = require("../../models/Visit");
const Patient = require("../../models/Patients");
const OpenAI = require("openai");

// Reuse the same OpenAI client pattern as openaiController.js
// Read the key directly from the source to avoid env mismatch
const fs = require("fs");
function getOpenAiKey() {
  try {
    const src = fs.readFileSync(require("path").join(__dirname, "../openaiController.js"), "utf8");
    const m = src.match(/apiKey:\s*["']([^"']+)["']/);
    return m ? m[1] : process.env.OPENAI_KEY || "";
  } catch {
    return process.env.OPENAI_KEY || "";
  }
}

// Auto-generate a SOAP summary from visit fields if none was provided.
async function generateSoapSummary(fields) {
  const { subjective, objective, Assessment, Plan, chiefComplaint, HPI } = fields;
  const hasContent = (s) => s && s !== "N/A" && s.trim().length > 0;

  // Need at least one SOAP section to summarize
  if (!hasContent(subjective) && !hasContent(Assessment) && !hasContent(Plan)) {
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey: getOpenAiKey() });

    const soapText = [
      hasContent(chiefComplaint) ? `Chief Complaint: ${chiefComplaint}` : "",
      hasContent(HPI) ? `HPI: ${HPI}` : "",
      hasContent(subjective) ? `Subjective: ${subjective}` : "",
      hasContent(objective) ? `Objective: ${objective}` : "",
      hasContent(Assessment) ? `Assessment: ${Assessment}` : "",
      hasContent(Plan) ? `Plan: ${Plan}` : "",
    ].filter(Boolean).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: "You are a medical scribe. Write a concise 2-3 sentence clinical summary of this SOAP note. Return ONLY the summary text as a plain string, no JSON, no markdown.",
        },
        { role: "user", content: soapText },
      ],
    });

    const summary = response.choices[0].message.content.trim();
    return summary || null;
  } catch (e) {
    console.error("Auto-summary generation failed:", e.message);
    return null;
  }
}

const createVisit = asyncHandler(async (req, res) => {
  try {
    let {
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
      // AUTO-SUMMARIZE: if no summary was provided but SOAP fields exist, generate one
      const hasSummary = soapNotesSummary && soapNotesSummary.trim() && soapNotesSummary !== "N/A";
      if (!hasSummary) {
        const autoSummary = await generateSoapSummary({
          subjective, objective, Assessment, Plan, chiefComplaint, HPI,
        });
        if (autoSummary) {
          soapNotesSummary = autoSummary;
        }
      }

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
      
      // Increment patient visit counter
      await Patient.updateOne({ _id: pId }, { $inc: { visitCount: 1 } });

      res.json({ response: true, msg: "Visited registered", id: visit._id, soapNotesSummary });
    } else if (mode == "edit") {
      // AUTO-SUMMARIZE on edit too if summary is empty
      const hasSummary = soapNotesSummary && soapNotesSummary.trim() && soapNotesSummary !== "N/A";
      if (!hasSummary) {
        const autoSummary = await generateSoapSummary({
          subjective, objective, Assessment, Plan, chiefComplaint, HPI,
        });
        if (autoSummary) {
          soapNotesSummary = autoSummary;
        }
      }

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

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
          return res.status(400).json({
              response: false,
              msg: "Invalid page or limit value. Both must be positive integers.",
          });
      }

      const skip = (pageNumber - 1) * limitNumber;

      const visits = await Visit.find({ pId: id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber);

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

const getAllVisits = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        response: false,
        msg: "Missing required parameter: id",
      });
    }

    const visits = await Visit.find({ pId: id })
      .sort({ createdAt: 1 })
      .select('_id date time createdAt chiefComplaint soapNotesSummary');

    const totalCount = visits.length;

    const patient = await Patient.findOne({ _id: id }).select('fullName phoneNumber');

    return res.status(200).json({
      response: true,
      patient,
      totalVisits: totalCount,
      visits: visits.map((v, idx) => ({
        visitNumber: idx + 1,
        _id: v._id,
        date: v.date,
        time: v.time,
        createdAt: v.createdAt,
        chiefComplaint: v.chiefComplaint,
        summary: v.soapNotesSummary ? v.soapNotesSummary.slice(0, 100) + (v.soapNotesSummary.length > 100 ? '...' : '') : null,
      })),
    });
  } catch (e) {
    return res.status(500).json({
      response: false,
      msg: "An error occurred while fetching visit history.",
    });
  }
});

const delVisit = asyncHandler(async (req, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.query.id });
    if (visit) {
      await Patient.updateOne({ _id: visit.pId }, { $inc: { visitCount: -1 } });
    }
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

const newReportMethodStoredIntoDb = asyncHandler(async(req,res)=>{

   const { pId , reportData , transcription , mode , visitId } = req.body

   try {
  
    if (mode == "generate") {
      const visit = new Visit({
        doc_id:req.user,
        pId,
        all:transcription,
        reportType:"2.0",
        soapNotesSummary:reportData
      });

      await visit.save();

      await Patient.updateOne({ _id: pId }, { $inc: { visitCount: 1 } });

     return res.json({ response: true, msg: "Visited registered", id: visit._id });

    } else if (mode == "edit") {
      
      await Visit.updateOne(
        { _id: visitId },
        {
          soapNotesSummary:reportData,
        }
      );

      res.json({ response: true, msg: "Report updated" });
    }

  } catch (e) {
    res.status(500).json({ response: false, error: e});
  }

})

module.exports = {
  createVisit,
  viewReport,
  getVists,
  getAllVisits,
  editReport,
  delVisit,
  updateVisitDate,
  recentVisit,
  newReportMethodStoredIntoDb
};
