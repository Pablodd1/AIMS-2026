const Visit = require('../models/Visit');
const asyncHandler = require('express-async-handler');

// Save transcription to a visit
const saveTranscription = asyncHandler(async (req, res) => {
  try {
    const { visitId, transcription, audioDuration } = req.body;
    if (!visitId || !transcription) {
      return res.status(400).json({ success: false, msg: 'Visit ID and transcription required' });
    }
    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ success: false, msg: 'Visit not found' });
    }
    visit.audioTranscription = transcription;
    if (audioDuration) visit.audioNoteDuration = audioDuration;
    await visit.save();
    res.json({ success: true, msg: 'Transcription saved' });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// Get transcription for a visit
const getTranscription = asyncHandler(async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.visitId).select('audioTranscription audioNoteDuration audioNoteUrl pId');
    if (!visit) {
      return res.status(404).json({ success: false, msg: 'Visit not found' });
    }
    res.json({ success: true, data: visit });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// Upload audio and transcribe, then save to visit
const uploadAndTranscribe = asyncHandler(async (req, res) => {
  try {
    const { visitId } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No audio file uploaded' });
    }
    if (!visitId) {
      return res.status(400).json({ success: false, msg: 'Visit ID required' });
    }

    // Reuse existing speechToText function from openaiController
    const openai = require('./openaiController');
    const fs = require('fs');
    const OpenAI = require('openai');
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_KEY });

    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
    });

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    // Save to visit
    const visit = await Visit.findById(visitId);
    if (visit) {
      visit.audioTranscription = transcription.text;
      await visit.save();
    }

    res.json({ success: true, data: transcription.text });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

module.exports = { saveTranscription, getTranscription, uploadAndTranscribe };
