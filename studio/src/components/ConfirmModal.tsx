'use client';
import React from 'react';
import { AlertTriangle, Trash2, RefreshCw, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ dialog, onClose }) => {
  if (!dialog || !dialog.isOpen) return null;

  const handleConfirm = () => {
    dialog.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    onClose();
  };

  const variant = dialog.variant || 'danger';

  const icons = {
    danger: <Trash2 className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <HelpCircle className="w-5 h-5 text-indigo-400" />,
  };

  const confirmColors = {
    danger: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40 text-white',
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0B0F19] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 flex items-start space-x-3.5 border-b border-[#1E293B] bg-[#060911]/60">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-inner flex-shrink-0">
            {icons[variant]}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-100 font-devanagari">
              {dialog.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-devanagari leading-relaxed">
              {dialog.message}
            </p>
          </div>

          <button
            onClick={handleCancel}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-[#0F172A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#0B0F19] flex items-center justify-end space-x-2.5">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all font-devanagari"
          >
            {dialog.cancelLabel || 'रद्द गर्नुहोस् (Cancel)'}
          </button>

          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg active:scale-95 transition-all font-devanagari ${confirmColors[variant]}`}
          >
            {dialog.confirmLabel || 'निश्चित गर्नुहोस् (Confirm)'}
          </button>
        </div>
      </div>
    </div>
  );
};
