/**
 * Loading Spinner Component
 *
 * Full-page and inline variants.
 * Only the .spinner__circle element rotates — text is a sibling, never a child of the rotating element.
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
      {/* Only this element rotates via CSS animation */}
      <div className="spinner__circle" aria-hidden="true" />
      {/* Message is a sibling — never inherits the rotation */}
      {message && <p className="spinner__message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="spinner-overlay" role="status" aria-label={message ?? 'Loading'}>{spinner}</div>;
  }

  return spinner;
}
