import React from 'react'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Trends', icon: 'trending_up' },
  { label: 'Momentum', icon: 'speed' },
  { label: 'Forecast', icon: 'query_stats' },
  { label: 'Papers', icon: 'description' },
  { label: 'Gaps', icon: 'travel_explore' },
]

export default function Sidebar({ activePage, onNavigate, onNewAnalysis }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img
          src="https://assets.paper-mind.local/logo-placeholder.png"
          alt="PaperMind logo"
          onError={(event) => {
            event.currentTarget.src = 'https://via.placeholder.com/40/2e5bff/ffffff?text=P'
          }}
        />
        <div className="sidebar-brand-title">
          <span className="name">PaperMind</span>
          <span className="subtitle">Research Terminal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`nav-link ${activePage === item.label ? 'active' : ''}`}
            onClick={() => onNavigate(item.label)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-button" type="button" onClick={onNewAnalysis}>
          <span className="material-symbols-outlined">add</span>
          New Analysis
        </button>

        <div className="sidebar-footer-links">
          <button className="sidebar-footer-link" type="button" onClick={() => onNavigate('Settings')}>
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
          <button className="sidebar-footer-link" type="button" onClick={() => onNavigate('Support')}>
            <span className="material-symbols-outlined">help_outline</span>
            Support
          </button>
        </div>

        <div className="profile-card">
          <img
            className="profile-avatar"
            src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80"
            alt="User portrait"
          />
          <div className="profile-meta">
            <span className="name">Dr. Aris Thorne</span>
            <span className="role">Pro Access</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
