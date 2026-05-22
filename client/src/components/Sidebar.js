import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: 'fa-solid fa-gauge-high', label: 'Dashboard' },
    { path: '/evidence', icon: 'fa-solid fa-file-shield', label: 'Audit Evidence', badge: null },
    { path: '/sampling', icon: 'fa-solid fa-chart-pie', label: 'Statistical Sampling', badge: null },
    { path: '/workpapers', icon: 'fa-solid fa-file-lines', label: 'Workpapers', badge: null },
    { path: '/findings', icon: 'fa-solid fa-magnifying-glass-chart', label: 'Audit Findings', badge: null },
    { path: '/checklists', icon: 'fa-solid fa-clipboard-check', label: 'Compliance Checklists', badge: null },
    { path: '/evidence-adequacy', icon: 'fa-solid fa-bullseye', label: 'Evidence Adequacy', section: 'ai' },
    { path: '/materiality', icon: 'fa-solid fa-calculator', label: 'Materiality Calc', section: 'ai' },
    { path: '/risk-heat-map', icon: 'fa-solid fa-fire', label: 'Risk Heat Map', section: 'ai' },
    { path: '/workpaper-templates', icon: 'fa-solid fa-folder-tree', label: 'Workpaper Templates', section: 'ai' },
    { path: '/advanced-ai-tools', icon: 'fa-solid fa-wand-magic-sparkles', label: 'Advanced AI Tools', section: 'ai' },
    { path: '/extensions', icon: 'fa-solid fa-puzzle-piece', label: 'Extensions (GL/Risk/ERP)', section: 'ai' },
    { path: '/pbc-aging-risk', icon: 'fa-solid fa-hourglass-half', label: 'PBC Aging Risk', section: 'ai' },
    { path: '/ai-history', icon: 'fa-solid fa-clock-rotate-left', label: 'AI History', section: 'ai' },
    { path: '/audit-trail', icon: 'fa-solid fa-clock-rotate-left', label: 'Audit Trail', badge: null, section: 'tools' },
    { path: '/reports', icon: 'fa-solid fa-chart-bar', label: 'Reports & Analytics', badge: null, section: 'tools' },
    { path: '/users', icon: 'fa-solid fa-users-gear', label: 'User Management', badge: null, section: 'tools' },
  ];

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h2>AuditPro AI</h2>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Main Menu</div>
        {navItems.slice(0, 1).map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon}></i>
            {item.label}
          </div>
        ))}

        <div className="nav-section-title">Audit Modules</div>
        {navItems.filter(item => !item.section && item.path !== '/').map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon}></i>
            {item.label}
          </div>
        ))}

        <div className="nav-section-title">AI-Powered Tools</div>
        {navItems.filter(item => item.section === 'ai').map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon}></i>
            {item.label}
          </div>
        ))}

        <div className="nav-section-title">Tools & Admin</div>
        {navItems.filter(item => item.section === 'tools').map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon}></i>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <i className="fa-solid fa-right-from-bracket"></i>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
