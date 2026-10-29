/**
 * Login Page — "One campus. One connected system."
 *
 * Two-step authentication workspace:
 *  Step 1 (/login)          — choose your role
 *  Step 2 (/login?role=x)   — sign in as that role
 *
 * The URL stays the source of truth for the step, so deep links and the
 * browser Back button behave naturally. Authentication logic (API call,
 * token handling, redirects, demo credentials) is unchanged.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath, getRoleLabel } from '@/utils/roleConfig';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './LoginPage.css';

// Demo credentials map
const DEMO_CREDENTIALS: Record<string, { email: string; password: string; label: string }> = {
  student:          { email: 'student@demo.edu',     password: 'Demo@123', label: 'Student' },
  parent:           { email: 'parent@demo.edu',      password: 'Demo@123', label: 'Parent' },
  warden:           { email: 'warden@demo.edu',      password: 'Demo@123', label: 'Warden' },
  chief_warden:     { email: 'chiefwarden@demo.edu', password: 'Demo@123', label: 'Chief Warden' },
  hod:              { email: 'hod@demo.edu',         password: 'Demo@123', label: 'HOD' },
  director:         { email: 'vc@demo.edu',          password: 'Demo@123', label: 'Director' },
  guard:            { email: 'guard@demo.edu',       password: 'Demo@123', label: 'Gate Guard' },
  admin:            { email: 'admin@demo.edu',       password: 'Demo@123', label: 'Administrator' },
};

// Role presentation for the selector (ids match the query-param contract above)
const ROLE_OPTIONS: { id: string; label: string; desc: string; icon: string }[] = [
  { id: 'student',         label: 'Student',          desc: 'Submit and track hostel leave requests.',          icon: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5' },
  { id: 'parent',          label: 'Parent',           desc: 'Review and respond to leave requests.',            icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 110 8 4 4 0 010-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'warden',          label: 'Warden',           desc: 'Review assigned hostel leave requests.',           icon: 'M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1' },
  { id: 'chief_warden',    label: 'Chief Warden',     desc: 'Oversee hostels, staff and escalated approvals.',  icon: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4zM9 12l2 2 4-4' },
  { id: 'hod',             label: 'HOD',              desc: 'Approve departmental leave requests.',             icon: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' },
  { id: 'director',        label: 'Director',         desc: 'Institute-wide leave oversight and reports.',      icon: 'M3 22h18M6 22V10m12 12V10M3 10l9-7 9 7H3zM10 14h4m-4 4h4' },
  { id: 'guard',           label: 'Gate Guard',       desc: 'Verify QR passes at the gate.',                    icon: 'M4 7V4h3M20 7V4h-3M4 17v3h3m13-3v3h-3M7 12h10' },
  { id: 'admin',           label: 'Administrator',    desc: 'Manage students, staff, hostels and records.',     icon: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6M9 8h6m2 8h6' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse role from query param — the URL decides which step is shown
  const params = new URLSearchParams(location.search);
  const roleParam = params.get('role') || '';
  const demoCreds = DEMO_CREDENTIALS[roleParam];
  const step: 1 | 2 = demoCreds ? 2 : 1;

  // Step 1 selection (kept when the user returns from step 2)
  const [selectedRole, setSelectedRole] = useState(roleParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const { error: showError } = useFeedback();
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
  }, [roleParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillDemoCredentials = () => {
    if (demoCreds) {
      setEmail(demoCreds.email);
      setPassword(demoCreds.password);
    }
  };

  const handleContinue = () => {
    if (selectedRole && DEMO_CREDENTIALS[selectedRole]) {
      navigate(`/login?role=${selectedRole}`);
    }
  };

  const handleChangeRole = () => {
    navigate('/login');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Please enter both email and password.');
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
        showError(axiosErr.response?.data?.message || 'Invalid credentials');
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabel = demoCreds?.label || (roleParam ? getRoleLabel(roleParam) : '');
  const activeOption = ROLE_OPTIONS.find(r => r.id === roleParam);

  return (
    <div className="lp">
      {/* ─── Left: institutional panel (desktop) ─────────────────── */}
      <aside className="lp-panel" aria-hidden="true">
        <div className="lp-panel__brand">
          <img src="/images/campus/akgec-logo.png" alt="" width="36" height="36" />
          <div>
            <strong>Hostel Leave Portal</strong>
            <span>Ajay Kumar Garg Engineering College</span>
          </div>
        </div>

        <div className="lp-panel__body">
          <p className="lp-panel__eyebrow">AKGEC · Hostel Services</p>
          <h1 className="lp-panel__title">Your campus.<br />Your access.</h1>
          <p className="lp-panel__copy">
            One connected system for hostel leave — sign in for
            role-appropriate access to requests, approvals, and
            entry/exit verification.
          </p>
        </div>

        <figure className="lp-panel__figure">
          <img
            src="/images/campus/boys-hostel-exterior.jpg"
            alt=""
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="lp-panel__figure-overlay" />
          <figcaption>Boys&rsquo; hostel block · AKGEC campus</figcaption>
        </figure>

        <div className="lp-panel__foot">
          <span className="lp-panel__tick" />
          <span>apply · approve · pass</span>
        </div>
      </aside>

      {/* ─── Right: authentication workspace ─────────────────────── */}
      <main className="lp-work">
        {/* Compact brand for mobile */}
        <div className="lp-work__brand">
          <img src="/images/campus/akgec-logo.png" alt="AKGEC" width="28" height="28" />
          <span>Hostel Leave Portal</span>
        </div>

        <div className="lp-work__inner">
          {step === 1 ? (
            <section className="lp-step" aria-labelledby="lp-step1-title" key="step1">
              <p className="lp-step__indicator">Step 1 of 2 · Role</p>
              <h2 id="lp-step1-title" className="lp-step__title">Choose your role</h2>
              <p className="lp-step__subtitle">Select your role to continue to your account.</p>

              <fieldset className="lp-roles">
                <legend className="sr-only">Choose your role</legend>
                {ROLE_OPTIONS.map((role) => (
                  <label key={role.id} className="lp-role" htmlFor={`role-${role.id}`}>
                    <input
                      type="radio"
                      name="portal-role"
                      id={`role-${role.id}`}
                      value={role.id}
                      checked={selectedRole === role.id}
                      onChange={() => setSelectedRole(role.id)}
                    />
                    <span className="lp-role__icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d={role.icon} />
                      </svg>
                    </span>
                    <span className="lp-role__text">
                      <strong>{role.label}</strong>
                      <span>{role.desc}</span>
                    </span>
                    <span className="lp-role__radio" aria-hidden="true" />
                  </label>
                ))}
              </fieldset>

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="lp-step__submit"
                onClick={handleContinue}
                disabled={!selectedRole || !DEMO_CREDENTIALS[selectedRole]}
              >
                Continue
              </Button>

              <p className="lp-work__footnote">
                Accounts are managed by the college. Contact the administrator
                if you need access.
              </p>
            </section>
          ) : (
            <section className="lp-step" aria-labelledby="lp-step2-title" key="step2">
              <p className="lp-step__indicator">Step 2 of 2 · Sign in</p>
              <h2 id="lp-step2-title" className="lp-step__title">Sign in as {roleLabel}</h2>
              <p className="lp-step__subtitle">Use the credentials issued to you.</p>

              <button type="button" className="lp-change-role" onClick={handleChangeRole} id="back-to-roles">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Change role
                {activeOption && (
                  <span className="lp-change-role__chip" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d={activeOption.icon} />
                    </svg>
                  </span>
                )}
              </button>

              {/* Demo credentials banner */}
              {demoCreds && showDemoBanner && (
                <div className="lp-demo" id="demo-credentials-banner" role="note">
                  <div className="lp-demo__head">
                    <span className="lp-demo__title">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                      Demo credentials
                    </span>
                    <button
                      type="button"
                      className="lp-demo__close"
                      onClick={() => setShowDemoBanner(false)}
                      aria-label="Dismiss demo credentials"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <dl className="lp-demo__creds">
                    <div><dt>Email</dt><dd><code>{demoCreds.email}</code></dd></div>
                    <div><dt>Password</dt><dd><code>{demoCreds.password}</code></dd></div>
                  </dl>
                  <button type="button" className="lp-demo__fill" onClick={fillDemoCredentials} id="fill-demo-credentials">
                    Auto-fill credentials
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="lp-form">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@akgec.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />

                <div className="lp-form__password">
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
                    className="lp-form__toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                  className="lp-step__submit"
                >
                  Sign In
                </Button>
              </form>

              <p className="lp-work__footnote">
                Contact your administrator if you need an account or forgot your password.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
