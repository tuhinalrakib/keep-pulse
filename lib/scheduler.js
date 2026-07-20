import cron from 'node-cron';
import { pingAllActiveTargets } from '@/lib/pinger';

let isRunning = false;
let cronTask = null;

export function startScheduler() {
  if (isRunning) return;

  console.log('[SCHEDULER] Starting Keep-Alive Bot Cron Scheduler...');
  isRunning = true;

  setTimeout(() => {
    pingAllActiveTargets().catch(err => {
      console.error('[SCHEDULER] Error in initial ping run:', err);
    });
  }, 5000);

  cronTask = cron.schedule('*/5 * * * *', async () => {
    console.log(`[SCHEDULER] Cron tick triggered at ${new Date().toISOString()}`);
    try {
      await pingAllActiveTargets();

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
