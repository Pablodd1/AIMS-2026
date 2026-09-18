// Deterministic pre-billing audit for chiropractic manipulative treatment.
// Validates documented spinal regions against CPT 98940/98941/98942 definitions
// and flags missing subluxation diagnoses. Pure function — no I/O.

/**
 * Chiropractic Manipulation Code Validation:
 * CPT 98940: Spinal, 1-2 regions
 * CPT 98941: Spinal, 3-4 regions
 * CPT 98942: Spinal, 5 regions (Cervical, Thoracic, Lumbar, Sacral, Pelvic)
 * CPT 98943: Extraspinal, 1 or more regions
 */
function auditChiropracticBilling(visitData) {
  const findings = [];
  const documentedRegions = new Set();

  const textToScan = `${visitData.objective || ''} ${visitData.physicalExamination || ''} ${JSON.stringify(visitData.rangeOfMotion || '')}`.toLowerCase();

  if (textToScan.includes('cervic') || textToScan.includes('neck')) documentedRegions.add('CERVICAL');
  if (textToScan.includes('thorac') || textToScan.includes('mid back') || textToScan.includes('dorsal')) documentedRegions.add('THORACIC');
  if (textToScan.includes('lumbar') || textToScan.includes('low back')) documentedRegions.add('LUMBAR');
  if (textToScan.includes('sacr') || textToScan.includes('sacroiliac') || textToScan.includes('si joint')) documentedRegions.add('SACRAL');
  if (textToScan.includes('pelvi') || textToScan.includes('ilium') || textToScan.includes('isch')) documentedRegions.add('PELVIC');

  const cptList = (visitData.cptCodes || []).map(c => typeof c === 'string' ? c : c.code);

  if (cptList.some(code => String(code).includes('98941'))) {
    if (documentedRegions.size < 3) {
      findings.push({
        severity: 'CRITICAL',
        code: '98941',
        message: `CPT 98941 requires 3-4 documented spinal regions, but only ${documentedRegions.size} were substantiated (${Array.from(documentedRegions).join(', ') || 'none'}). Downcode to 98940 or document additional spinal regions to prevent audit clawbacks.`
      });
    }
  }

  if (cptList.some(code => String(code).includes('98942'))) {
    if (documentedRegions.size < 5) {
      findings.push({
        severity: 'CRITICAL',
        code: '98942',
        message: `CPT 98942 requires all 5 spinal regions to be documented. Only ${documentedRegions.size} found. Risk of upcoding denial.`
      });
    }
  }

  // ICD-10 Subluxation Pairing Guard
  const icdList = (visitData.icdCodes || []).map(c => typeof c === 'string' ? c : c.code);
  const hasSubluxation = icdList.some(c => String(c).startsWith('M99.0'));
  if (cptList.some(c => String(c).startsWith('9894')) && !hasSubluxation) {
    findings.push({
      severity: 'WARNING',
      code: 'M99.0X_MISSING',
      message: 'Chiropractic manipulative treatment (98940-98942) typically requires a primary biomechanical/subluxation diagnosis (M99.01-M99.05) to demonstrate medical necessity.'
    });
  }

  return {
    passed: findings.filter(f => f.severity === 'CRITICAL').length === 0,
    findings
  };
}

module.exports = { auditChiropracticBilling };
