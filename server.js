require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectDB, Target } = require('./config/db');
const { router: authRouter } = require('./routes/auth');
const servicesRouter = require('./routes/services');
const logsRouter = require('./routes/logs');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB Database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static UI dashboard
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/services', servicesRouter);
app.use('/api/logs', logsRouter);

// Health check / Keep-Alive endpoint for external pingers & self-pings
app.get(['/api/health', '/ping'], async (req, res) => {
  try {
    const activeTargetsCount = await Target.countDocuments({ isActive: true });
    res.json({
      status: 'ok',
      service: 'Render & Supabase Keep-Alive Bot PRO',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      activeTargets: activeTargetsCount
    });
  } catch (err) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server & Cron scheduler
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` KeepPulse PRO Bot Service is running on port ${PORT}`);
  console.log(` Health Check URL: http://localhost:${PORT}/api/health`);
  console.log(` Dashboard: http://localhost:${PORT}`);
  console.log(`===================================================`);

  // Start background ping scheduler
  startScheduler();
});
