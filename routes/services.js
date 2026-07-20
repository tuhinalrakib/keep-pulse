const express = require('express');
const router = express.Router();
const { Target, Log } = require('../config/db');
const { verifyJwt } = require('../middleware/auth');
const pinger = require('../services/pinger');

// Protect target management routes
router.use(verifyJwt);


// Helper to format target for client
function formatTarget(t) {
  const obj = t.toObject ? t.toObject() : t;
  return { ...obj, id: obj._id };
}

// GET /api/services - List user's target services
router.get('/', async (req, res) => {
  try {
    const targets = await Target.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ targets: targets.map(formatTarget) });
  } catch (err) {
    console.error('Fetch targets error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/services - Add a new target service
router.post('/', async (req, res) => {
  try {
    const { name, type, url, apiKey, intervalMinutes } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const validTypes = ['render', 'supabase', 'custom'];
    const targetType = validTypes.includes(type) ? type : 'render';

    const newTarget = await Target.create({
      userId: req.userId,
      name,
      type: targetType,
      url,
      apiKey: apiKey || '',
      intervalMinutes: parseInt(intervalMinutes, 10) || 60,
      isActive: true
    });

    // Execute initial ping immediately
    try {
      await pinger.pingTarget(newTarget);
    } catch (pingErr) {
      console.error('Initial ping error:', pingErr);
    }

    const updatedTarget = await Target.findById(newTarget._id);

    res.status(201).json({
      message: 'Target service added successfully',
      target: formatTarget(updatedTarget || newTarget)
    });
  } catch (err) {
    console.error('Create target error:', err);
    res.status(500).json({ error: 'Failed to create target service' });
  }
});

// PUT /api/services/:id - Update target service settings
router.put('/:id', async (req, res) => {
  try {
    const { name, type, url, apiKey, intervalMinutes, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (url !== undefined) updates.url = url;
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (intervalMinutes !== undefined) updates.intervalMinutes = parseInt(intervalMinutes, 10) || 60;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updatedTarget = await Target.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true }
    );

    if (!updatedTarget) {
      return res.status(404).json({ error: 'Target service not found' });
    }

    res.json({ message: 'Target service updated', target: formatTarget(updatedTarget) });
  } catch (err) {
    console.error('Update target error:', err);
    res.status(500).json({ error: 'Failed to update target service' });
  }
});

// DELETE /api/services/:id - Delete a target service
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Target.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ error: 'Target service not found or not owned by user' });
    }

    // Clean up associated logs
    await Log.deleteMany({ targetId: req.params.id });

    res.json({ message: 'Target service deleted successfully' });
  } catch (err) {
    console.error('Delete target error:', err);
    res.status(500).json({ error: 'Failed to delete target service' });
  }
});

// POST /api/services/:id/ping - Manually trigger an immediate ping
router.post('/:id/ping', async (req, res) => {
  try {
    const target = await Target.findOne({ _id: req.params.id, userId: req.userId });
    if (!target) {
      return res.status(404).json({ error: 'Target service not found' });
    }

    const pingResult = await pinger.pingTarget(target);
    const updatedTarget = await Target.findById(target._id);

    res.json({
      message: 'Ping executed successfully',
      result: pingResult,
      target: formatTarget(updatedTarget)
    });
  } catch (err) {
    res.status(500).json({ error: 'Ping execution failed: ' + err.message });
  }
});

module.exports = router;
