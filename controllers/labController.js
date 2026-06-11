const asyncHandler = require('express-async-handler');
const LabResult = require('../models/LabResult');
const Patient = require('../models/Patients');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY || 'sk-pro...1qAA',
});

// ===== AI Analysis =====
async function analyzeLabResults(results, labName) {
  try {
    const testsText = results.map(r =>
      `${r.testName}: ${r.value} ${r.unit || ''} (ref: ${r.referenceRange || 'N/A'})`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a medical laboratory interpretation assistant. Analyze the lab results and return ONLY valid JSON:
{
  "interpretation": "2-3 sentence plain-language summary of what the results mean",
  "flags": ["list of any abnormal findings"],
  "suggestions": ["list of follow-up tests or actions recommended"],
  "summary": "one-line summary for quick review"
}`
        },
        {
          role: 'user',
          content: `Lab: ${labName}\n\nResults:\n${testsText}`
        }
      ]
    });

    const content = response.choices[0].message.content
      .replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
  } catch (e) {
    console.error('AI Analysis error:', e);
    return {
      interpretation: 'AI analysis unavailable',
      flags: [],
      suggestions: [],
      summary: labName,
    };
  }
}

// ===== Create Lab Result =====
const createLabResult = asyncHandler(async (req, res) => {
  try {
    const {
      patientId, labName, labDate, results, notes, sourceType
    } = req.body;

    if (!patientId || !results || !results.length) {
      return res.status(400).json({ response: false, msg: 'Patient ID and results are required' });
    }

    // Auto-flag results
    const flaggedResults = results.map(r => {
      if (!r.flag && r.referenceRange) {
        const match = r.referenceRange.match(/[\d.]+/g);
        if (match && match.length >= 2 && parseFloat(r.value)) {
          const val = parseFloat(r.value);
          const low = parseFloat(match[0]);
          const high = parseFloat(match[1]);
          if (val < low) r.flag = 'low';
          else if (val > high) r.flag = 'high';
          else r.flag = 'normal';
        }
      }
      return r;
    });

    // Run AI analysis
    const analysis = await analyzeLabResults(flaggedResults, labName || 'Lab Report');

    const lab = new LabResult({
      patientId,
      doctorId: req.user || 'system',
      labName: labName || analysis.summary || 'Lab Report',
      labDate: labDate || new Date().toISOString().slice(0, 10),
      results: flaggedResults,
      sourceType: sourceType || 'manual',
      aiInterpretation: analysis.interpretation,
      aiSuggestions: analysis.suggestions,
      notes: notes || '',
      summary: analysis.summary || '',
    });

    await lab.save();
    res.json({ response: true, lab, flags: analysis.flags, suggestions: analysis.suggestions });
  } catch (e) {
    console.error('Create lab error:', e);
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Upload Lab File (PDF/Image) =====
const uploadLabFile = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ response: false, msg: 'No file uploaded' });
    }
    if (!req.body.patientId) {
      return res.status(400).json({ response: false, msg: 'Patient ID required' });
    }

    const mimeType = req.file.mimetype;
    const isImage = mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';
    const isCSV = mimeType === 'text/csv' || req.file.originalname.endsWith('.csv');

    let extractedText = '';
    let results = [];
    let labName = req.file.originalname.replace(/\.[^/.]+$/, '');

    if (isImage) {
      // Use GPT-4o-mini vision to extract lab values from image
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all lab test results from this image. Return ONLY valid JSON array:
[{"testName": "string", "value": "string", "unit": "string", "referenceRange": "string", "category": "string"}]
Use "category" for the panel name (e.g., "CBC", "BMP", "Lipid Panel"). If a test name is just a panel name, mark its testName as the panel and value as "PANEL".`
            },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }]
      });

      const content = response.choices[0].message.content
        .replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        results = JSON.parse(content);
      } catch {
        extractedText = content;
      }
      fs.unlinkSync(req.file.path);
    } else if (isCSV) {
      // Parse CSV
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const lines = csvData.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        results.push({
          testName: row['test name'] || row['test'] || row['name'] || '',
          value: row['value'] || row['result'] || '',
          unit: row['unit'] || '',
          referenceRange: row['reference range'] || row['range'] || row['ref'] || '',
          category: row['category'] || row['panel'] || '',
        });
      }
      fs.unlinkSync(req.file.path);
    } else {
      return res.status(400).json({ response: false, msg: 'Supported formats: PNG, JPEG, CSV' });
    }

    if (!results.length) {
      return res.status(400).json({ response: false, msg: 'Could not extract lab data from file' });
    }

    // Auto-flag and analyze
    const flaggedResults = results.map(r => {
      if (r.referenceRange) {
        const match = r.referenceRange.match(/[\d.]+/g);
        if (match && match.length >= 2 && parseFloat(r.value)) {
          const val = parseFloat(r.value);
          const low = parseFloat(match[0]);
          const high = parseFloat(match[1]);
          if (val < low) r.flag = 'low';
          else if (val > high) r.flag = 'high';
          else r.flag = 'normal';
        }
      }
      return r;
    });

    const analysis = await analyzeLabResults(flaggedResults, labName);

    const lab = new LabResult({
      patientId: req.body.patientId,
      doctorId: req.user || 'system',
      labName,
      labDate: new Date().toISOString().slice(0, 10),
      results: flaggedResults,
      sourceFile: req.file.originalname,
      sourceType: isImage ? 'image' : 'csv',
      aiInterpretation: analysis.interpretation,
      aiSuggestions: analysis.suggestions,
      summary: analysis.summary || '',
    });

    await lab.save();
    res.json({
      response: true, lab,
      flags: analysis.flags,
      suggestions: analysis.suggestions,
      interpretation: analysis.interpretation,
    });
  } catch (e) {
    console.error('Upload lab error:', e);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Get Lab Results for a Patient =====
const getLabResults = asyncHandler(async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ response: false, msg: 'Patient ID required' });
    }
    const labs = await LabResult.find({ patientId })
      .sort({ labDate: -1, createdAt: -1 });
    res.json({ response: true, labs, total: labs.length });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Get Single Lab Result =====
const getLabResultById = asyncHandler(async (req, res) => {
  try {
    const lab = await LabResult.findById(req.query.id);
    if (!lab) return res.status(404).json({ response: false, msg: 'Not found' });
    res.json({ response: true, lab });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Delete Lab Result =====
const deleteLabResult = asyncHandler(async (req, res) => {
  try {
    await LabResult.findByIdAndDelete(req.query.id);
    res.json({ response: true, msg: 'Lab result deleted' });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Export Lab Results =====
const exportLabResults = asyncHandler(async (req, res) => {
  try {
    const { patientId, format } = req.query;
    const labs = await LabResult.find({ patientId }).sort({ labDate: -1 });

    if (format === 'csv') {
      let csv = 'Date,Lab,Test,Value,Unit,Reference Range,Flag\n';
      labs.forEach(lab => {
        lab.results.forEach(r => {
          csv += `${lab.labDate},${lab.labName},${r.testName},${r.value},${r.unit || ''},${r.referenceRange || ''},${r.flag || ''}\n`;
        });
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=labs-${patientId}.csv`);
      return res.send(csv);
    }

    // Default JSON
    res.json({ response: true, labs });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});

// ===== Get Lab Trends (for charting) =====
const getLabTrends = asyncHandler(async (req, res) => {
  try {
    const { patientId, testName } = req.query;
    const labs = await LabResult.find({ patientId }).sort({ labDate: 1 });

    const trendData = {};
    labs.forEach(lab => {
      lab.results.forEach(r => {
        const name = r.testName;
        if (testName && !name.toLowerCase().includes(testName.toLowerCase())) return;
        if (!trendData[name]) trendData[name] = [];
        trendData[name].push({
          date: lab.labDate,
          value: parseFloat(r.value) || r.value,
          unit: r.unit,
          flag: r.flag,
          refRange: r.referenceRange,
        });
      });
    });

    res.json({ response: true, trends: trendData });
  } catch (e) {
    res.status(500).json({ response: false, msg: e.message });
  }
});

module.exports = {
  createLabResult,
  uploadLabFile,
  getLabResults,
  getLabResultById,
  deleteLabResult,
  exportLabResults,
  getLabTrends,
};
