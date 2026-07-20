import { connectDB, Target, Log } from '@/lib/db';

export async function pingTarget(target) {
  await connectDB();
  const startTime = Date.now();
  let url = target.url.trim();

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 KeepPulseBot/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

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
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response = await fetch(url, {
      method: 'GET',
      headers: headers,
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    // Render Free Tier Cold-Start Retry (502 / 503 / 504)
    // If Render app is waking up from sleep, wait 3 seconds and retry once
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      await new Promise(res => setTimeout(res, 3000));
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
      try {
        const retryResponse = await fetch(url, {
          method: 'GET',
          headers: headers,
          signal: retryController.signal,
          redirect: 'follow'
        });
        clearTimeout(retryTimeoutId);
        response = retryResponse;
      } catch (retryErr) {
        clearTimeout(retryTimeoutId);
      }
    }

    statusCode = response.status;
    const responseTimeMs = Date.now() - startTime;

    if (response.status >= 200 && response.status < 500) {
      status = 'success';
      message = `Server responded with HTTP ${statusCode} (${responseTimeMs}ms)`;
    } else {
      status = 'error';
      if (statusCode === 502) {
        message = `HTTP 502 Bad Gateway (Target app on Render is offline, crashing, or failing health check)`;
      } else {
        message = `HTTP ${statusCode} ${response.statusText || 'Bad Gateway / Error'}`;
      }
    }

    const targetId = target._id || target.id;
    const lastPingAt = new Date();

    await Target.findByIdAndUpdate(targetId, {
      lastPingAt,
      lastStatus: status,
      lastStatusCode: statusCode,
      lastResponseTimeMs: responseTimeMs
    });

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
      errMessage = 'Request Timed Out (15s)';
    }

    const targetId = target._id || target.id;
    const lastPingAt = new Date();

    await Target.findByIdAndUpdate(targetId, {
      lastPingAt,
      lastStatus: 'error',
      lastStatusCode: 0,
      lastResponseTimeMs: responseTimeMs
    });

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

export async function pingAllActiveTargets() {
  try {
    await connectDB();
    const activeTargets = await Target.find({ isActive: true });
    const now = Date.now();
    const results = [];

    for (const target of activeTargets) {
      const intervalMs = (target.intervalMinutes || 60) * 60 * 1000;
      const lastPingTime = target.lastPingAt ? new Date(target.lastPingAt).getTime() : 0;

      if (!target.lastPingAt || (now - lastPingTime) >= (intervalMs - 60000)) {
        console.log(`[PINGER] Triggering ping for "${target.name}" (${target.type}) -> ${target.url}`);
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
