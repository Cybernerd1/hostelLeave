/**
 * Page Shell
 *
 * Reusable shell for pages that are not yet fully built.
 * Shows a title, subtitle, and "coming soon" placeholder.
 */

import { Card } from '@/components/ui/Card';
import './PageShell.css';

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: string; // SVG path data
}

export function PageShell({ title, subtitle, icon }: PageShellProps) {
  return (
    <div className="page-shell animate-fade-in-up">
      <div className="page-shell__header">
        <h1 className="page-shell__title">{title}</h1>
        {subtitle && <p className="page-shell__subtitle">{subtitle}</p>}
      </div>

      <Card variant="default" padding="lg" className="page-shell__placeholder">
        <div className="page-shell__placeholder-content">
          {icon && (
            <svg
              className="page-shell__placeholder-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-neutral-300)"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={icon} />
            </svg>
          )}
          <h3 className="page-shell__placeholder-title">Coming Soon</h3>
          <p className="page-shell__placeholder-text">
            This page is under development and will be available shortly.
          </p>
        </div>
      </Card>
    </div>
  );
}
