/**
 * Unauthorized Page (403)
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roleConfig';
import { Button } from '@/components/ui/Button';
import './UnauthorizedPage.css';

export function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role));
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-page__content animate-fade-in-up">
        <div className="unauthorized-page__icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="unauthorized-page__title">Access Denied</h1>
        <p className="unauthorized-page__message">
          You don't have permission to access this page. If you believe this is an error, please contact your administrator.
        </p>
        <Button variant="primary" onClick={handleGoToDashboard}>
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </Button>
      </div>
    </div>
  );
}
