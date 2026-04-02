/**
 * BellePoule Modern - Toast Notification Component
 * Replaces native alert() to avoid focus issues in Electron
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { logger, LogCategory } from '@shared/services/logger';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: '#f0fdf4', border: '#22c55e', text: '#166534' };
      case 'warning':
        return { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' };
      case 'error':
        return { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' };
      default:
        return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => {
          const colors = getColors(toast.type);
          return (
            <div
              key={toast.id}
              style={{
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                maxWidth: '400px',
                pointerEvents: 'auto',
                animation: 'slideIn 0.3s ease-out',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{getIcon(toast.type)}</span>
              <span style={{ color: colors.text, fontWeight: '500', flex: 1 }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  padding: '0.25rem',
                  opacity: 0.7,
                  fontSize: '1rem',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      showToast: (message: string) => {
        logger.warn(LogCategory.UI, 'Toast used outside provider', { message });
      },
    };
  }
  return context;
};

export default ToastProvider;
