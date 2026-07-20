'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthCard from '@/components/AuthCard';
import Dashboard from '@/components/Dashboard';
import TargetModal from '@/components/TargetModal';

export default function MainClient() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetToEdit, setTargetToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (authToken) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Invalid session');
      const data = await res.json();
      setUser(data.user);
      return true;
    } catch (err) {
      localStorage.removeItem('keepalive_token');
      setToken(null);
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('keepalive_token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('keepalive_token');
    setToken(null);
    setUser(null);
  };

  const handleSaveTarget = async (targetData) => {
    const isEdit = Boolean(targetData.id);
    const url = isEdit ? `/api/services/${targetData.id}` : '/api/services';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(targetData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save target endpoint');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--neon-cyan)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-dot" style={{ width: '20px', height: '20px', margin: '0 auto 1rem auto' }}></div>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: '600' }}>Initializing Sentinel Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />

      {!user ? (
        <AuthCard onAuthSuccess={handleAuthSuccess} />
      ) : (
        <Dashboard
          token={token}
          user={user}
          onOpenModal={() => { setTargetToEdit(null); setIsModalOpen(true); }}
          onEditTarget={(target) => { setTargetToEdit(target); setIsModalOpen(true); }}
        />
      )}

      <TargetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTarget}
        targetToEdit={targetToEdit}
      />
    </>
  );
}
