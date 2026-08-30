/**
 * Public Route
 *
 * For pages accessible only when NOT logged in (e.g., login page).
 * Redirects authenticated users to their role-specific dashboard.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roleConfig';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function PublicRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage message="Loading..." />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}
