'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

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
        Swal.fire({
          icon: 'success',
          title: 'Ping Triggered',
          text: 'Target endpoint pinged successfully!',
          background: '#0e1626',
          color: '#f8fafc',
          confirmButtonColor: '#00f2fe',
          iconColor: '#10b981'
        });
        await fetchTargets();
        await fetchLogs();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Ping Failed',
          text: data.error || 'Failed to ping target endpoint',
          background: '#0e1626',
          color: '#f8fafc',
          confirmButtonColor: '#00f2fe',
          iconColor: '#f43f5e'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: err.message,
        background: '#0e1626',
        color: '#f8fafc',
        confirmButtonColor: '#00f2fe',
        iconColor: '#f43f5e'
      });
    } finally {
      setPingingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteTarget = async (id) => {
    const result = await Swal.fire({
      title: 'Remove Target Service?',
      text: 'Are you sure you want to stop monitoring this target endpoint?',
      icon: 'warning',
      showCancelButton: true,
      background: '#0e1626',
      color: '#f8fafc',
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Yes, Delete Service',
      cancelButtonText: 'Cancel',
      iconColor: '#f59e0b'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Service Deleted',
          text: 'Target endpoint removed successfully.',
          background: '#0e1626',
          color: '#f8fafc',
          confirmButtonColor: '#00f2fe',
          iconColor: '#10b981'
        });
        await fetchTargets();
        await fetchLogs();
      } else {
        const data = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: data.error || 'Failed to delete service target',
          background: '#0e1626',
          color: '#f8fafc',
          confirmButtonColor: '#00f2fe',
          iconColor: '#f43f5e'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message,
        background: '#0e1626',
        color: '#f8fafc',
        confirmButtonColor: '#00f2fe',
        iconColor: '#f43f5e'
      });
    }
  };

  const getPlatformIcon = (type) => {
    if (type === 'render') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      );
    } else if (type === 'supabase') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M13.35 2.5C13.67 2.5 13.9 2.8 13.78 3.09L10.75 10.5H18.5C18.96 10.5 19.22 11.02 18.93 11.38L9.93 22.38C9.62 22.76 9.01 22.5 9.09 22.02L11.5 13.5H4C3.51 13.5 3.25 12.93 3.56 12.56L12.56 2.69C12.76 2.57 13.06 2.5 13.35 2.5Z" fill="#3ECF8E"/>
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}>
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    }
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
          <div style={{ gridColumn: '1 / -1', padding: '3rem 1rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-light)' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Monitored Services</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Click "Add Monitored Service" to start keeping your Render & Supabase apps awake.</p>
          </div>
        ) : (
          targets.map(target => (
            <div key={target.id || target._id} className="target-card">
              <div>
                <div className="target-card-header">
                  <div className="target-identity">
                    <span className={`type-pill type-${target.type}`}>
                      {getPlatformIcon(target.type)}
                      {target.type.toUpperCase()}
                    </span>
                  </div>
                  <span className={`status-badge ${target.lastStatus === 'success' ? 'status-success' : target.lastStatus === 'error' ? 'status-error' : 'status-pending'}`}>
                    {target.lastStatus === 'success' ? '🟢 Online' : target.lastStatus === 'error' ? '🔴 Error' : '🟡 Pending'}
                  </span>
                </div>

                <div className="target-name" style={{ marginTop: '0.8rem' }}>{target.name}</div>
                <div className="target-url-box">{target.url}</div>

                <div className="target-meta-grid">
                  <div className="meta-col">
                    <span className="lbl">Latency</span>
                    <span className="val">{target.lastResponseTimeMs ? `${target.lastResponseTimeMs}ms` : '--'}</span>
                  </div>
                  <div className="meta-col">
                    <span className="lbl">Interval</span>
                    <span className="val">Every {target.intervalMinutes}m</span>
                  </div>
                  <div className="meta-col">
                    <span className="lbl">HTTP Code</span>
                    <span className="val font-mono">{target.lastStatusCode || '--'}</span>
                  </div>
                </div>
              </div>

              <div className="target-actions">
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleManualPing(target.id || target._id)}
                  disabled={pingingMap[target.id || target._id]}
                >
                  {pingingMap[target.id || target._id] ? 'Pinging...' : '⚡ Ping Now'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onEditTarget(target)}>✏️ Edit</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => handleDeleteTarget(target.id || target._id)}>🗑️ Delete</button>
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
                    <td>
                      <span className={`type-pill type-${log.type}`}>
                        {getPlatformIcon(log.type)}
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${log.status === 'success' ? 'status-success' : 'status-error'}`}>
                        HTTP {log.statusCode || 0}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.responseTimeMs ? `${log.responseTimeMs}ms` : '--'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
