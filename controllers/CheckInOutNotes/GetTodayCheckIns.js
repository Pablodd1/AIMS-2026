const asyncHandler = require("express-async-handler");
const CheckNotes = require("../../models/CheckNotes");

// Get all check-ins for today for the logged-in doctor
const getTodayCheckIns = asyncHandler(async (req, res) => {
    try {
        const docId = req.user;
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);  // YYYY-MM-DD

        // Find check-ins for today by this doctor
        const checkIns = await CheckNotes.find({
            docId,
            $or: [
                { checkInDate: todayStr },
                { date: todayStr },
                { createdAt: { $gte: new Date(todayStr) } },
            ],
        })
        .sort({ createdAt: -1 })
        .lean();

        return res.json({ response: true, checkIns });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ response: false, msg: "Error fetching check-ins" });
    }
});

module.exports = { getTodayCheckIns };
