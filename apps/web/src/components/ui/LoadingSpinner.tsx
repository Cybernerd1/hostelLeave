/**
 * Loading Spinner Component
 *
 * Full-page and inline variants.
 */

import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  message?: string;
}

export function LoadingSpinner({
  size = 'md',
  fullPage = false,
  message,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`spinner spinner--${size}`}>
      <div className="spinner__circle" />
      {message && <p className="spinner__message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="spinner-overlay">{spinner}</div>;
  }

  return spinner;
}
