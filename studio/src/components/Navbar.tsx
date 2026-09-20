'use client';
import React from 'react';
import {
  Play,
  Cpu,
  Terminal,
  ShieldAlert,
  Sparkles,
  Share2,
  PanelLeft,
  Layers,
} from 'lucide-react';
import { RunMode } from '../lib/types';

interface NavbarProps {
  onRun: () => void;
  isRunning: boolean;
  mode: RunMode;
  onModeChange: (m: RunMode) => void;
  translitEnabled: boolean;
  onToggleTranslit: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onToggleAi: () => void;
  onToggleInspector?: () => void;
  onOpenShare: () => void;
  isAiOpen: boolean;
  isInspectorOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRun,
  isRunning,
  mode,
  onModeChange,
  translitEnabled,
  onToggleTranslit,
  onToggleSidebar,
  isSidebarOpen,
  onToggleAi,
  onToggleInspector,
  onOpenShare,
  isAiOpen,
  isInspectorOpen,
}) => {
  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#0B0F19]/90 backdrop-blur-md px-3 md:px-4 flex items-center justify-between select-none z-30 shadow-md">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSidebarOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#0F172A] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
            title="साइडबार खोल्नुहोस् / बन्द गर्नुहोस् (Toggle Sidebar - Ctrl+B)"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="w-7 h-8 flex items-center justify-center filter drop-shadow-md select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" className="w-full h-full">
            <polygon points="0,0 36,24 16,24 36,48 0,48" fill="#003893"/>
            <polygon points="3,4 30,22 13,22 30,44 3,44" fill="#DC143C"/>
            <path d="M 9,14 A 4,4 0 0,0 17,14 A 3.5,3.5 0 0,1 10,13 Z" fill="#FFFFFF"/>
            <circle cx="13" cy="15" r="1.5" fill="#FFFFFF"/>
            <circle cx="13" cy="33" r="3" fill="#FFFFFF"/>
            <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.5">
              <line x1="13" y1="28.5" x2="13" y2="37.5"/>
              <line x1="8.5" y1="33" x2="17.5" y2="33"/>
              <line x1="9.8" y1="29.8" x2="16.2" y2="36.2"/>
              <line x1="9.8" y1="36.2" x2="16.2" y2="29.8"/>
            </g>
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-wide text-slate-100 font-devanagari">
              नेपाली स्टुडियो
            </span>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">
              IDE v1.0
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">Nepali Programming Language</span>
        </div>
      </div>

      {/* Main Controls: Run, Mode & Transliteration */}
      <div className="flex items-center space-x-2">
        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-3.5 md:px-4 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-md active:scale-95 ${
            isRunning
              ? 'bg-amber-600 text-white cursor-wait opacity-80 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
          }`}
          title="प्रोग्राम चलाउनुहोस् (Ctrl+Enter / ⌘↵)"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span className="font-devanagari">चल्दैछ...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="font-devanagari">चलाउनुहोस्</span>
              <kbd className="hidden md:inline-block text-[10px] bg-emerald-600/60 text-slate-950 px-1.5 py-0.5 rounded font-mono font-bold">
                Ctrl+↵
              </kbd>
            </>
          )}
        </button>

        {/* Runtime Mode Selector */}
        <div className="flex items-center bg-[#060911] border border-[#1E293B] rounded-lg p-0.5 shadow-inner">
          <button
            onClick={() => onModeChange('wasm')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              mode === 'wasm'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="द्रुत इन-ब्राउजर Wasm इन्जिन (Instant In-Browser Wasm)"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WASM</span>
          </button>

          <button
            onClick={() => onModeChange('sandbox')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              mode === 'sandbox'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="सुरक्षित क्लाउड स्यान्डबक्स (Secure Cloud Sandbox)"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sandbox</span>
          </button>

          <button
            onClick={() => onModeChange('os')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              mode === 'os'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="नेटिभ ओएस मोड (Full Native CLI Runtime)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OS</span>
          </button>
        </div>

        {/* Translit Toggle Button */}
        <button
          onClick={onToggleTranslit}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
            translitEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
              : 'bg-[#060911] border-[#1E293B] text-slate-400 hover:text-slate-200'
          }`}
          title="रोमनबाट नेपाली टाइप रूपान्तरण टगल गर्नुहोस् (F2)"
        >
          <span className="font-devanagari font-bold">क</span>
          <span className="hidden sm:inline font-devanagari">{translitEnabled ? 'नेपाली' : 'English'}</span>
          <kbd className="text-[10px] bg-[#0F172A] px-1 py-0.5 rounded border border-[#1E293B] font-mono">
            F2
          </kbd>
        </button>
      </div>

      {/* Side Action Panels & Sharing */}
      <div className="flex items-center space-x-1">
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`p-2 rounded-lg transition-colors text-xs flex items-center space-x-1 border ${
              isInspectorOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'border-transparent text-slate-400 hover:bg-[#0F172A] hover:text-slate-200'
            }`}
            title="निरीक्षक प्यानल (AST & Bytecode Inspector)"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">निरीक्षक</span>
          </button>
        )}

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          className="px-2.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 text-slate-300 hover:text-emerald-400 hover:bg-[#0F172A] transition-colors border border-transparent hover:border-[#1E293B]"
          title="प्रोग्राम साझेदारी गर्नुहोस् (Share Code URL)"
        >
          <Share2 className="w-4 h-4 text-emerald-400" />
          <span className="hidden lg:inline text-xs font-medium font-devanagari">साझेदारी</span>
        </button>

        <button
          onClick={onToggleAi}
          className={`p-2 rounded-lg transition-colors text-xs flex items-center space-x-1 border ${
            isAiOpen
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold'
              : 'border-transparent text-slate-400 hover:bg-[#0F172A] hover:text-slate-200'
          }`}
          title="नेपाली एआई सहायक (AI Assistant - Toggle)"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="hidden lg:inline font-devanagari">एआई सहायक</span>
        </button>
      </div>
    </header>
  );
};
