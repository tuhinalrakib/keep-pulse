'use client';

export default function Navbar({ user, onLogout }) {
  return (
    <header className="app-header">
      <a href="#" className="brand">
        <div className="brand-icon-wrapper">
          <div className="brand-icon" style={{ padding: '4px' }}>
            <img src="/images/logo.svg" alt="KeepPulse Logo" width="34" height="34" />
          </div>
          <div className="icon-glow"></div>
        </div>
        <div className="brand-text">
          Keep<span>Pulse</span> <span className="badge-pro">PRO</span>
        </div>
      </a>

      {user ? (
        <>
          <div className="status-pill status-pill-active">
            <span className="pulse-dot"></span>
            <span>Systems Operational</span>
          </div>

          <div className="user-profile">
            <div className="user-info">
              <div className="user-avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </>
      ) : null}
    </header>
  );
}
