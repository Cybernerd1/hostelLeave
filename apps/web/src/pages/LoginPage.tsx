/**
 * Login Page
 *
 * Role-aware login form. Reads ?role= query param to:
 *  - Show a "Logging in as <Role>" badge
 *  - Pre-fill the email with demo credentials
 *  - Display a dismissible demo credentials info box
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath, getRoleLabel } from '@/utils/roleConfig';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import './LoginPage.css';

// Demo credentials map
const DEMO_CREDENTIALS: Record<string, { email: string; password: string; label: string }> = {
  student:          { email: 'student@demo.edu',     password: 'Demo@123', label: 'Student' },
  parent:           { email: 'parent@demo.edu',      password: 'Demo@123', label: 'Parent' },
  warden:           { email: 'warden@demo.edu',      password: 'Demo@123', label: 'Warden' },
  chief_warden:     { email: 'chiefwarden@demo.edu', password: 'Demo@123', label: 'Chief Warden' },
  hod:              { email: 'hod@demo.edu',         password: 'Demo@123', label: 'HOD' },
  vice_chancellor:  { email: 'vc@demo.edu',          password: 'Demo@123', label: 'Vice Chancellor' },
  guard:            { email: 'guard@demo.edu',       password: 'Demo@123', label: 'Gate Guard' },
  admin:            { email: 'admin@demo.edu',       password: 'Demo@123', label: 'Administrator' },
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse role from query param
  const params = new URLSearchParams(location.search);
  const roleParam = params.get('role') || '';
  const demoCreds = DEMO_CREDENTIALS[roleParam];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Pre-fill credentials when role param changes
  useEffect(() => {
    if (demoCreds) {
      setEmail(demoCreds.email);
      setShowDemoBanner(true);
    } else {
      setEmail('');
    }
    setPassword('');
    setError('');
  }, [roleParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillDemoCredentials = () => {
    if (demoCreds) {
      setEmail(demoCreds.email);
      setPassword(demoCreds.password);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        navigate(from || getDashboardPath(user.role), { replace: true });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Invalid credentials');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabel = demoCreds?.label || (roleParam ? getRoleLabel(roleParam) : '');

  return (
    <div className="login-page">
      <div className="login-page__container">
        {/* Left: Branding */}
        <div className="login-page__branding">
          <div className="login-page__branding-content">
            <div className="login-page__logo">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
                <path
                  d="M8 22V12L16 7L24 12V22L16 27L8 22Z"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path d="M16 17V27M8 12L16 17L24 12" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="login-page__title">HostelLeave</h1>
            <p className="login-page__tagline">
              Streamlined leave management for hostels. Apply, track, and approve leave requests with ease.
            </p>
            <div className="login-page__features">
              <div className="login-page__feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Multi-level approval workflow</span>
              </div>
              <div className="login-page__feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>QR-based gate verification</span>
              </div>
              <div className="login-page__feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Real-time notifications</span>
              </div>
              <div className="login-page__feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>PDF leave pass download</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="login-page__form-section">
          <div className="login-page__form-wrapper">

            {/* Back to role selector */}
            <Link to="/" className="login-page__back-link" id="back-to-roles">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Choose a different role
            </Link>

            <div className="login-page__form-header">
              {roleLabel && (
                <div className="login-page__role-badge" id="role-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Signing in as <strong>{roleLabel}</strong>
                </div>
              )}
              <h2>Welcome back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {/* Demo credentials banner */}
            {demoCreds && showDemoBanner && (
              <div className="login-page__demo-banner" id="demo-credentials-banner" role="note">
                <div className="login-page__demo-banner-header">
                  <div className="login-page__demo-banner-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Demo Credentials
                  </div>
                  <button
                    type="button"
                    className="login-page__demo-close"
                    onClick={() => setShowDemoBanner(false)}
                    aria-label="Dismiss demo credentials"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="login-page__demo-creds">
                  <div className="login-page__demo-cred-row">
                    <span className="login-page__demo-cred-label">Email</span>
                    <code className="login-page__demo-cred-value">{demoCreds.email}</code>
                  </div>
                  <div className="login-page__demo-cred-row">
                    <span className="login-page__demo-cred-label">Password</span>
                    <code className="login-page__demo-cred-value">{demoCreds.password}</code>
                  </div>
                </div>
                <button
                  type="button"
                  className="login-page__demo-fill-btn"
                  onClick={fillDemoCredentials}
                  id="fill-demo-credentials"
                >
                  Auto-fill credentials
                </button>
              </div>
            )}

            {error && (
              <div className="login-page__error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-page__form">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@hostelleave.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />

              <div className="login-page__password-field">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-page__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="login-page__submit"
              >
                Sign In
              </Button>
            </form>

            <p className="login-page__footer-text">
              Contact your administrator if you need an account or forgot your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
