'use client';

import { useState, useEffect } from 'react';

export default function TargetModal({ isOpen, onClose, onSave, targetToEdit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('render');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('5');
  const [modalAlert, setModalAlert] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (targetToEdit) {
      setName(targetToEdit.name || '');
      setType(targetToEdit.type || 'render');
      setUrl(targetToEdit.url || '');
      setApiKey(targetToEdit.apiKey || '');
      setIntervalMinutes(targetToEdit.intervalMinutes ? String(targetToEdit.intervalMinutes) : '5');
    } else {
      setName('');
      setType('render');
      setUrl('');
      setApiKey('');
      setIntervalMinutes('5');
    }
    setModalAlert('');
  }, [targetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalAlert('');

    if (!name.trim() || !url.trim()) {
      setModalAlert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: targetToEdit?.id || targetToEdit?._id,
        name: name.trim(),
        type,
        url: url.trim(),
        apiKey: apiKey.trim(),
        intervalMinutes: parseInt(intervalMinutes, 10) || 60
      });
      onClose();
    } catch (err) {
      setModalAlert(err.message || 'Failed to save service target.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {targetToEdit ? 'Edit Target Endpoint' : 'Add Monitored Service'}
            </h3>
            <p className="modal-subtitle">Set up automated ping checks to keep service awake</p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {modalAlert ? (
          <div className="alert alert-error">{modalAlert}</div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="targetName">Service Name</label>
            <input
              type="text"
              id="targetName"
              className="form-input"
              placeholder="e.g. Core API Service or Supabase Auth DB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Platform / Service Type</label>
            <div className="type-selector-grid">
              <label className="type-option">
                <input
                  type="radio"
                  name="targetTypeRadio"
                  value="render"
                  checked={type === 'render'}
                  onChange={() => setType('render')}
                />
                <div className="type-card">
                  <div className="type-icon render-icon">⚡</div>
                  <div className="type-info">
                    <span className="type-title">Render App</span>
                    <span className="type-desc">Web App / API</span>
                  </div>
                </div>
              </label>

              <label className="type-option">
                <input
                  type="radio"
                  name="targetTypeRadio"
                  value="supabase"
                  checked={type === 'supabase'}
                  onChange={() => setType('supabase')}
                />
                <div className="type-card">
                  <div className="type-icon supabase-icon">⚡</div>
                  <div className="type-info">
                    <span className="type-title">Supabase</span>
                    <span className="type-desc">REST / Database</span>
                  </div>
                </div>
              </label>

              <label className="type-option">
                <input
                  type="radio"
                  name="targetTypeRadio"
                  value="custom"
                  checked={type === 'custom'}
                  onChange={() => setType('custom')}
                />
                <div className="type-card">
                  <div className="type-icon custom-icon">🌐</div>
                  <div className="type-info">
                    <span className="type-title">Custom HTTP</span>
                    <span className="type-desc">Generic URL</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="targetUrl">Target HTTPS URL</label>
            <input
              type="url"
              id="targetUrl"
              className="form-input"
              placeholder="https://my-service.onrender.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <div className="form-help">
              {type === 'supabase'
                ? 'Enter your Supabase Project Reference URL (e.g. https://xyz.supabase.co)'
                : 'Enter full HTTPS URL of your Render service or HTTP endpoint.'}
            </div>
          </div>

          {type === 'supabase' ? (
            <div className="form-group">
              <label htmlFor="targetApiKey">Supabase Anon / Public API Key</label>
              <input
                type="text"
                id="targetApiKey"
                className="form-input font-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="form-help">Found in Supabase Dashboard → Settings → API → anon public key.</div>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="targetInterval">Ping Interval</label>
            <select
              id="targetInterval"
              className="form-select"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
            >
              <option value="5">Every 5 minutes (Recommended for Render Free Tier)</option>
              <option value="10">Every 10 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 60 minutes (Recommended for Supabase DB)</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Start Sentinel'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
