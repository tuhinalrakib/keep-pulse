'use client';

import { useState, useEffect } from 'react';

export default function Dashboard({ token, user, onOpenModal, onEditTarget }) {
  const [targets, setTargets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logTargetFilter, setLogTargetFilter] = useState('');
  const [pingingMap, setPingingMap] = useState({});

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setTargets(data.targets || []);
    } catch (err) {
      console.error('Fetch targets error:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchLogs();

    const timer = setInterval(() => {
      fetchTargets();
      fetchLogs();
    }, 15000);

    return () => clearInterval(timer);
  }, [token]);

  const handleManualPing = async (id) => {
    setPingingMap(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/services/${id}/ping`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTargets();
        await fetchLogs();
      }
    } catch (err) {
      console.error('Manual ping error:', err);
    } finally {
      setPingingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm('Are you sure you want to delete this target service?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTargets();
        await fetchLogs();
      }
    } catch (err) {
      console.error('Delete target error:', err);
    }
  };

  const copyHealthUrl = () => {
    const healthUrl = `${window.location.origin}/api/health`;
    navigator.clipboard.writeText(healthUrl);
    alert(`Copied Health Check URL to clipboard:\n${healthUrl}`);
  };

  // Metrics computation
  const activeTargetsCount = targets.filter(t => t.isActive).length;
  const activePercent = targets.length > 0 ? Math.round((activeTargetsCount / targets.length) * 100) : 100;
  const recentSuccessLogs = logs.filter(l => l.status === 'success');
  const avgLatency = recentSuccessLogs.length > 0
    ? Math.round(recentSuccessLogs.reduce((acc, l) => acc + (l.responseTimeMs || 0), 0) / recentSuccessLogs.length)
    : 0;

  // Filter logs
  const filteredLogs = logs.filter(l => {
    const searchMatch = !logSearch || 
      (l.targetName && l.targetName.toLowerCase().includes(logSearch.toLowerCase())) ||
      (l.message && l.message.toLowerCase().includes(logSearch.toLowerCase())) ||
      (l.status && l.status.toLowerCase().includes(logSearch.toLowerCase()));
    
    const targetMatch = !logTargetFilter || (l.targetId === logTargetFilter || l.targetId?._id === logTargetFilter);
    return searchMatch && targetMatch;
  });

  return (
    <main>
      {/* Hero Stat Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-cyan">
          <div className="stat-header">
            <span className="stat-title">Monitored Services</span>
            <div className="stat-icon-badge">🎯</div>
          </div>
          <div className="stat-value">{targets.length}</div>
          <div className="stat-footer">{activeTargetsCount} active sentinel targets</div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-header">
            <span className="stat-title">System Health Rate</span>
            <div className="stat-icon-badge">⚡</div>
          </div>
          <div className="stat-value">{activePercent}%</div>
          <div className="stat-footer">Keep-alive heartbeat active</div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-header">
            <span className="stat-title">Avg Latency</span>
            <div className="stat-icon-badge">⏱️</div>
          </div>
          <div className="stat-value">{avgLatency} ms</div>
          <div className="stat-footer">Average response cold start</div>
        </div>

        <div className="stat-card stat-amber">
          <div className="stat-header">
            <span className="stat-title">Total Pings</span>
            <div className="stat-icon-badge">🛡️</div>
          </div>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-footer">Telemetry logs recorded</div>
        </div>
      </div>

      {/* Target Services Section */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Keep-Alive Targets</h2>
          <p className="section-subtitle">Render apps, Supabase APIs and endpoints automatically pinged on interval</p>
        </div>
        <button className="btn btn-primary" onClick={onOpenModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Monitored Service
        </button>
      </div>

      {/* Targets Grid */}
      <div className="targets-grid">
        {targets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textContent: 'center', padding: '3rem 1rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Monitored Services</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Click "Add Monitored Service" to start keeping your Render & Supabase apps awake.</p>
          </div>
        ) : (
          targets.map(target => (
            <div key={target.id || target._id} className="target-card">
              <div>
                <div className="target-card-header">
                  <div className="target-identity">
                    <div className={`target-icon ${target.type}-icon`}>
                      {target.type === 'render' ? '⚡' : target.type === 'supabase' ? '⚡' : '🌐'}
                    </div>
                    <div className="target-title-box">
                      <h3>{target.name}</h3>
                      <span className={`target-type-tag ${target.type}-tag`}>
                        {target.type}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${target.lastStatus === 'success' ? 'badge-success' : target.lastStatus === 'error' ? 'badge-error' : 'badge-pending'}`}>
                    {target.lastStatus || 'pending'}
                  </span>
                </div>

                <span className="target-url">{target.url}</span>

                <div className="target-metrics">
                  <div className="metric-item">
                    <span className="metric-label">Interval</span>
                    <span className="metric-val">{target.intervalMinutes}m</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Latency</span>
                    <span className="metric-val">{target.lastResponseTimeMs ? `${target.lastResponseTimeMs}ms` : '--'}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">HTTP Code</span>
                    <span className="metric-val">{target.lastStatusCode || '--'}</span>
                  </div>
                </div>
              </div>

              <div className="target-card-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleManualPing(target.id || target._id)}
                  disabled={pingingMap[target.id || target._id]}
                >
                  {pingingMap[target.id || target._id] ? 'Pinging...' : '⚡ Ping Now'}
                </button>

                <div className="card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => onEditTarget(target)}>Edit</button>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => handleDeleteTarget(target.id || target._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ping Logs Feed Section */}
      <div className="logs-card">
        <div className="logs-header">
          <div>
            <h2 className="section-title">Telemetry & Activity Stream</h2>
            <p className="section-subtitle">Real-time keep-alive response times, HTTP statuses and status codes</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchTargets(); fetchLogs(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh Feed
          </button>
        </div>

        <div className="logs-controls">
          <div className="input-with-icon" style={{ maxWidth: '320px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Search target name, status..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ maxWidth: '220px' }}
            value={logTargetFilter}
            onChange={(e) => setLogTargetFilter(e.target.value)}
          >
            <option value="">All Monitored Targets</option>
            {targets.map(t => (
              <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="logs-table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Service Name</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Response Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-subtle)' }}>
                    No telemetry logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id || log._id}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})</td>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{log.targetName}</td>
                    <td><span className={`target-type-tag ${log.type}-tag`}>{log.type}</span></td>
                    <td>
                      <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                        {log.status} ({log.statusCode})
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.responseTimeMs} ms</td>
                    <td>{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Self Ping Protection Card */}
      <div className="self-ping-card">
        <div className="self-ping-glow"></div>
        <div className="self-ping-icon">🛡️</div>
        <div className="self-ping-content">
          <h3>Self-Sustaining Bot Protection</h3>
          <p>Prevent this KeepPulse instance from idling on Render Free Tier. Attach your health check endpoint to an external monitoring tool or set <code className="code-badge">BOT_SELF_URL</code> in environment variables.</p>
        </div>
        <button className="btn btn-cyan btn-sm" onClick={copyHealthUrl}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Health URL
        </button>
      </div>
    </main>
  );
}
