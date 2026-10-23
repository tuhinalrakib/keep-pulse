'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function TargetModal({ isOpen, onClose, onSave, targetToEdit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('render');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('5');
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
  }, [targetToEdit, isOpen]);

  if (!isOpen) return null;

  const showSwal = (title, text, icon = 'error') => {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      background: '#0e1626',
      color: '#f8fafc',
      confirmButtonColor: '#00f2fe',
      iconColor: icon === 'error' ? '#f43f5e' : '#10b981'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !url.trim()) {
      showSwal('Validation Error', 'Please fill out all required fields.', 'error');
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
      showSwal('Save Failed', err.message || 'Failed to save service target.', 'error');
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
                  <div className="type-icon render-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
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
                  <div className="type-icon supabase-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M13.35 2.5C13.67 2.5 13.9 2.8 13.78 3.09L10.75 10.5H18.5C18.96 10.5 19.22 11.02 18.93 11.38L9.93 22.38C9.62 22.76 9.01 22.5 9.09 22.02L11.5 13.5H4C3.51 13.5 3.25 12.93 3.56 12.56L12.56 2.69C12.76 2.57 13.06 2.5 13.35 2.5Z" fill="#3ECF8E"/>
                    </svg>
                  </div>
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
                  <div className="type-icon custom-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
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
