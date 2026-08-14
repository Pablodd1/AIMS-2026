const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");
const Patient = require("../../models/Patients");

// Quick check-in endpoint: just needs pId + userTimezone
// Sets checkInTime to now and checkOutTime to '' (empty)
const checkIn = asyncHandler(async (req, res) => {
    try {
        const { pId, userTimezone } = req.body;

        if (!pId) {
            return res.status(400).json({
                response: false,
                msg: "Missing required field: pId"
            });
        }

        // Get current time in user's timezone
        const tz = userTimezone || "UTC";
        let now;
        try {
            now = new Date().toLocaleString("en-US", { timeZone: tz });
        } catch (e) {
            now = new Date().toString();
        }
        const currentDate = now.split(",")[0].trim();  // e.g. "6/19/2026"
        const currentTime = now.split(",")[1]?.trim() || new Date().toLocaleTimeString();  // e.g. "2:45:00 PM"

        const docId = req.user;
        const note = await CheckNotes.create({
            docId,
            pId,
            checkInTime: currentTime,
            checkOutTime: '',  // not yet checked out
            checkInDate: currentDate,
            userTimezone: tz,
        });

        // Count the visit: a check-in IS a visit (kiosk path counts via appointment Complete; web path counts here)
        await Patient.updateOne({ _id: pId }, { $inc: { visitCount: 1 } });

        return res.status(201).json({
            response: true,
            msg: "Patient checked in",
            note,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            response: false,
            msg: "An error occurred while checking in the patient.",
        });
    }
});

module.exports = { checkIn };
