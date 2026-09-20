'use client';
import React, { useEffect, useRef } from 'react';
import {
  Play,
  AlignLeft,
  Copy,
  Scissors,
  Clipboard,
  Sparkles,
  Globe,
  CheckSquare,
  Trash2,
} from 'lucide-react';

export interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRun: () => void;
  onFormat: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onToggleTranslit: () => void;
  onAskAi: () => void;
  translitEnabled: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onRun,
  onFormat,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onToggleTranslit,
  onAskAi,
  translitEnabled,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay inside viewport
  const adjustedX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - 240) : x;
  const adjustedY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - 340) : y;

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-50 w-60 bg-[#0B0F19]/95 backdrop-blur-xl border border-[#1E293B] rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 font-devanagari"
    >
      {/* Run Action */}
      <button
        onClick={() => {
          onRun();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 text-emerald-400 font-medium transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>चलाउनुहोस् (Run)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          Ctrl+↵
        </kbd>
      </button>

      {/* Format Code */}
      <button
        onClick={() => {
          onFormat();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>ढाँचा मिलाउनुहोस् (Format)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          ⇧⌥F
        </kbd>
      </button>

      <div className="my-1 border-t border-[#1E293B]/70" />

      {/* Cut */}
      <button
        onClick={() => {
          onCut();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Scissors className="w-3.5 h-3.5 text-slate-400" />
          <span>काट्नुहोस् (Cut)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          Ctrl+X
        </kbd>
      </button>

      {/* Copy */}
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>प्रतिलिपि (Copy)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          Ctrl+C
        </kbd>
      </button>

      {/* Paste */}
      <button
        onClick={() => {
          onPaste();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Clipboard className="w-3.5 h-3.5 text-slate-400" />
          <span>टाँस्नुहोस् (Paste)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          Ctrl+V
        </kbd>
      </button>

      {/* Select All */}
      <button
        onClick={() => {
          onSelectAll();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>सबै चयन (Select All)</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          Ctrl+A
        </kbd>
      </button>

      <div className="my-1 border-t border-[#1E293B]/70" />

      {/* Transliteration Toggle */}
      <button
        onClick={() => {
          onToggleTranslit();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{translitEnabled ? 'नेपाली टाइप (सक्रिय)' : 'English Mode'}</span>
        </div>
        <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
          F2
        </kbd>
      </button>

      {/* Ask AI */}
      <button
        onClick={() => {
          onAskAi();
          onClose();
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-300 text-indigo-400 font-medium transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>एआई सहायक सोध्नुहोस्</span>
        </div>
      </button>
    </div>
  );
};
