'use client';
import React, { useEffect, useRef } from 'react';
import {
  Play,
  Save,
  AlignLeft,
  Copy,
  Scissors,
  Clipboard,
  Sparkles,
  Globe,
  CheckSquare,
  Plus,
  FolderPlus,
  Terminal,
  Code2,
  Share2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { isDesktopApp } from '../lib/env';

export interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRun?: () => void;
  onSave?: () => void;
  onFormat?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onToggleTranslit?: () => void;
  onAskAi?: () => void;
  onOpenTerminal?: () => void;
  onOpenAst?: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onResetWorkspace?: () => void;
  onShare?: () => void;
  onDownloadApp?: () => void;
  translitEnabled?: boolean;
  isAiAvailable?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onRun,
  onSave,
  onFormat,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onToggleTranslit,
  onAskAi,
  onOpenTerminal,
  onOpenAst,
  onNewFile,
  onNewFolder,
  onResetWorkspace,
  onShare,
  onDownloadApp,
  translitEnabled = true,
  isAiAvailable = false,
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

  // Adjust position to stay cleanly inside viewport
  const adjustedX = typeof window !== 'undefined' ? Math.max(8, Math.min(x, window.innerWidth - 265)) : x;
  const adjustedY = typeof window !== 'undefined' ? Math.max(8, Math.min(y, window.innerHeight - 480)) : y;

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-50 w-64 bg-[#0B0F19]/95 backdrop-blur-xl border border-[#1E293B] rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 font-devanagari space-y-0.5"
    >
      {/* Run Action */}
      {onRun && (
        <button
          onClick={() => {
            onRun();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 text-emerald-400 font-medium transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>चलाउनुहोस् (Run Code)</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
            Ctrl+↵
          </kbd>
        </button>
      )}

      {/* Save File */}
      {onSave && (
        <button
          onClick={() => {
            onSave();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span>सुरक्षित गर्नुहोस् (Save)</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
            Ctrl+S
          </kbd>
        </button>
      )}

      {/* Format Code */}
      {onFormat && (
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
          <kbd className="text-[10px] font-mono text-slate-400 bg-[#060911] px-1.5 py-0.5 rounded border border-[#1E293B]">
            Shift+Alt+F
          </kbd>
        </button>
      )}

      <div className="my-1 border-t border-[#1E293B]/70" />

      {/* Cut */}
      {onCut && (
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
      )}

      {/* Copy */}
      {onCopy && (
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
      )}

      {/* Paste */}
      {onPaste && (
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
      )}

      {/* Select All */}
      {onSelectAll && (
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
      )}

      <div className="my-1 border-t border-[#1E293B]/70" />

      {/* New File */}
      {onNewFile && (
        <button
          onClick={() => {
            onNewFile();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>नयाँ फाइल (New File)</span>
        </button>
      )}

      {/* New Folder */}
      {onNewFolder && (
        <button
          onClick={() => {
            onNewFolder();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
          <span>नयाँ फोल्डर (New Folder)</span>
        </button>
      )}

      {/* Ask AI */}
      {isAiAvailable && onAskAi && (
        <button
          onClick={() => {
            onAskAi();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>एआई सहायक सोध्नुहोस् (Ask AI)</span>
        </button>
      )}

      {/* Toggle AST / Bytecode */}
      {onOpenAst && (
        <button
          onClick={() => {
            onOpenAst();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>बाइटकोड / AST निरीक्षक (Bytecode)</span>
        </button>
      )}

      {/* Toggle Terminal Output */}
      {onOpenTerminal && (
        <button
          onClick={() => {
            onOpenTerminal();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>कन्सोल आउटपुट (Terminal Output)</span>
        </button>
      )}

      <div className="my-1 border-t border-[#1E293B]/70" />

      {/* Transliteration Toggle */}
      {onToggleTranslit && (
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
      )}

      {/* Share Workspace */}
      {onShare && (
        <button
          onClick={() => {
            onShare();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-[#0F172A] hover:text-slate-100 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-400" />
          <span>कोड साझेदारी (Share Code URL)</span>
        </button>
      )}

      {/* Reset Workspace */}
      {onResetWorkspace && (
        <button
          onClick={() => {
            onResetWorkspace();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>कार्यक्षेत्र रिसेट (Reset Workspace)</span>
        </button>
      )}

      {/* Download Desktop App (on web only) */}
      {!isDesktopApp() && onDownloadApp && (
        <button
          onClick={() => {
            onDownloadApp();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>डेस्कटप एप डाउनलोड (Mac/Win/Linux)</span>
        </button>
      )}
    </div>
  );
};
