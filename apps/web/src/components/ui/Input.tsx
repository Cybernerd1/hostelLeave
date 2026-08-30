/**
 * Input Component
 *
 * Styled form input with label, error, and helper text.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-group__label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className="input-group__input"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="input-group__error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="input-group__helper">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
