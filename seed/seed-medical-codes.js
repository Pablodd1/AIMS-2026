/**
 * Seed common chiropractic ICD-10 and CPT codes into MongoDB.
 * Run: node seed/seed-medical-codes.js
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MedicalCode = require('../models/MedicalCode');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aims';

const icd10Codes = [
  // Somatic dysfunction
  { code: 'M99.01', description: 'Somatic dysfunction of cervical region', category: 'Somatic Dysfunction' },
  { code: 'M99.02', description: 'Somatic dysfunction of thoracic region', category: 'Somatic Dysfunction' },
  { code: 'M99.03', description: 'Somatic dysfunction of lumbar region', category: 'Somatic Dysfunction' },
  { code: 'M99.04', description: 'Somatic dysfunction of sacral region', category: 'Somatic Dysfunction' },
  { code: 'M99.05', description: 'Somatic dysfunction of pelvic region', category: 'Somatic Dysfunction' },
  { code: 'M99.06', description: 'Somatic dysfunction of lower extremity', category: 'Somatic Dysfunction' },
  { code: 'M99.07', description: 'Somatic dysfunction of upper extremity', category: 'Somatic Dysfunction' },
  { code: 'M99.08', description: 'Somatic dysfunction of rib cage', category: 'Somatic Dysfunction' },
  { code: 'M99.00', description: 'Somatic dysfunction of head region', category: 'Somatic Dysfunction' },

  // Back pain
  { code: 'M54.5', description: 'Low back pain', category: 'Back Pain' },
  { code: 'M54.2', description: 'Cervicalgia (neck pain)', category: 'Back Pain' },
  { code: 'M54.6', description: 'Pain in thoracic spine', category: 'Back Pain' },
  { code: 'M54.4', description: 'Lumbago with sciatica', category: 'Back Pain' },
  { code: 'M54.3', description: 'Sciatica', category: 'Back Pain' },
  { code: 'M54.8', description: 'Other dorsalgia', category: 'Back Pain' },
  { code: 'M54.9', description: 'Dorsalgia, unspecified', category: 'Back Pain' },

  // Joint pain
  { code: 'M25.50', description: 'Pain in unspecified joint', category: 'Joint Pain' },
  { code: 'M25.51', description: 'Pain in shoulder', category: 'Joint Pain' },
  { code: 'M25.52', description: 'Pain in elbow', category: 'Joint Pain' },
  { code: 'M25.53', description: 'Pain in wrist', category: 'Joint Pain' },
  { code: 'M25.54', description: 'Pain in hip', category: 'Joint Pain' },
  { code: 'M25.55', description: 'Pain in knee', category: 'Joint Pain' },
  { code: 'M25.56', description: 'Pain in ankle and foot', category: 'Joint Pain' },
  { code: 'M25.57', description: 'Pain in ankle and joints of foot', category: 'Joint Pain' },
  { code: 'M25.59', description: 'Pain in other specified joint', category: 'Joint Pain' },

  // Sprains and strains
  { code: 'S13.4XXA', description: 'Sprain of cervical spine, initial encounter', category: 'Sprain/Strain' },
  { code: 'S23.3XXA', description: 'Sprain of thoracic spine, initial encounter', category: 'Sprain/Strain' },
  { code: 'S33.5XXA', description: 'Sprain of lumbar spine, initial encounter', category: 'Sprain/Strain' },

  // Headaches
  { code: 'G44.209', description: 'Tension-type headache, unspecified', category: 'Headache' },
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable', category: 'Headache' },
  { code: 'G44.3', description: 'Post-traumatic headache', category: 'Headache' },
  { code: 'R51', description: 'Headache', category: 'Headache' },

  // Neuropathy / radiculopathy
  { code: 'M54.10', description: 'Radiculopathy, site unspecified', category: 'Neuropathy' },
  { code: 'M54.11', description: 'Radiculopathy, occipito-atlanto-axial region', category: 'Neuropathy' },
  { code: 'M54.12', description: 'Radiculopathy, cervical region', category: 'Neuropathy' },
  { code: 'M54.13', description: 'Radiculopathy, cervicothoracic region', category: 'Neuropathy' },
  { code: 'M54.14', description: 'Radiculopathy, thoracic region', category: 'Neuropathy' },
  { code: 'M54.15', description: 'Radiculopathy, thoracolumbar region', category: 'Neuropathy' },
  { code: 'M54.16', description: 'Radiculopathy, lumbar region', category: 'Neuropathy' },
  { code: 'M54.17', description: 'Radiculopathy, lumbosacral region', category: 'Neuropathy' },
  { code: 'M47.812', description: 'Spondylosis without myelopathy or radiculopathy, cervical region', category: 'Spondylosis' },
  { code: 'M47.813', description: 'Spondylosis without myelopathy or radiculopathy, cervicothoracic', category: 'Spondylosis' },
  { code: 'M47.816', description: 'Spondylosis without myelopathy or radiculopathy, lumbar', category: 'Spondylosis' },

  // Disc disorders
  { code: 'M51.26', description: 'Other intervertebral disc displacement, lumbar region', category: 'Disc Disorders' },
  { code: 'M51.36', description: 'Other intervertebral disc degeneration, lumbar region', category: 'Disc Disorders' },
  { code: 'M50.20', description: 'Other cervical disc displacement, unspecified', category: 'Disc Disorders' },
  { code: 'M50.30', description: 'Other cervical disc degeneration, unspecified', category: 'Disc Disorders' },

  // Myalgia / soft tissue
  { code: 'M79.1', description: 'Myalgia (muscle pain)', category: 'Soft Tissue' },
  { code: 'M79.2', description: 'Neuralgia and neuritis, unspecified', category: 'Soft Tissue' },
  { code: 'M79.7', description: 'Fibromyalgia', category: 'Soft Tissue' },
  { code: 'M62.830', description: 'Muscle spasm of trunk', category: 'Soft Tissue' },
  { code: 'M62.831', description: 'Muscle spasm of neck', category: 'Soft Tissue' },
  { code: 'M62.838', description: 'Other muscle spasm', category: 'Soft Tissue' },

  // Other common
  { code: 'R26.2', description: 'Difficulty in walking, not elsewhere classified', category: 'Other' },
  { code: 'R26.89', description: 'Other abnormalities of gait and mobility', category: 'Other' },
  { code: 'Z23', description: 'Encounter for immunization', category: 'Other' },
  { code: 'Z00.00', description: 'Encounter for general adult medical exam without abnormal findings', category: 'Other' },
];

const cptCodes = [
  // Chiropractic manipulative treatment
  { code: '98940', description: 'Chiropractic manipulative treatment, spinal, 1-2 regions', category: 'CMT', rvu: 0.75 },
  { code: '98941', description: 'Chiropractic manipulative treatment, spinal, 3-4 regions', category: 'CMT', rvu: 0.92 },
  { code: '98942', description: 'Chiropractic manipulative treatment, spinal, 5 regions', category: 'CMT', rvu: 1.08 },
  { code: '98943', description: 'Chiropractic manipulative treatment, extraspinal, 1 or more regions', category: 'CMT', rvu: 0.68 },

  // Therapeutic procedures
  { code: '97110', description: 'Therapeutic exercise to develop strength/endurance/range of motion (each 15 min)', category: 'Therapeutic', rvu: 0.55 },
  { code: '97112', description: 'Neuromuscular reeducation of movement/balance/proprioception (each 15 min)', category: 'Therapeutic', rvu: 0.62 },
  { code: '97140', description: 'Manual therapy techniques (each 15 min)', category: 'Therapeutic', rvu: 0.60 },
  { code: '97116', description: 'Gait training therapy (each 15 min)', category: 'Therapeutic', rvu: 0.58 },
  { code: '97530', description: 'Therapeutic activities to improve functional performance (each 15 min)', category: 'Therapeutic', rvu: 0.65 },

  // Modalities
  { code: '97014', description: 'Electrical stimulation (unattended)', category: 'Modality', rvu: 0.15 },
  { code: '97012', description: 'Mechanical traction', category: 'Modality', rvu: 0.20 },
  { code: '97010', description: 'Hot or cold packs therapy', category: 'Modality', rvu: 0.10 },
  { code: '97035', description: 'Ultrasound therapy', category: 'Modality', rvu: 0.18 },
  { code: '97032', description: 'Electrical stimulation manual (each 15 min)', category: 'Modality', rvu: 0.35 },
  { code: '97033', description: 'Iontophoresis (each 15 min)', category: 'Modality', rvu: 0.40 },
  { code: '97039', description: 'Unlisted modality', category: 'Modality', rvu: 0.20 },

  // Massage
  { code: '97124', description: 'Massage therapy (each 15 min)', category: 'Therapeutic', rvu: 0.45 },

  // Evaluation and management
  { code: '99201', description: 'Office/outpatient visit new patient, 10 min', category: 'E/M', rvu: 0.48 },
  { code: '99202', description: 'Office/outpatient visit new patient, 20 min', category: 'E/M', rvu: 0.93 },
  { code: '99203', description: 'Office/outpatient visit new patient, 30 min', category: 'E/M', rvu: 1.42 },
  { code: '99204', description: 'Office/outpatient visit new patient, 45 min', category: 'E/M', rvu: 2.00 },
  { code: '99205', description: 'Office/outpatient visit new patient, 60 min', category: 'E/M', rvu: 2.50 },
  { code: '99211', description: 'Office/outpatient visit established patient, 5 min', category: 'E/M', rvu: 0.25 },
  { code: '99212', description: 'Office/outpatient visit established patient, 10 min', category: 'E/M', rvu: 0.70 },
  { code: '99213', description: 'Office/outpatient visit established patient, 15 min', category: 'E/M', rvu: 1.30 },
  { code: '99214', description: 'Office/outpatient visit established patient, 25 min', category: 'E/M', rvu: 1.85 },
  { code: '99215', description: 'Office/outpatient visit established patient, 40 min', category: 'E/M', rvu: 2.50 },

  // X-ray
  { code: '72040', description: 'Radiologic exam cervical spine, 2-3 views', category: 'X-Ray', rvu: 0.55 },
  { code: '72050', description: 'Radiologic exam cervical spine, 4+ views', category: 'X-Ray', rvu: 0.72 },
  { code: '72070', description: 'Radiologic exam thoracic spine, 2 views', category: 'X-Ray', rvu: 0.52 },
  { code: '72080', description: 'Radiologic exam thoracolumbar spine, 2 views', category: 'X-Ray', rvu: 0.52 },
  { code: '72100', description: 'Radiologic exam lumbar spine, 2-3 views', category: 'X-Ray', rvu: 0.58 },
  { code: '72110', description: 'Radiologic exam lumbar spine, complete with oblique views', category: 'X-Ray', rvu: 0.78 },
  { code: '72170', description: 'Radiologic exam pelvis, 1-2 views', category: 'X-Ray', rvu: 0.48 },

  // Other
  { code: '97750', description: 'Physical performance test (each 15 min)', category: 'Testing', rvu: 0.55 },
  { code: '97799', description: 'Unlisted physical medicine/rehab service', category: 'Other', rvu: 0.30 },
  { code: 'S8948', description: 'Application of cold modality to 1+ areas', category: 'Modality', rvu: 0.12 },
  { code: 'G0283', description: 'Electrical stimulation other than wound care', category: 'Modality', rvu: 0.18 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at ${MONGO_URI}`);

    // Seed ICD-10 codes
    for (const c of icd10Codes) {
      await MedicalCode.findOneAndUpdate(
        { type: 'icd10', code: c.code },
        { ...c, type: 'icd10', isCustom: false },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${icd10Codes.length} ICD-10 codes`);

    // Seed CPT codes
    for (const c of cptCodes) {
      await MedicalCode.findOneAndUpdate(
        { type: 'cpt', code: c.code },
        { ...c, type: 'cpt', isCustom: false },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${cptCodes.length} CPT codes`);

    const count = await MedicalCode.countDocuments();
    console.log(`Total medical codes in DB: ${count}`);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

seed();
