/**
 * App Component
 *
 * Root component wrapping the router with AuthProvider.
 * Uses BrowserRouter so AuthProvider wraps all route components.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

// Route guards
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';

// Layout
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { UserRole } from '@/utils/roleConfig';

// Auth pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

// Dashboard pages
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { ParentDashboard } from '@/pages/parent/ParentDashboard';
import { WardenDashboard } from '@/pages/warden/WardenDashboard';
import { ChiefWardenManagePage } from '@/pages/warden/ChiefWardenManagePage';
import { GuardDashboard } from '@/pages/guard/GuardDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

// Student pages
import { MyLeavesPage } from '@/pages/student/MyLeavesPage';
import { ApplyLeavePage } from '@/pages/student/ApplyLeavePage';

// Shared pages
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { ProfilePage } from '@/pages/shared/ProfilePage';
import { LeaveDetailPage } from '@/pages/shared/LeaveDetailPage';
import { PendingApprovalsPage } from '@/pages/shared/PendingApprovalsPage';
import { AllLeavesPage } from '@/pages/shared/AllLeavesPage';
import { ReportsPage } from '@/pages/shared/ReportsPage';

// Guard pages
import { QRScanPage } from '@/pages/guard/QRScanPage';
import { GateLogPage } from '@/pages/guard/GateLogPage';
import { GuardVerifyPage } from '@/pages/guard/GuardVerifyPage';

import { StudentsListPage } from '@/pages/admin/StudentsListPage';
import { StudentDetailPage } from '@/pages/admin/StudentDetailPage';
import { ParentsListPage } from '@/pages/admin/ParentsListPage';

import { DepartmentsPage } from '@/pages/admin/DepartmentsPage';
import { CoursesPage } from '@/pages/admin/CoursesPage';
import { HostelsPage } from '@/pages/admin/HostelsPage';
import { RoomsPage } from '@/pages/admin/RoomsPage';
import { StaffPage } from '@/pages/admin/StaffPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Public Routes ───────────────────────────────────────── */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ─── Standalone ──────────────────────────────────────────── */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ─── Public QR verification (no auth) ───────────────────── */}
          <Route path="/verify/:leaveId" element={<GuardVerifyPage />} />

          {/* ─── Student Routes ──────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.STUDENT]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/leaves" element={<MyLeavesPage />} />
              <Route path="/student/leaves/new" element={<ApplyLeavePage />} />
              <Route path="/student/leaves/:id" element={<LeaveDetailPage />} />
              <Route path="/student/notifications" element={<NotificationsPage />} />
              <Route path="/student/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Parent Routes ───────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.PARENT]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/parent/approvals" element={<PendingApprovalsPage />} />
              <Route path="/parent/leaves/:id" element={<LeaveDetailPage />} />
              <Route path="/parent/notifications" element={<NotificationsPage />} />
              <Route path="/parent/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Warden Routes ───────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.WARDEN]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/warden/dashboard" element={<WardenDashboard />} />
              <Route path="/warden/approvals" element={<PendingApprovalsPage />} />
              <Route path="/warden/leaves" element={<AllLeavesPage />} />
              <Route path="/warden/leaves/:id" element={<LeaveDetailPage />} />
              <Route path="/warden/reports" element={<ReportsPage />} />
              <Route path="/warden/notifications" element={<NotificationsPage />} />
              <Route path="/warden/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Chief Warden Routes ─────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.CHIEF_WARDEN]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/chief-warden/dashboard"     element={<WardenDashboard />} />
              <Route path="/chief-warden/approvals"     element={<PendingApprovalsPage />} />
              <Route path="/chief-warden/leaves"        element={<AllLeavesPage />} />
              <Route path="/chief-warden/leaves/:id"    element={<LeaveDetailPage />} />
              <Route path="/chief-warden/students"      element={<StudentsListPage />} />
              <Route path="/chief-warden/manage"        element={<ChiefWardenManagePage />} />
              <Route path="/chief-warden/reports"       element={<ReportsPage />} />
              <Route path="/chief-warden/notifications" element={<NotificationsPage />} />
              <Route path="/chief-warden/profile"       element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── HOD Routes ──────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.HOD]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/hod/dashboard" element={<WardenDashboard />} />
              <Route path="/hod/approvals" element={<PendingApprovalsPage />} />
              <Route path="/hod/leaves" element={<AllLeavesPage />} />
              <Route path="/hod/leaves/:id" element={<LeaveDetailPage />} />
              <Route path="/hod/students" element={<StudentsListPage />} />
              <Route path="/hod/reports" element={<ReportsPage />} />
              <Route path="/hod/notifications" element={<NotificationsPage />} />
              <Route path="/hod/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Vice Chancellor Routes ──────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.VICE_CHANCELLOR]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/vc/dashboard" element={<WardenDashboard />} />
              <Route path="/vc/leaves" element={<AllLeavesPage />} />
              <Route path="/vc/reports" element={<ReportsPage />} />
              <Route path="/vc/notifications" element={<NotificationsPage />} />
              <Route path="/vc/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Guard Routes ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.GUARD]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/guard/dashboard" element={<GuardDashboard />} />
              <Route path="/guard/scan" element={<QRScanPage />} />
              <Route path="/guard/log" element={<GateLogPage />} />
              <Route path="/guard/notifications" element={<NotificationsPage />} />
              <Route path="/guard/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Admin Routes ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<StudentsListPage />} />
              <Route path="/admin/students/:id" element={<StudentDetailPage />} />
              <Route path="/admin/parents" element={<ParentsListPage />} />
              <Route path="/admin/departments" element={<DepartmentsPage />} />
              <Route path="/admin/courses" element={<CoursesPage />} />
              <Route path="/admin/hostels" element={<HostelsPage />} />
              <Route path="/admin/rooms" element={<RoomsPage />} />
              <Route path="/admin/staff" element={<StaffPage />} />
              <Route path="/admin/leaves" element={<AllLeavesPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ─── Catch-all: redirect to home ──────────────────────── */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
