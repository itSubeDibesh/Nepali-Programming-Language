'use client';
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const borderColors = {
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-300',
    error: 'border-rose-500/40 bg-rose-950/90 text-rose-300',
    warning: 'border-amber-500/40 bg-amber-950/90 text-amber-300',
    info: 'border-indigo-500/40 bg-indigo-950/90 text-indigo-300',
  };

  const iconColors = {
    success: 'text-emerald-400',
    error: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-indigo-400',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all animate-in slide-in-from-bottom-3 fade-in duration-200 ${borderColors[toast.type]}`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`}>
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
        {toast.type === 'info' && <Info className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-100 font-devanagari leading-snug">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[11px] text-slate-300 mt-0.5 font-devanagari leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-100 p-0.5 rounded transition-colors flex-shrink-0"
        title="बन्द गर्नुहोस्"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
