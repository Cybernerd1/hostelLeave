/**
 * Header Component
 *
 * Top bar with hamburger toggle, page title, notification bell, and user dropdown.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, getRoleConfig, getRoleLabel } from '@/utils/roleConfig';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const config = getRoleConfig(user.role);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setIsDropdownOpen(false);
    navigate(`${config.basePath}/profile`);
  };

  return (
    <header className="header">
      {/* Left: hamburger + page title */}
      <div className="header__left">
        <button
          className="header__menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Right: notifications + user */}
      <div className="header__right">
        {/* Notification bell */}
        <button
          className="header__icon-btn"
          onClick={() => navigate(`${config.basePath}/notifications`)}
          aria-label="View notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User dropdown */}
        <div className="header__user-menu" ref={dropdownRef}>
          <button
            className="header__user-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="header__avatar" style={{ backgroundColor: config.accent }}>
              {getInitials(user.name)}
            </div>
            <div className="header__user-info">
              <span className="header__user-name">{user.name}</span>
              <span className="header__user-role">{getRoleLabel(user.role)}</span>
            </div>
            <svg
              className={`header__chevron ${isDropdownOpen ? 'header__chevron--open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="header__dropdown animate-fade-in-up">
              <div className="header__dropdown-header">
                <span className="header__dropdown-name">{user.name}</span>
                <span className="header__dropdown-email">{user.email}</span>
              </div>
              <div className="header__dropdown-divider" />
              <button className="header__dropdown-item" onClick={handleProfile}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              <button className="header__dropdown-item header__dropdown-item--danger" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
