const navItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Trends', icon: 'trending_up' },
  { label: 'Momentum', icon: 'speed' },
  { label: 'Forecast', icon: 'query_stats' },
  { label: 'Papers', icon: 'description' },
  { label: 'Gaps', icon: 'travel_explore' },
]

export default function Sidebar({ activePage, onNavigate, onNewAnalysis, collapsed, user, demo = false }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-initial" aria-hidden="true">P</span>
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
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            onClick={() => onNavigate(item.label)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-button" type="button" title={collapsed ? 'New Analysis' : undefined} aria-label={collapsed ? 'New Analysis' : undefined} onClick={onNewAnalysis}>
          <span className="material-symbols-outlined">add</span>
          <span className="button-label">New Analysis</span>
        </button>

        <div className="sidebar-footer-links">
          <button className="sidebar-footer-link" type="button" title={collapsed ? 'Settings' : undefined} aria-label={collapsed ? 'Settings' : undefined} onClick={() => onNavigate('Settings')}>
            <span className="material-symbols-outlined">settings</span>
            <span className="button-label">Settings</span>
          </button>
          <button className="sidebar-footer-link" type="button" title={collapsed ? 'Support' : undefined} aria-label={collapsed ? 'Support' : undefined} onClick={() => onNavigate('Support')}>
            <span className="material-symbols-outlined">help_outline</span>
            <span className="button-label">Support</span>
          </button>
        </div>

        <div className="profile-card">
          <span className="profile-initial" aria-hidden="true">{user?.email?.[0]?.toUpperCase() ?? 'P'}</span>
          <div className="profile-meta">
            <span className="name">{user?.email ?? (demo ? 'Example preview' : 'PaperMind')}</span>
            <span className="role">{demo ? 'Read-only example' : 'Research workspace'}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
