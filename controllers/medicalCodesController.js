const asyncHandler = require('express-async-handler');
const MedicalCode = require('../models/MedicalCode');
const FavoriteCode = require('../models/FavoriteCode');

// ===== Seed Medical Codes on First Run =====
const seedMedicalCodes = async () => {
  const count = await MedicalCode.countDocuments();
  if (count > 0) {
    console.log(`Medical codes already seeded (${count} found). Skipping.`);
    return;
  }

  const icd10Codes = [
    { code: 'M99.01', description: 'Somatic dysfunction of cervical region', category: 'Somatic Dysfunction' },
    { code: 'M99.02', description: 'Somatic dysfunction of thoracic region', category: 'Somatic Dysfunction' },
    { code: 'M99.03', description: 'Somatic dysfunction of lumbar region', category: 'Somatic Dysfunction' },
    { code: 'M99.04', description: 'Somatic dysfunction of sacral region', category: 'Somatic Dysfunction' },
    { code: 'M99.05', description: 'Somatic dysfunction of pelvic region', category: 'Somatic Dysfunction' },
    { code: 'M99.06', description: 'Somatic dysfunction of lower extremity', category: 'Somatic Dysfunction' },
    { code: 'M99.07', description: 'Somatic dysfunction of upper extremity', category: 'Somatic Dysfunction' },
    { code: 'M99.08', description: 'Somatic dysfunction of rib cage', category: 'Somatic Dysfunction' },
    { code: 'M99.00', description: 'Somatic dysfunction of head region', category: 'Somatic Dysfunction' },
    { code: 'M54.5', description: 'Low back pain', category: 'Back Pain' },
    { code: 'M54.2', description: 'Cervicalgia (neck pain)', category: 'Back Pain' },
    { code: 'M54.6', description: 'Pain in thoracic spine', category: 'Back Pain' },
    { code: 'M54.4', description: 'Lumbago with sciatica', category: 'Back Pain' },
    { code: 'M54.3', description: 'Sciatica', category: 'Back Pain' },
    { code: 'M25.50', description: 'Pain in unspecified joint', category: 'Joint Pain' },
    { code: 'M25.51', description: 'Pain in shoulder', category: 'Joint Pain' },
    { code: 'M25.52', description: 'Pain in elbow', category: 'Joint Pain' },
    { code: 'M25.53', description: 'Pain in wrist', category: 'Joint Pain' },
    { code: 'M25.54', description: 'Pain in hip', category: 'Joint Pain' },
    { code: 'M25.55', description: 'Pain in knee', category: 'Joint Pain' },
    { code: 'S13.4XXA', description: 'Sprain of cervical spine, initial encounter', category: 'Sprain/Strain' },
    { code: 'S33.5XXA', description: 'Sprain of lumbar spine, initial encounter', category: 'Sprain/Strain' },
    { code: 'G44.209', description: 'Tension-type headache, unspecified', category: 'Headache' },
    { code: 'G43.909', description: 'Migraine, unspecified, not intractable', category: 'Headache' },
    { code: 'R51', description: 'Headache', category: 'Headache' },
    { code: 'M54.10', description: 'Radiculopathy, site unspecified', category: 'Neuropathy' },
    { code: 'M54.12', description: 'Radiculopathy, cervical region', category: 'Neuropathy' },
    { code: 'M54.16', description: 'Radiculopathy, lumbar region', category: 'Neuropathy' },
    { code: 'M47.812', description: 'Spondylosis without myelopathy or radiculopathy, cervical region', category: 'Spondylosis' },
    { code: 'M47.816', description: 'Spondylosis without myelopathy or radiculopathy, lumbar', category: 'Spondylosis' },
    { code: 'M51.26', description: 'Other intervertebral disc displacement, lumbar region', category: 'Disc Disorders' },
    { code: 'M51.36', description: 'Other intervertebral disc degeneration, lumbar region', category: 'Disc Disorders' },
    { code: 'M79.1', description: 'Myalgia (muscle pain)', category: 'Soft Tissue' },
    { code: 'M79.2', description: 'Neuralgia and neuritis, unspecified', category: 'Soft Tissue' },
    { code: 'M79.7', description: 'Fibromyalgia', category: 'Soft Tissue' },
    { code: 'M62.830', description: 'Muscle spasm of trunk', category: 'Soft Tissue' },
    { code: 'M62.831', description: 'Muscle spasm of neck', category: 'Soft Tissue' },
  ];

  const cptCodes = [
    { code: '98940', description: 'Chiropractic manipulative treatment, spinal, 1-2 regions', category: 'CMT', rvu: 0.75 },
    { code: '98941', description: 'Chiropractic manipulative treatment, spinal, 3-4 regions', category: 'CMT', rvu: 0.92 },
    { code: '98942', description: 'Chiropractic manipulative treatment, spinal, 5 regions', category: 'CMT', rvu: 1.08 },
    { code: '98943', description: 'Chiropractic manipulative treatment, extraspinal, 1+ regions', category: 'CMT', rvu: 0.68 },
    { code: '97110', description: 'Therapeutic exercise to develop strength/endurance/ROM (15 min)', category: 'Therapeutic', rvu: 0.55 },
    { code: '97112', description: 'Neuromuscular reeducation (15 min)', category: 'Therapeutic', rvu: 0.62 },
    { code: '97140', description: 'Manual therapy techniques (15 min)', category: 'Therapeutic', rvu: 0.60 },
    { code: '97014', description: 'Electrical stimulation (unattended)', category: 'Modality', rvu: 0.15 },
    { code: '97035', description: 'Ultrasound therapy', category: 'Modality', rvu: 0.18 },
    { code: '97010', description: 'Hot or cold packs therapy', category: 'Modality', rvu: 0.10 },
    { code: '97124', description: 'Massage therapy (15 min)', category: 'Therapeutic', rvu: 0.45 },
    { code: '99203', description: 'Office/outpatient visit new patient, 30 min', category: 'E/M', rvu: 1.42 },
    { code: '99213', description: 'Office/outpatient visit established patient, 15 min', category: 'E/M', rvu: 1.30 },
    { code: '99214', description: 'Office/outpatient visit established patient, 25 min', category: 'E/M', rvu: 1.85 },
    { code: '72040', description: 'Radiologic exam cervical spine, 2-3 views', category: 'X-Ray', rvu: 0.55 },
    { code: '72100', description: 'Radiologic exam lumbar spine, 2-3 views', category: 'X-Ray', rvu: 0.58 },
  ];

  try {
    for (const c of icd10Codes) {
      await MedicalCode.findOneAndUpdate(
        { type: 'icd10', code: c.code },
        { ...c, type: 'icd10', isCustom: false },
        { upsert: true, new: true }
      );
    }
    for (const c of cptCodes) {
      await MedicalCode.findOneAndUpdate(
        { type: 'cpt', code: c.code },
        { ...c, type: 'cpt', isCustom: false },
        { upsert: true, new: true }
      );
    }
    const total = await MedicalCode.countDocuments();
    console.log(`Seeded ${icd10Codes.length} ICD-10 + ${cptCodes.length} CPT codes (${total} total)`);
  } catch (err) {
    console.error('Seed medical codes error:', err);
  }
};

// Search medical codes (ICD-10 or CPT)
const searchMedicalCodes = asyncHandler(async (req, res) => {
  try {
    const { query, type, category, page = 1, limit = 50 } = req.body;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;

    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { code: searchRegex },
        { description: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const codes = await MedicalCode.find(filter)
      .sort({ type: 1, code: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MedicalCode.countDocuments(filter);

    return res.json({
      response: true,
      codes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Search medical codes error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Get unique categories for filter dropdown
const getCodeCategories = asyncHandler(async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {};
    if (type) filter.type = type;

    const categories = await MedicalCode.distinct('category', filter);
    return res.json({ response: true, categories: categories.sort() });
  } catch (error) {
    console.error('Get code categories error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Add custom medical code
const addCustomCode = asyncHandler(async (req, res) => {
  try {
    const { type, code, description, category, modifier, rvu } = req.body;
    const docId = req.user?._id || req.body.docId;

    if (!type || !code || !description) {
      return res.status(400).json({ response: false, msg: 'Type, code, and description are required' });
    }

    if (!['icd10', 'cpt'].includes(type)) {
      return res.status(400).json({ response: false, msg: 'Type must be icd10 or cpt' });
    }

    // Check for duplicate
    const existing = await MedicalCode.findOne({ type, code });
    if (existing) {
      return res.status(409).json({ response: false, msg: 'Code already exists', code: existing });
    }

    const newCode = await MedicalCode.create({
      type,
      code: code.toUpperCase(),
      description,
      category: category || 'Custom',
      modifier: modifier || null,
      rvu: rvu || null,
      isCustom: true,
      docId,
    });

    return res.status(201).json({ response: true, msg: 'Code added', code: newCode });
  } catch (error) {
    console.error('Add custom code error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Update custom code (only own codes)
const updateCustomCode = asyncHandler(async (req, res) => {
  try {
    const { _id, description, category, modifier, rvu } = req.body;
    const docId = req.user?._id;

    const code = await MedicalCode.findById(_id);
    if (!code) {
      return res.status(404).json({ response: false, msg: 'Code not found' });
    }
    if (code.isCustom && code.docId && code.docId !== docId) {
      return res.status(403).json({ response: false, msg: 'Not authorized to edit this code' });
    }
    // Only custom codes can be edited
    if (!code.isCustom) {
      return res.status(403).json({ response: false, msg: 'Cannot edit system codes' });
    }

    if (description) code.description = description;
    if (category) code.category = category;
    if (modifier !== undefined) code.modifier = modifier;
    if (rvu !== undefined) code.rvu = rvu;
    await code.save();

    return res.json({ response: true, msg: 'Code updated', code });
  } catch (error) {
    console.error('Update custom code error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Favorites
const addFavoriteCode = asyncHandler(async (req, res) => {
  try {
    const { codeId, type } = req.body;
    const docId = req.user?._id || req.body.docId;

    if (!codeId || !type) {
      return res.status(400).json({ response: false, msg: 'codeId and type are required' });
    }

    // Check if code exists
    const code = await MedicalCode.findById(codeId);
    if (!code) {
      return res.status(404).json({ response: false, msg: 'Code not found' });
    }

    // Check if already favorited
    const existing = await FavoriteCode.findOne({ docId, codeId });
    if (existing) {
      return res.json({ response: true, msg: 'Already in favorites' });
    }

    await FavoriteCode.create({ docId, codeId, type });
    return res.json({ response: true, msg: 'Added to favorites' });
  } catch (error) {
    console.error('Add favorite code error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

const removeFavoriteCode = asyncHandler(async (req, res) => {
  try {
    const { codeId } = req.body;
    const docId = req.user?._id || req.body.docId;

    await FavoriteCode.findOneAndDelete({ docId, codeId });
    return res.json({ response: true, msg: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite code error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

const getFavoriteCodes = asyncHandler(async (req, res) => {
  try {
    const docId = req.user?._id || req.query.docId;
    const type = req.query.type;

    const filter = { docId };
    if (type) filter.type = type;

    const favorites = await FavoriteCode.find(filter).populate('codeId').lean();

    const codes = favorites
      .filter(f => f.codeId) // only those with valid code refs
      .map(f => ({
        _id: f.codeId._id,
        type: f.codeId.type,
        code: f.codeId.code,
        description: f.codeId.description,
        category: f.codeId.category,
        modifier: f.codeId.modifier,
        rvu: f.codeId.rvu,
        favoriteId: f._id,
      }));

    return res.json({ response: true, codes });
  } catch (error) {
    console.error('Get favorite codes error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Get commonly used / recent codes (from invoices/notes)
const getRecentCodes = asyncHandler(async (req, res) => {
  try {
    const docId = req.user?._id || req.query.docId;
    const type = req.query.type;

    // Return frequently favorited codes across the clinic
    const filter = {};
    if (type) filter.type = type;

    const codes = await MedicalCode.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({ response: true, codes });
  } catch (error) {
    console.error('Get recent codes error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

// Billing compliance check
const runBillingCompliance = asyncHandler(async (req, res) => {
  try {
    const { dxCodes, cptCodes, notes } = req.body;
    const issues = [];

    // Basic compliance rules for chiropractic billing
    if (dxCodes && dxCodes.length > 0 && cptCodes && cptCodes.length > 0) {
      // Check: CMT requires a diagnosis of spinal/somatic dysfunction
      const hasCMT = cptCodes.some(c => ['98940', '98941', '98942', '98943'].includes(c.code));
      const hasSomaticDx = dxCodes.some(c => c.code.startsWith('M99.'));

      if (hasCMT && !hasSomaticDx) {
        issues.push({
          severity: 'warning',
          category: 'code_mismatch',
          message: 'CMT codes (98940-98943) should be paired with a somatic dysfunction diagnosis (M99.0x).',
          recommendation: 'Add a diagnosis code from the M99.0x range (somatic dysfunction).',
        });
      }

      // Check: E/M codes shouldn't be billed same day as CMT without modifier 25
      const hasEM = cptCodes.some(c => c.code.startsWith('992'));
      if (hasEM && hasCMT) {
        issues.push({
          severity: 'caution',
          category: 'modifier_needed',
          message: 'E/M and CMT on same day requires modifier 25 on the E/M code.',
          recommendation: 'Add modifier 25 to the E/M code or verify medical necessity.',
        });
      }

      // Check: Therapeutic exercise requires compatible dx
      const hasTherEx = cptCodes.some(c => c.code === '97110');
      if (hasTherEx) {
        const hasMusculoskeletalDx = dxCodes.some(c =>
          c.code.startsWith('M') || c.code.startsWith('S')
        );
        if (!hasMusculoskeletalDx) {
          issues.push({
            severity: 'warning',
            category: 'dx_incompatible',
            message: 'Therapeutic exercise (97110) requires a musculoskeletal diagnosis.',
            recommendation: 'Ensure primary diagnosis is an M-code or S-code.',
          });
        }
      }

      // Check: Ultrasound requires compatible dx
      const hasUS = cptCodes.some(c => c.code === '97035');
      if (hasUS) {
        const hasPainDx = dxCodes.some(c =>
          c.code.startsWith('M') || c.code.startsWith('S') || c.code.startsWith('G')
        );
        if (!hasPainDx) {
          issues.push({
            severity: 'caution',
            category: 'dx_incompatible',
            message: 'Ultrasound (97035) typically requires pain/injury diagnosis.',
            recommendation: 'Ensure diagnosis supports therapeutic ultrasound.',
          });
        }
      }
    }

    // Check for missing primary diagnosis
    if (dxCodes && dxCodes.length > 0) {
      const hasPrimary = dxCodes.some(c => c.primary);
      if (!hasPrimary) {
        issues.push({
          severity: 'warning',
          category: 'missing_primary',
          message: 'No primary diagnosis code marked.',
          recommendation: 'Mark one ICD-10 code as primary.',
        });
      }
    }

    return res.json({
      response: true,
      data: {
        compliant: issues.length === 0,
        issues,
        totalChecks: 5,
        passedChecks: 5 - issues.length,
      },
    });
  } catch (error) {
    console.error('Billing compliance error:', error);
    return res.status(500).json({ response: false, msg: error.message });
  }
});

module.exports = {
  seedMedicalCodes,
  searchMedicalCodes,
  getCodeCategories,
  addCustomCode,
  updateCustomCode,
  addFavoriteCode,
  removeFavoriteCode,
  getFavoriteCodes,
  getRecentCodes,
  runBillingCompliance,
};
