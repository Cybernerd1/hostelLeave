import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import './FeedbackProvider.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);
  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);
  const info = useCallback((message: string) => toast(message, 'info'), [toast]);

  const confirm = useCallback((options: ConfirmOptions | string) => new Promise<boolean>((resolve) => {
    setDialog({
      ...(typeof options === 'string' ? { message: options } : options),
      resolve,
    });
  }), []);

  const closeDialog = useCallback((accepted: boolean) => {
    if (!dialog) return;
    dialog.resolve(accepted);
    setDialog(null);
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialog, closeDialog]);

  const value = useMemo<FeedbackContextValue>(() => ({
    toast,
    success,
    error,
    info,
    confirm,
  }), [toast, success, error, info, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="feedback-toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <div className={`feedback-toast feedback-toast--${item.type}`} key={item.id} role={item.type === 'error' ? 'alert' : 'status'}>
            <span className="feedback-toast__icon" aria-hidden="true">{item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}</span>
            <span>{item.message}</span>
            <button type="button" className="feedback-toast__close" onClick={() => removeToast(item.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="feedback-dialog-backdrop" role="presentation" onMouseDown={() => closeDialog(false)}>
          <section className="feedback-dialog" role="alertdialog" aria-modal="true" aria-labelledby="feedback-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={`feedback-dialog__icon ${dialog.destructive ? 'feedback-dialog__icon--danger' : ''}`} aria-hidden="true">{dialog.destructive ? '!' : '?'}</div>
            <h2 id="feedback-dialog-title">{dialog.title || (dialog.destructive ? 'Confirm deletion' : 'Please confirm')}</h2>
            <p>{dialog.message}</p>
            <div className="feedback-dialog__actions">
              <button type="button" className="feedback-dialog__button feedback-dialog__button--secondary" onClick={() => closeDialog(false)}>{dialog.cancelLabel || 'Cancel'}</button>
              <button type="button" className={`feedback-dialog__button ${dialog.destructive ? 'feedback-dialog__button--danger' : 'feedback-dialog__button--primary'}`} onClick={() => closeDialog(true)} autoFocus>{dialog.confirmLabel || 'Confirm'}</button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used inside FeedbackProvider');
  return context;
}
