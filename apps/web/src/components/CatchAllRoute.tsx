/**
 * Catch-All Route
 *
 * Redirects authenticated users to their role-specific dashboard,
 * and unauthenticated users to the home page.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roleConfig';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function CatchAllRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage message="Loading..." />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/" replace />;
}

