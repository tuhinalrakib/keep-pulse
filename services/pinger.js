const { Target, Log } = require('../config/db');

/**
 * Ping a specific target (Render, Supabase, or Custom HTTP URL)
 * @param {Object} target Mongoose Target document
 * @returns {Promise<Object>} Ping execution result
 */
async function pingTarget(target) {
  const startTime = Date.now();
  let url = target.url.trim();

  // Normalize URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const headers = {
    'User-Agent': 'RenderSupabaseKeepAliveBot/1.0 (Automated Uptime Monitor)'
  };

  // Format Supabase REST API URL & authentication headers
  if (target.type === 'supabase') {
    let baseUrl = url.replace(/\/+$/, '');
    if (!baseUrl.endsWith('/rest/v1')) {
      baseUrl = `${baseUrl}/rest/v1/`;
    }
    url = baseUrl;

    if (target.apiKey) {
      headers['apikey'] = target.apiKey.trim();
      headers['Authorization'] = `Bearer ${target.apiKey.trim()}`;
    }
  }

  let statusCode = null;
  let status = 'error';
  let message = '';

  try {
    const controller = new AbortController();
    // Render free tier cold starts can take 20-40 seconds to spin up, so use 45s timeout
    const pingTimeoutMs = target.type === 'render' ? 45000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), pingTimeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    statusCode = response.status;
    const responseTimeMs = Date.now() - startTime;

    // HTTP 200-499 are considered active server responses (cold start awake)
    if (response.status >= 200 && response.status < 500) {
      status = 'success';
      message = `Server responded with HTTP ${statusCode} (${responseTimeMs}ms)`;
    } else {
      status = 'error';
      message = `HTTP ${statusCode} ${response.statusText}`;
    }

    const targetId = target._id || target.id;
    const lastPingAt = new Date();

    // Update target record in MongoDB
    await Target.findByIdAndUpdate(targetId, {
      lastPingAt,
      lastStatus: status,
      lastStatusCode: statusCode,
      lastResponseTimeMs: responseTimeMs
    });

    // Create Log entry in MongoDB
    await Log.create({
      targetId: targetId,
      userId: target.userId,
      targetName: target.name,
      type: target.type,
      statusCode: statusCode,
      status: status,
      responseTimeMs: responseTimeMs,
      message: message,
      timestamp: lastPingAt
    });

    return { success: status === 'success', statusCode, responseTimeMs, message };

  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    let errMessage = err.message;
    if (err.name === 'AbortError') {
      const timeoutSec = target.type === 'render' ? 45 : 30;
      errMessage = `Request Timed Out (${timeoutSec}s)`;
    }

    const targetId = target._id || target.id;
    const lastPingAt = new Date();

    // Update target error record in MongoDB
    await Target.findByIdAndUpdate(targetId, {
      lastPingAt,
      lastStatus: 'error',
      lastStatusCode: 0,
      lastResponseTimeMs: responseTimeMs
    });

    // Create Error Log in MongoDB
    await Log.create({
      targetId: targetId,
      userId: target.userId,
      targetName: target.name,
      type: target.type,
      statusCode: 0,
      status: 'error',
      responseTimeMs: responseTimeMs,
      message: `Failed to ping: ${errMessage}`,
      timestamp: lastPingAt
    });

    return { success: false, statusCode: 0, responseTimeMs, message: errMessage };
  }
}

/**
 * Ping all active targets due for pinging
 */
async function pingAllActiveTargets() {
  try {
    const activeTargets = await Target.find({ isActive: true });
    const now = Date.now();
    const results = [];

    for (const target of activeTargets) {
      const intervalMs = (target.intervalMinutes || 60) * 60 * 1000;
      const lastPingTime = target.lastPingAt ? new Date(target.lastPingAt).getTime() : 0;

      // Ping if due (or never pinged)
      if (!target.lastPingAt || (now - lastPingTime) >= (intervalMs - 60000)) {
        console.log(`[PINGER] Triggering scheduled ping for "${target.name}" (${target.type}) -> ${target.url}`);
        const res = await pingTarget(target);
        results.push({ targetId: target._id, name: target.name, ...res });
      }
    }

    return results;
  } catch (err) {
    console.error('[PINGER] Error in pingAllActiveTargets:', err.message);
    return [];
  }
}

module.exports = {
  pingTarget,
  pingAllActiveTargets
};
