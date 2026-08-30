/**
 * Sidebar Component
 *
 * Role-aware navigation sidebar with collapsible behavior.
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleConfig, getRoleLabel } from '@/utils/roleConfig';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  if (!user) return null;

  const config = getRoleConfig(user.role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--color-primary-600)" />
              <path
                d="M8 22V12L16 7L24 12V22L16 27L8 22Z"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
              <path d="M16 17V27M8 12L16 17L24 12" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">HostelLeave</span>
            <span className="sidebar__brand-role">{getRoleLabel(user.role)}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          <ul className="sidebar__nav-list">
            {config.navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                  }
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                >
                  <svg
                    className="sidebar__nav-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                  <span className="sidebar__nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__version">v1.0.0</div>
        </div>
      </aside>
    </>
  );
}
