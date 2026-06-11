const asyncHandler = require('express-async-handler');
const NoteType = require('../models/NoteType');

// ===== Seed Default Note Types =====
const seedDefaultNoteTypes = async () => {
  const count = await NoteType.countDocuments();
  if (count > 0) return; // Already seeded

  const defaults = [
    {
      name: 'New Patient Intake',
      slug: 'new-patient-intake',
      description: 'Standard intake form with 33 medical questions for new patients',
      category: 'intake',
      active: true,
      systemPrompt: `Extracts answers and formats them into a JSON object. Always return an array of 33 question-answer objects.
If the transcription does not contain the answer to a question, set its answer to null.
The output must be in English and date of birth must be in this format YYYY-MM-DD.`,
      questions: [
        // Demographics (1-7)
        { id: 1, question: 'Please state your full name.', field: 'fullName', category: 'demographics', required: true, type: 'text', order: 1 },
        { id: 2, question: 'What is your date of birth?', field: 'dateOfBirth', category: 'demographics', required: true, type: 'date', example: 'YYYY-MM-DD', order: 2 },
        { id: 3, question: 'What is your gender?', field: 'gender', category: 'demographics', required: false, type: 'select', options: ['Male', 'Female', 'Other'], order: 3 },
        { id: 4, question: 'What is your email address?', field: 'email', category: 'demographics', required: false, type: 'email', order: 4 },
        { id: 5, question: 'What is your phone number?', field: 'phoneNumber', category: 'demographics', required: true, type: 'phone', order: 5 },
        { id: 6, question: 'Please provide the phone number of an emergency contact.', field: 'emergencyContactPhoneNumber', category: 'demographics', required: false, type: 'phone', order: 6 },
        { id: 7, question: 'What is your address?', field: 'address', category: 'demographics', required: false, type: 'text', order: 7 },
        
        // Insurance (8-11)
        { id: 8, question: 'Who is your insurance provider?', field: 'insuranceProvider', category: 'insurance', required: false, type: 'text', order: 8 },
        { id: 9, question: 'What is your insurance policy number?', field: 'insurancePolicyNumber', category: 'insurance', required: false, type: 'text', order: 9 },
        { id: 10, question: 'What is your Policy Holder Name?', field: 'policyHolderName', category: 'insurance', required: false, type: 'text', order: 10 },
        { id: 11, question: 'What is your group number?', field: 'groupNumber', category: 'insurance', required: false, type: 'text', order: 11 },
        
        // Medical History (12-17)
        { id: 12, question: 'Who is your primary care physician?', field: 'primaryCarePhysician', category: 'history', required: false, type: 'text', order: 12 },
        { id: 13, question: 'Please list any medications you are currently taking.', field: 'medications', category: 'history', required: true, type: 'textarea', order: 13 },
        { id: 14, question: 'Do you have any allergies to medications, food, or other substances?', field: 'allergies', category: 'history', required: true, type: 'textarea', order: 14 },
        { id: 15, question: 'Do you have any chronic medical conditions?', field: 'chronicConditions', category: 'history', required: false, type: 'textarea', order: 15 },
        { id: 16, question: 'Have you had any surgeries in the past?', field: 'pastSurgeries', category: 'history', required: false, type: 'textarea', order: 16 },
        { id: 17, question: 'Is there any significant family medical history we should be aware of?', field: 'familyMedicalHistory', category: 'history', required: false, type: 'textarea', order: 17 },
        
        // Chief Complaint & Symptoms (18-23)
        { id: 18, question: 'What brings you in today?', field: 'visitReason', category: 'symptoms', required: true, type: 'textarea', order: 18 },
        { id: 19, question: 'Can you describe your symptoms in detail?', field: 'symptomDescription', category: 'symptoms', required: true, type: 'textarea', order: 19 },
        { id: 20, question: 'How long have you been experiencing these symptoms?', field: 'symptomDuration', category: 'symptoms', required: true, type: 'text', order: 20 },
        { id: 21, question: 'On a scale of 1 to 10, how severe are your symptoms?', field: 'symptomSeverity', category: 'symptoms', required: true, type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], order: 21 },
        { id: 22, question: 'Have you experienced these symptoms before?', field: 'symptomHistory', category: 'symptoms', required: false, type: 'textarea', order: 22 },
        { id: 23, question: 'Is there anything that makes the symptoms better or worse?', field: 'symptomTriggers', category: 'symptoms', required: false, type: 'textarea', order: 23 },
        
        // Lifestyle (24-27)
        { id: 24, question: 'What is your current occupation?', field: 'occupation', category: 'lifestyle', required: false, type: 'text', order: 24 },
        { id: 25, question: 'Do you smoke, drink alcohol, or use recreational drugs?', field: 'lifestyle', category: 'lifestyle', required: false, type: 'textarea', order: 25 },
        { id: 26, question: 'How often do you exercise, and what does your diet typically consist of?', field: 'exerciseAndDiet', category: 'lifestyle', required: false, type: 'textarea', order: 26 },
        { id: 27, question: 'Do you live alone, with family, or in another arrangement?', field: 'livingArrangement', category: 'lifestyle', required: false, type: 'text', order: 27 },
        
        // Review of Systems (28-33)
        { id: 28, question: 'Have you experienced any weight loss, fever, or fatigue recently?', field: 'recentHealthChanges', category: 'ros', required: false, type: 'textarea', order: 28 },
        { id: 29, question: 'Any history of chest pain, palpitations, or swelling in the legs?', field: 'cardiovascularHistory', category: 'ros', required: false, type: 'textarea', order: 29 },
        { id: 30, question: 'Any cough, shortness of breath, or wheezing?', field: 'respiratoryHistory', category: 'ros', required: false, type: 'textarea', order: 30 },
        { id: 31, question: 'Any nausea, vomiting, diarrhea, or constipation?', field: 'gastrointestinalHistory', category: 'ros', required: false, type: 'textarea', order: 31 },
        { id: 32, question: 'Any joint pain, muscle aches, or weakness?', field: 'musculoskeletalHistory', category: 'ros', required: false, type: 'textarea', order: 32 },
        { id: 33, question: 'Any headaches, dizziness, or numbness?', field: 'neurologicalHistory', category: 'ros', required: false, type: 'textarea', order: 33 },
      ],
      requiredFields: ['fullName', 'dateOfBirth', 'phoneNumber', 'medications', 'allergies', 'visitReason', 'symptomDescription', 'symptomDuration', 'symptomSeverity'],
    },
    {
      name: 'SOAP Note',
      slug: 'soap-note',
      description: 'Standard SOAP format: Subjective, Objective, Assessment, Plan',
      category: 'soap',
      active: true,
      systemPrompt: 'Generate a detailed SOAP note from the patient visit transcription.',
      sections: [
        { name: 'Subjective', prompt: 'Patient-reported symptoms, history, and reason for visit. Include chief complaint, HPI, PMH, medications, allergies.', fields: ['chiefComplaint', 'HPI', 'PMH', 'Allergy'], required: true, order: 1 },
        { name: 'Objective', prompt: 'Vital signs, physical examination findings, and lab results.', fields: ['physicalExamination', 'ROS'], required: true, order: 2 },
        { name: 'Assessment', prompt: 'Diagnosis, differential diagnoses, and clinical impression. Include ICD-10 codes.', fields: ['Assessment', 'dxCodes', 'icdCodes'], required: true, order: 3 },
        { name: 'Plan', prompt: 'Treatment plan, medications ordered, follow-up instructions, and referrals. Include CPT codes.', fields: ['Plan', 'med', 'cptCodes', 'Rationale'], required: true, order: 4 },
      ],
      requiredFields: ['chiefComplaint', 'Assessment', 'Plan'],
    },
    {
      name: 'Progress Note',
      slug: 'progress-note',
      description: 'Brief progress note for follow-up visits',
      category: 'progress',
      active: true,
      systemPrompt: 'Generate a concise progress note from the follow-up visit transcription. Focus on changes since last visit.',
      sections: [
        { name: 'Subjective', prompt: 'Interval history, changes in symptoms, new complaints since last visit.', fields: ['chiefComplaint', 'HPI'], required: true, order: 1 },
        { name: 'Objective', prompt: 'Updated vitals and focused physical exam findings.', fields: ['physicalExamination'], required: true, order: 2 },
        { name: 'Assessment', prompt: 'Progress assessment and any changes to diagnosis.', fields: ['Assessment'], required: true, order: 3 },
        { name: 'Plan', prompt: 'Updated treatment plan, medication changes, next visit schedule.', fields: ['Plan', 'med'], required: true, order: 4 },
      ],
      requiredFields: ['chiefComplaint', 'Assessment'],
    },
    {
      name: 'Follow-Up Note',
      slug: 'follow-up-note',
      description: 'Brief follow-up note for established patients',
      category: 'followup',
      active: true,
      systemPrompt: 'Generate a brief follow-up note. Focus on treatment response and any changes since last visit.',
      sections: [
        { name: 'Interval History', prompt: 'Changes since last visit, treatment response, new concerns.', fields: ['chiefComplaint', 'HPI'], required: true, order: 1 },
        { name: 'Exam', prompt: 'Focused physical exam findings.', fields: ['physicalExamination'], required: false, order: 2 },
        { name: 'Plan', prompt: 'Continue/modify treatment plan, follow-up schedule.', fields: ['Plan'], required: true, order: 3 },
      ],
      requiredFields: ['chiefComplaint', 'Plan'],
    },
    {
      name: 'Personal Injury Initial Consult',
      slug: 'pi-initial-consult',
      description: 'Specialized SOAP format for MVAs, slip-and-falls, and personal injury. Captures Mechanism of Injury (MOI), functional limitations (ADLs), causation, and Medical Decision Making (MDM).',
      category: 'soap',
      active: true,
      systemPrompt: `Generate a highly detailed SOAP note from the patient visit transcription, specifically tailored for a personal injury or auto accident initial consultation. You must explicitly extract and detail the Date of Injury (DOI), the exact Mechanism of Injury (MOI), and how the injury impacts the patient's Activities of Daily Living (ADLs). Ensure there is a clear medical causation statement linking the diagnosis to the accident. Finally, you must explicitly extract the Medical Decision Making (MDM) / Medical Rationale justifying why any proposed treatments, medications, advanced imaging, or specialist referrals are medically necessary at this time.`,
      sections: [
        { name: 'Subjective', prompt: 'Patient-reported symptoms, history, and reason for visit. MUST INCLUDE: Date of Injury (DOI), detailed Mechanism of Injury (MOI - e.g., vehicle speed, point of impact, seatbelt usage, or fall mechanics), Impact on Activities of Daily Living (ADLs), chief complaint, HPI, PMH, medications, and allergies.', fields: ['chiefComplaint','Subjective_MOI','Subjective_DOI','Subjective_ADL','HPI','PMH','Allergy'], required: true, order: 1 },
        { name: 'Objective', prompt: 'Vital signs, physical examination findings, and lab/imaging results. MUST INCLUDE: Quantified Range of Motion (ROM) measurements, specific Orthopedic tests, and Neurological findings (reflexes, dermatomes, myotomes).', fields: ['physicalExamination','ROM','OrthopedicTests','NeurologicalFindings','ROS'], required: true, order: 2 },
        { name: 'Assessment', prompt: 'Diagnosis, differential diagnoses, and clinical impression. MUST INCLUDE: A medical causation statement affirming the link between the documented injuries and the specific accident/event. Include ICD-10 codes.', fields: ['Assessment','dxCodes','icdCodes','Assessment_Causation'], required: true, order: 3 },
        { name: 'Plan', prompt: 'Treatment plan, medications ordered, follow-up instructions, and referrals. MUST INCLUDE: Current work status (e.g., total temporary disability, light duty restrictions) and CPT codes.', fields: ['Plan','med','cptCodes','WorkStatus'], required: true, order: 4 },
        { name: 'Medical Decision Making (MDM)', prompt: 'Clinical reasoning and medical rationale for the proposed treatment plan. Detail why conservative measures are insufficient (if applicable) and explicitly state the medical necessity for any advanced imaging (MRI/CT), specialist referrals, or prolonged therapy.', fields: ['MDM','Medical_Decision_Making','Rationale','Imaging_Necessity'], required: true, order: 5 },
      ],
      requiredFields: ['chiefComplaint','Subjective_MOI','Assessment_Causation','Plan','Medical_Decision_Making'],
      questions: [
        { id: 100, question: 'Is this visit related to a specific accident or injury? (If yes, state Date of Injury)', field: 'accidentRelated', category: 'pi', required: true, type: 'textarea', order: 100 },
        { id: 101, question: 'What is the patient\'s current work status / disability limitation?', field: 'workStatus', category: 'pi', required: true, type: 'textarea', order: 101 },
        { id: 102, question: 'What is the specific medical rationale justifying today\'s ordered therapies, imaging, or referrals?', field: 'mdrRationale', category: 'pi', required: true, type: 'textarea', order: 102 },
      ],
    },
    {
      name: 'Personal Injury Follow Up',
      slug: 'pi-follow-up',
      description: 'Follow-up SOAP for PI cases. Tracks treatment response, functional gains, and ongoing medical necessity.',
      category: 'soap',
      active: true,
      systemPrompt: `Generate a personal injury follow-up SOAP note. Focus on: (1) Treatment response since last visit, (2) Changes in Activities of Daily Living (ADLs), (3) Updated work status / disability status, (4) Continued medical necessity for ongoing treatment, (5) Any new symptoms or injuries since the accident. Maintain clear causation linkage to the original accident.`,
      sections: [
        { name: 'Subjective', prompt: 'Interval history since last visit. MUST INCLUDE: Changes in pain levels, improvements or worsening in ADLs, any new symptoms, current work status, and medication changes.', fields: ['chiefComplaint','Subjective_MOI','Subjective_ADL','HPI'], required: true, order: 1 },
        { name: 'Objective', prompt: 'Updated physical exam. MUST INCLUDE: Re-measured ROM, repeat orthopedic tests, updated neurological findings, comparison to previous visit if available.', fields: ['physicalExamination','ROM','OrthopedicTests','NeurologicalFindings'], required: true, order: 2 },
        { name: 'Assessment', prompt: 'Updated diagnosis and clinical impression. MUST INCLUDE: Progress assessment, whether injuries are resolving or chronic, and continued causation statement linking current condition to the accident.', fields: ['Assessment','dxCodes','icdCodes','Assessment_Causation'], required: true, order: 3 },
        { name: 'Plan', prompt: 'Updated treatment plan. MUST INCLUDE: Changes to treatment protocol, continued therapy frequency/duration justification, any new referrals or imaging, work status recommendations, and CPT codes.', fields: ['Plan','med','cptCodes','WorkStatus'], required: true, order: 4 },
        { name: 'Medical Decision Making (MDM)', prompt: 'Medical rationale for continued treatment. Explicitly state why continued care is medically necessary, what functional goals remain unmet, and why discharge or reduction would be premature.', fields: ['MDM','Medical_Decision_Making','Rationale','FunctionalGoals'], required: true, order: 5 },
      ],
      requiredFields: ['chiefComplaint','Subjective_MOI','Assessment_Causation','Plan','Medical_Decision_Making'],
      questions: [
        { id: 200, question: 'How has your pain/function changed since last visit? (Better, worse, or same?)', field: 'treatmentResponse', category: 'pi', required: true, type: 'textarea', order: 200 },
        { id: 201, question: 'What is your current work status?', field: 'currentWorkStatus', category: 'pi', required: true, type: 'textarea', order: 201 },
        { id: 202, question: 'What activities of daily living are still affected?', field: 'remainingADL', category: 'pi', required: true, type: 'textarea', order: 202 },
      ],
    },
  ];

  await NoteType.insertMany(defaults);
  console.log(`Seeded ${defaults.length} default note types`);
};

// ===== CRUD =====
const getNoteTypes = asyncHandler(async (req, res) => {
  const noteTypes = await NoteType.find().sort({ category: 1, name: 1 });
  res.json({ response: true, noteTypes });
});

const getNoteType = asyncHandler(async (req, res) => {
  const noteType = await NoteType.findById(req.query.id);
  if (!noteType) return res.status(404).json({ response: false, msg: 'Not found' });
  res.json({ response: true, noteType });
});

const createNoteType = asyncHandler(async (req, res) => {
  const { name, slug, description, category, systemPrompt, sections, questions, templateText, requiredFields } = req.body;
  
  const existing = await NoteType.findOne({ slug });
  if (existing) return res.status(400).json({ response: false, msg: 'Note type with this slug already exists' });

  const noteType = new NoteType({
    name, slug, description, category: category || 'custom',
    systemPrompt, sections, questions, templateText, requiredFields,
  });
  await noteType.save();
  res.json({ response: true, noteType });
});

const updateNoteType = asyncHandler(async (req, res) => {
  const { id } = req.query;
  const updates = req.body;
  updates.version = await NoteType.findById(id).then(nt => (nt?.version || 0) + 1);
  
  const noteType = await NoteType.findByIdAndUpdate(id, updates, { new: true });
  if (!noteType) return res.status(404).json({ response: false, msg: 'Not found' });
  res.json({ response: true, noteType });
});

const deleteNoteType = asyncHandler(async (req, res) => {
  await NoteType.findByIdAndDelete(req.query.id);
  res.json({ response: true, msg: 'Deleted' });
});

// ===== Get Questions for a Note Type (used by the AI pipeline) =====
const getQuestionsForIntake = asyncHandler(async (req, res) => {
  const noteType = await NoteType.findOne({ slug: req.query.slug || 'new-patient-intake' });
  if (!noteType) return res.status(404).json({ response: false, msg: 'Note type not found' });
  res.json({ response: true, questions: noteType.questions, systemPrompt: noteType.systemPrompt });
});

module.exports = {
  seedDefaultNoteTypes,
  getNoteTypes,
  getNoteType,
  createNoteType,
  updateNoteType,
  deleteNoteType,
  getQuestionsForIntake,
};
