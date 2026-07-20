const cron = require('node-cron');
const pinger = require('./pinger');

let isRunning = false;
let cronTask = null;

function startScheduler() {
  if (isRunning) return;

  console.log('[SCHEDULER] Starting Keep-Alive Bot Cron Scheduler...');
  isRunning = true;

  // Run initial check 5 seconds after server startup
  setTimeout(() => {
    pinger.pingAllActiveTargets().catch(err => {
      console.error('[SCHEDULER] Error in initial ping run:', err);
    });
  }, 5000);

  // Run every 5 minutes tick to check which targets are due for pinging
  // (Render targets configured for 10/15/30/60m, Supabase targets for 60m)
  cronTask = cron.schedule('*/5 * * * *', async () => {
    console.log(`[SCHEDULER] Cron tick triggered at ${new Date().toISOString()}`);
    try {
      await pinger.pingAllActiveTargets();

      // Self-ping to keep bot server alive on Render free tier
      const selfUrl = process.env.BOT_SELF_URL || process.env.RENDER_EXTERNAL_URL;
      if (selfUrl) {
        let pingUrl = selfUrl.trim();
        if (!pingUrl.startsWith('http://') && !pingUrl.startsWith('https://')) {
          pingUrl = 'https://' + pingUrl;
        }
        if (!pingUrl.endsWith('/api/health') && !pingUrl.endsWith('/ping')) {
          pingUrl = pingUrl.replace(/\/+$/, '') + '/api/health';
        }
        console.log(`[SCHEDULER] Self-pinging bot at ${pingUrl}`);
        fetch(pingUrl, { headers: { 'User-Agent': 'KeepAliveBot-SelfPing/1.0' } }).catch(() => {});
      }
    } catch (err) {
      console.error('[SCHEDULER] Error during scheduled ping cycle:', err);
    }
  });
}

function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    isRunning = false;
    console.log('[SCHEDULER] Stopped Keep-Alive Bot Scheduler.');
  }
}

module.exports = {
  startScheduler,
  stopScheduler
};

