const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");
const { syncVisitCount } = require("../../Helper/visitCounter");


const addNote = asyncHandler(async (req, res) => {
    try {
        const { pId, checkInTime, checkOutTime, checkInDate, userTimezone } = req.body;

        if (!pId || !checkInTime || !checkInDate || !userTimezone) {
            return res.status(400).json({
                response: false,
                msg: "Missing required fields: pId, checkInTime, checkInDate, userTimezone"
            });
        }

        req.body['docId'] = req.user
        const note = await CheckNotes.create(req.body);
        // Auto-complete any same-day appointment: a kiosk check-in proves the visit happened
        const dayPrefix = String(checkInDate || '').slice(0, 10);
        if (dayPrefix) {
            const Appointment = require('../../models/Appointment');
            const Patient = require('../../models/Patients');
            const pat = await Patient.findById(pId).select('fullName').lean();
            const or = [{ patientID: pId }];
            if (pat && pat.fullName) or.push({ name: pat.fullName });
            await Appointment.updateMany(
                { status: { $ne: 'Complete' }, time: { $regex: '^' + dayPrefix, $options: 'i' }, $or: or },
                { $set: { status: 'Complete' } }
            );
        }
        await syncVisitCount(pId);
        return res.status(201).json({
            response: true,
            msg: "Note added",
            note: note
        });

    } catch (e) {
        console.error(e); 
        return res.status(500).json({
            response: false,
            msg: "An error occurred while adding the note."
        });
    }
});

module.exports = { addNote };


  module.exports = {
    addNote
  }