/**
 * Role-aware grouped navigation sidebar.
 *
 * The navigation structure lives in roleConfig.ts; this component only
 * renders the filtered groups and manages their UI state.
 */

import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleConfig, getRoleLabel, type NavGroup } from '@/utils/roleConfig';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

const STORAGE_KEY = 'hostel-portal-sidebar-groups';

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => [item.path, ...(item.matchPaths || [])].some((path) => pathname === path || pathname.startsWith(`${path}/`)));
}

function getStoredGroups(role: string, groups: NavGroup[]): Record<string, boolean> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Record<string, boolean>>;
    const roleState = stored[role] || {};
    return Object.fromEntries(groups.map((group) => [group.id, roleState[group.id] ?? false]));
  } catch {
    return Object.fromEntries(groups.map((group) => [group.id, false]));
  }
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapsed }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role || 'student';
  const config = getRoleConfig(role);
  const groups = useMemo(() => config.navGroups, [config.navGroups]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => getStoredGroups(role, groups));

  useEffect(() => {
    setExpandedGroups(getStoredGroups(role, groups));
  }, [role, groups]);

  useEffect(() => {
    const activeGroup = groups.find((group) => groupContainsPath(group, location.pathname));
    if (!activeGroup) return;
    setExpandedGroups((current) => {
      if (current[activeGroup.id]) return current;
      const next = { ...current, [activeGroup.id]: true };
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Record<string, boolean>>;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, [role]: next }));
      } catch { /* localStorage may be unavailable */ }
      return next;
    });
  }, [groups, location.pathname, role]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = { ...current, [groupId]: !current[groupId] };
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Record<string, boolean>>;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, [role]: next }));
      } catch { /* localStorage may be unavailable */ }
      return next;
    });
  };

  const handleNavigation = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}

      {user && <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''} ${isCollapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <img src="/images/campus/akgec-logo.png" alt="AKGEC" width="32" height="32" />
          </div>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">Hostel Leave Portal</span>
            <span className="sidebar__brand-role">{getRoleLabel(user.role)}</span>
          </div>
          <button
            type="button"
            className="sidebar__collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={isCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
            </svg>
          </button>
        </div>

        <nav className="sidebar__nav" aria-label={`${getRoleLabel(user.role)} navigation`}>
          <ul className="sidebar__nav-list">
            {groups.map((group) => {
              const isExpanded = expandedGroups[group.id] ?? false;
              const isGroupActive = groupContainsPath(group, location.pathname);
              if (group.items.length === 1) {
                const item = group.items[0];
                return (
                  <li className="sidebar__group sidebar__group--single" key={group.id}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) => `sidebar__nav-link sidebar__single-link ${isActive || isGroupActive ? 'sidebar__nav-link--active' : ''}`}
                      onClick={handleNavigation}
                    >
                      <svg className="sidebar__nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={group.icon} />
                      </svg>
                      <span className="sidebar__nav-label">{group.label}</span>
                    </NavLink>
                  </li>
                );
              }
              return (
                <li className={`sidebar__group ${isGroupActive ? 'sidebar__group--active' : ''}`} key={group.id}>
                  <button
                    type="button"
                    className="sidebar__group-toggle"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`sidebar-group-${group.id}`}
                    title={isCollapsed ? group.label : undefined}
                  >
                    <svg className="sidebar__group-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={group.icon} />
                    </svg>
                    <span className="sidebar__group-label">{group.label}</span>
                    <svg className={`sidebar__group-chevron ${isExpanded ? 'sidebar__group-chevron--open' : ''}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <ul className="sidebar__subnav" id={`sidebar-group-${group.id}`}>
                      {group.items.map((item) => (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            end={item.end}
                            title={isCollapsed ? item.label : undefined}
                            className={({ isActive }) => `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`}
                            onClick={handleNavigation}
                          >
                            <svg className="sidebar__nav-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d={item.icon} />
                            </svg>
                            <span className="sidebar__nav-label">{item.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__version">v1.0.0</div>
        </div>
      </aside>}
    </>
  );
}
