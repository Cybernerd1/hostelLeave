/**
 * Home Page — Role Selector
 *
 * Beautiful landing page where users select their role before logging in.
 * Each role card navigates to /login?role=<role> with demo credentials shown.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

interface RoleCard {
  role: string;
  label: string;
  description: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: 'student',
    label: 'Student',
    description: 'Apply for leave, track approvals & download leave pass',
    accent: '#6366f1',
    gradientFrom: '#4f46e5',
    gradientTo: '#7c3aed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    role: 'parent',
    label: 'Parent',
    description: 'Review and approve your ward\'s leave requests',
    accent: '#8b5cf6',
    gradientFrom: '#7c3aed',
    gradientTo: '#a855f7',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    role: 'warden',
    label: 'Warden',
    description: 'Manage hostel leave approvals and student records',
    accent: '#0ea5e9',
    gradientFrom: '#0284c7',
    gradientTo: '#0ea5e9',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    role: 'chief_warden',
    label: 'Chief Warden',
    description: 'Oversee all hostels and approve escalated leaves',
    accent: '#0891b2',
    gradientFrom: '#0e7490',
    gradientTo: '#0891b2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    role: 'hod',
    label: 'HOD',
    description: 'Head of Department — approve departmental leaves',
    accent: '#059669',
    gradientFrom: '#047857',
    gradientTo: '#059669',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    role: 'vice_chancellor',
    label: 'Vice Chancellor',
    description: 'University-wide leave oversight and reports',
    accent: '#d97706',
    gradientFrom: '#b45309',
    gradientTo: '#d97706',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    role: 'guard',
    label: 'Gate Guard',
    description: 'Scan QR codes and manage gate entry/exit logs',
    accent: '#dc2626',
    gradientFrom: '#b91c1c',
    gradientTo: '#dc2626',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    role: 'admin',
    label: 'Administrator',
    description: 'Full system control — users, hostels, reports & more',
    accent: '#4f46e5',
    gradientFrom: '#3730a3',
    gradientTo: '#4f46e5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
];

export function HomePage() {
  const navigate = useNavigate();

  const handleRoleSelect = (role: string) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="home-page">
      {/* Animated background orbs */}
      <div className="home-page__bg">
        <div className="home-page__orb home-page__orb--1" />
        <div className="home-page__orb home-page__orb--2" />
        <div className="home-page__orb home-page__orb--3" />
      </div>

      <div className="home-page__content">
        {/* Header */}
        <header className="home-page__header">
          <div className="home-page__logo-wrap">
            <svg className="home-page__logo-icon" width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#logoGrad)" />
              <path d="M8 22V12L16 7L24 12V22L16 27L8 22Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M16 17V27M8 12L16 17L24 12" stroke="white" strokeWidth="1.5" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="home-page__logo-text">HostelLeave</span>
          </div>

          <h1 className="home-page__title">
            Welcome to <span className="home-page__title-highlight">HostelLeave</span>
          </h1>
          <p className="home-page__subtitle">
            Streamlined leave management for modern institutions.
            <br />
            Select your role below to sign in.
          </p>
        </header>

        {/* Role Cards Grid */}
        <div className="home-page__grid" role="list">
          {ROLE_CARDS.map((card) => (
            <button
              key={card.role}
              id={`role-card-${card.role}`}
              className="home-page__card"
              onClick={() => handleRoleSelect(card.role)}
              role="listitem"
              aria-label={`Login as ${card.label}`}
              style={{
                '--card-accent': card.accent,
                '--card-grad-from': card.gradientFrom,
                '--card-grad-to': card.gradientTo,
              } as React.CSSProperties}
            >
              <div className="home-page__card-glow" />
              <div className="home-page__card-icon">{card.icon}</div>
              <div className="home-page__card-body">
                <h3 className="home-page__card-title">{card.label}</h3>
                <p className="home-page__card-desc">{card.description}</p>
              </div>
              <div className="home-page__card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <footer className="home-page__footer">
          <p>© {new Date().getFullYear()} HostelLeave Management System · All rights reserved</p>
        </footer>
      </div>
    </div>
  );
}
