const express = require('express');
const router = express.Router();
const { Log, Target } = require('../config/db');
const { verifyJwt } = require('../middleware/auth');

// Protect log routes
router.use(verifyJwt);


// Helper to format log for client
function formatLog(l) {
  const obj = l.toObject ? l.toObject() : l;
  return { ...obj, id: obj._id };
}

// GET /api/logs - List recent logs for logged-in user
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const targetIdFilter = req.query.targetId;

    let filter = { userId: req.userId };
    if (targetIdFilter) {
      filter.targetId = targetIdFilter;
    }

    const logs = await Log.find(filter).sort({ timestamp: -1 }).limit(limit);
    res.json({ logs: logs.map(formatLog) });
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /api/logs/target/:targetId - Get logs for a specific target service
router.get('/target/:targetId', async (req, res) => {
  try {
    const target = await Target.findOne({ _id: req.params.targetId, userId: req.userId });
    if (!target) {
      return res.status(404).json({ error: 'Target service not found' });
    }

    const limit = parseInt(req.query.limit, 10) || 30;
    const logs = await Log.find({ targetId: req.params.targetId, userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ targetName: target.name, logs: logs.map(formatLog) });
  } catch (err) {
    console.error('Fetch target logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve target logs' });
  }
});

module.exports = router;
