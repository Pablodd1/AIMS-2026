// AMA Guides (5th/6th ed.) normal range-of-motion baselines, in degrees.
// Used by Helper/romCalculator.js to compute deficit % and format comparison tables.
const AMA_CERVICAL_ROM = {
  flexion: { normal: 50, unit: "degrees" },
  extension: { normal: 60, unit: "degrees" },
  lateralFlexionRight: { normal: 45, unit: "degrees" },
  lateralFlexionLeft: { normal: 45, unit: "degrees" },
  rotationRight: { normal: 80, unit: "degrees" },
  rotationLeft: { normal: 80, unit: "degrees" }
};

const AMA_LUMBAR_ROM = {
  flexion: { normal: 60, unit: "degrees" },
  extension: { normal: 25, unit: "degrees" },
  lateralFlexionRight: { normal: 25, unit: "degrees" },
  lateralFlexionLeft: { normal: 25, unit: "degrees" }
};

// Maps a canonical movement key to the region that contains a baseline for it.
// romCalculator uses this to look up the normal value for a measured movement.
const ROM_REGION_INDEX = {
  cervical: AMA_CERVICAL_ROM,
  lumbar: AMA_LUMBAR_ROM
};

module.exports = { AMA_CERVICAL_ROM, AMA_LUMBAR_ROM, ROM_REGION_INDEX };
