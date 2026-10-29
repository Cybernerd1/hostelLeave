/**
 * Dashboard Layout
 *
 * Shared layout with sidebar, header, and main content area.
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import './DashboardLayout.css';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('hostel-portal-sidebar-collapsed') === 'true');

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem('hostel-portal-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--sidebar-collapsed' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="dashboard-layout__main">
        <div className="dashboard-layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
