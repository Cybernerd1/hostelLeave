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

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="dashboard-layout__main">
        <div className="dashboard-layout__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
