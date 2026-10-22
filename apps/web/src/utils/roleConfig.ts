/**
 * Role Configuration
 *
 * Maps each user role to its display label, dashboard path,
 * sidebar navigation items, and accent color.
 */

export const UserRole = {
  STUDENT: 'student',
  PARENT: 'parent',
  WARDEN: 'warden',
  CHIEF_WARDEN: 'chief_warden',
  HOD: 'hod',
  DIRECTOR: 'director',
  GUARD: 'guard',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface NavItem {
  label: string;
  path: string;
  icon: string; // SVG path data
}

export interface RoleConfig {
  label: string;
  dashboardPath: string;
  basePath: string;
  accent: string;
  navItems: NavItem[];
}

// ─── SVG Icon Paths (24x24 viewBox) ────────────────────────────────
const ICONS = {
  dashboard:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  leaves:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  addLeave:
    'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  approvals:
    'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  notifications:
    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  profile:
    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  scan:
    'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  gateLog:
    'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  students:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  parents:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  departments:
    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  courses:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  hostels:
    'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  rooms:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  staff:
    'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  reports:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  auditLogs:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  assignParent:
    'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  hostelManage:
    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
};


const roleConfigs: Record<UserRole, RoleConfig> = {
  [UserRole.STUDENT]: {
    label: 'Student',
    dashboardPath: '/student/dashboard',
    basePath: '/student',
    accent: '#6366f1',
    navItems: [
      { label: 'Dashboard', path: '/student/dashboard', icon: ICONS.dashboard },
      { label: 'My Leaves', path: '/student/leaves', icon: ICONS.leaves },
      { label: 'Apply Leave', path: '/student/leaves/new', icon: ICONS.addLeave },
      { label: 'Notifications', path: '/student/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/student/profile', icon: ICONS.profile },
    ],
  },
  [UserRole.PARENT]: {
    label: 'Parent',
    dashboardPath: '/parent/dashboard',
    basePath: '/parent',
    accent: '#8b5cf6',
    navItems: [
      { label: 'Dashboard', path: '/parent/dashboard', icon: ICONS.dashboard },
      { label: 'Approvals', path: '/parent/approvals', icon: ICONS.approvals },
      { label: 'Notifications', path: '/parent/notifications', icon: ICONS.notifications },
    ],
  },
  [UserRole.WARDEN]: {
    label: 'Warden',
    dashboardPath: '/warden/dashboard',
    basePath: '/warden',
    accent: '#0ea5e9',
    navItems: [
      { label: 'Dashboard', path: '/warden/dashboard', icon: ICONS.dashboard },
      { label: 'Approvals', path: '/warden/approvals', icon: ICONS.approvals },
      { label: 'All Leaves', path: '/warden/leaves', icon: ICONS.leaves },
      { label: 'Reports', path: '/warden/reports', icon: ICONS.reports },
      { label: 'Notifications', path: '/warden/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/warden/profile', icon: ICONS.profile },
    ],
  },

  [UserRole.CHIEF_WARDEN]: {
    label: 'Chief Warden',
    dashboardPath: '/chief-warden/dashboard',
    basePath: '/chief-warden',
    accent: '#0891b2',
    navItems: [
      { label: 'Dashboard', path: '/chief-warden/dashboard', icon: ICONS.dashboard },
      { label: 'Approvals', path: '/chief-warden/approvals', icon: ICONS.approvals },
      { label: 'All Leaves', path: '/chief-warden/leaves', icon: ICONS.leaves },
      { label: 'Students', path: '/chief-warden/students', icon: ICONS.students },
      { label: 'Manage Hostels', path: '/chief-warden/manage', icon: ICONS.hostelManage },
      { label: 'Reports', path: '/chief-warden/reports', icon: ICONS.reports },
      { label: 'Notifications', path: '/chief-warden/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/chief-warden/profile', icon: ICONS.profile },
    ],
  },

  [UserRole.HOD]: {
    label: 'HOD',
    dashboardPath: '/hod/dashboard',
    basePath: '/hod',
    accent: '#059669',
    navItems: [
      { label: 'Dashboard', path: '/hod/dashboard', icon: ICONS.dashboard },
      { label: 'Approvals', path: '/hod/approvals', icon: ICONS.approvals },
      { label: 'All Leaves', path: '/hod/leaves', icon: ICONS.leaves },
      { label: 'Students', path: '/hod/students', icon: ICONS.students },
      { label: 'Reports', path: '/hod/reports', icon: ICONS.reports },
      { label: 'Notifications', path: '/hod/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/hod/profile', icon: ICONS.profile },
    ],
  },

  [UserRole.DIRECTOR]: {
    label: 'Director',
    dashboardPath: '/director/dashboard',
    basePath: '/director',
    accent: '#d97706',
    navItems: [
      { label: 'Dashboard', path: '/director/dashboard', icon: ICONS.dashboard },
      { label: 'All Leaves', path: '/director/leaves', icon: ICONS.leaves },
      { label: 'Reports', path: '/director/reports', icon: ICONS.reports },
      { label: 'Notifications', path: '/director/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/director/profile', icon: ICONS.profile },
    ],
  },

  [UserRole.GUARD]: {
    label: 'Guard',
    dashboardPath: '/guard/dashboard',
    basePath: '/guard',
    accent: '#dc2626',
    navItems: [
      { label: 'Dashboard', path: '/guard/dashboard', icon: ICONS.dashboard },
      { label: 'Scan QR', path: '/guard/scan', icon: ICONS.scan },
      { label: 'Gate Log', path: '/guard/log', icon: ICONS.gateLog },
      { label: 'Notifications', path: '/guard/notifications', icon: ICONS.notifications },
      { label: 'Profile', path: '/guard/profile', icon: ICONS.profile },
    ],
  },

  [UserRole.ADMIN]: {
    label: 'Administrator',
    dashboardPath: '/admin/dashboard',
    basePath: '/admin',
    accent: '#4f46e5',
    navItems: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: ICONS.dashboard },
      { label: 'Students', path: '/admin/students', icon: ICONS.students },
      { label: 'Parents', path: '/admin/parents', icon: ICONS.parents },
      { label: 'Departments', path: '/admin/departments', icon: ICONS.departments },
      { label: 'Courses', path: '/admin/courses', icon: ICONS.courses },
      { label: 'Hostels', path: '/admin/hostels', icon: ICONS.hostels },
      { label: 'Rooms', path: '/admin/rooms', icon: ICONS.rooms },
      { label: 'Staff', path: '/admin/staff', icon: ICONS.staff },
      { label: 'All Leaves', path: '/admin/leaves', icon: ICONS.leaves },
      { label: 'Reports', path: '/admin/reports', icon: ICONS.reports },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: ICONS.auditLogs },
      { label: 'Notifications', path: '/admin/notifications', icon: ICONS.notifications },
    ],
  },
};

/**
 * Get the configuration for a given role.
 */
export function getRoleConfig(role: string): RoleConfig {
  return roleConfigs[role as UserRole] || roleConfigs[UserRole.STUDENT];
}

/**
 * Get the dashboard path for a given role.
 */
export function getDashboardPath(role: string): string {
  return getRoleConfig(role).dashboardPath;
}

/**
 * Get the display label for a given role.
 */
export function getRoleLabel(role: string): string {
  return getRoleConfig(role).label;
}

/**
 * Get the initials from a name (e.g., "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
