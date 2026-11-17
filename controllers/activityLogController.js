const asyncHandler = require('express-async-handler');
const ActivityLog = require('../models/ActivityLog');

const ALLOWED = ['voice', 'mouse', 'text', 'navigation', 'login', 'logout', 'other'];

// POST /api/post/activityLog  { events: [{actionType, detail, path}] }
const logActivity = asyncHandler(async (req, res) => {
  const events = Array.isArray(req.body && req.body.events) ? req.body.events.slice(0, 50) : [];
  if (!events.length) return res.json({ response: true, inserted: 0 });
  const rows = events
    .filter((e) => e && ALLOWED.includes(e.actionType))
    .map((e) => ({
      user: String(req.user),
      actionType: e.actionType,
      detail: String(e.detail || '').slice(0, 200),
      path: String(e.path || '').slice(0, 150),
    }));
  if (!rows.length) return res.json({ response: true, inserted: 0 });
  const out = await ActivityLog.insertMany(rows, { ordered: false }).catch(() => null);
  return res.json({ response: true, inserted: out ? out.length : 0 });
});

// GET /api/get/activityLogs?limit=200&user=<id> — admin sees all, others only their own
const getActivityLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const Doctor = require('../models/Doctor');
  const Assistant = require('../models/Assistant');
  const User = require('../models/User');
  const caller = await User.findById(req.user).select('admin').lean().catch(() => null);
  const isAdmin = !!(caller && caller.admin);
  const scope = isAdmin ? {} : { user: String(req.user) };
  if (req.query.user) scope.user = String(req.query.user);
  const logs = await ActivityLog.find(scope).sort({ createdAt: -1 }).limit(limit).lean();
  const ids = [...new Set(logs.map((l) => l.user).filter(Boolean))];
  const names = {};
  for (const id of ids.slice(0, 100)) {
    const d = (await Doctor.findById(id).select('username first_name last_name').lean().catch(() => null))
      || (await Assistant.findById(id).select('username first_name last_name').lean().catch(() => null))
      || (await User.findById(id).select('first_name last_name').lean().catch(() => null));
    if (d) names[id] = d.username || [d.first_name, d.last_name].filter(Boolean).join(' ') || id;
  }
  return res.json({ response: true, count: logs.length, isAdmin, logs: logs.map((l) => ({ ...l, userName: names[l.user] || l.user })) });
});

module.exports = { logActivity, getActivityLogs };
