'use client';
import React from 'react';
import { Play, Square, Sparkles, BookOpen, Layers, Terminal as TermIcon, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { RunMode } from '../lib/types';

interface NavbarProps {
  onRun: () => void;
  isRunning: boolean;
  mode: RunMode;
  onModeChange: (m: RunMode) => void;
  translitEnabled: boolean;
  onToggleTranslit: () => void;
  onToggleExamples: () => void;
  onToggleAi: () => void;
  onToggleInspector: () => void;
  isAiOpen: boolean;
  isExamplesOpen: boolean;
  isInspectorOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRun,
  isRunning,
  mode,
  onModeChange,
  translitEnabled,
  onToggleTranslit,
  onToggleExamples,
  onToggleAi,
  onToggleInspector,
  isAiOpen,
  isExamplesOpen,
  isInspectorOpen,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-925/90 backdrop-blur-md px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-9 flex items-center justify-center filter drop-shadow-md select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" className="w-full h-full">
            <polygon points="0,0 36,24 16,24 36,48 0,48" fill="#003893"/>
            <polygon points="3,4 30,22 13,22 30,44 3,44" fill="#DC143C"/>
            <path d="M 9,14 A 4,4 0 0,0 17,14 A 3.5,3.5 0 0,1 10,13 Z" fill="#FFFFFF"/>
            <circle cx="13" cy="15" r="1.5" fill="#FFFFFF"/>
            <circle cx="13" cy="33" r="3" fill="#FFFFFF"/>
            <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.5">
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
            <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
              v1.0
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Nepali Programming Language</span>
        </div>
      </div>

      {/* Main Controls: Run, Mode & Transliteration */}
      <div className="flex items-center space-x-2">
        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-md font-medium text-xs transition-all shadow-md ${
            isRunning
              ? 'bg-amber-600 text-white cursor-wait opacity-80'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 hover:shadow-emerald-900/60 active:scale-95'
          }`}
          title="प्रोग्राम चलाउनुहोस् (Ctrl+Enter)"
        >
          {isRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>चल्दैछ...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>चलाउनुहोस्</span>
              <kbd className="hidden md:inline-block text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono">
                ⌘↵
              </kbd>
            </>
          )}
        </button>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-xs">
          <button
            onClick={() => onModeChange('wasm')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1.5 ${
              mode === 'wasm'
                ? 'bg-slate-800 text-emerald-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="ब्राउजर WASM मोड — द्रुत गति, अफलाइन"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WASM</span>
          </button>
          <button
            onClick={() => onModeChange('sandbox')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1.5 ${
              mode === 'sandbox'
                ? 'bg-slate-800 text-sky-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="स्यान्डबक्स मोड — सुरक्षित होस्ट कार्यान्वयन"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">स्यान्डबक्स</span>
          </button>
          <button
            onClick={() => onModeChange('os')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1.5 ${
              mode === 'os'
                ? 'bg-slate-800 text-amber-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="OS मोड — पूर्ण प्रणाली पहुँच (फाइल, कमान्ड, SQLite)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OS</span>
          </button>
        </div>

        {/* Translit Toggle Button */}
        <button
          onClick={onToggleTranslit}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs border transition-all ${
            translitEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="रोमनबाट नेपाली टाइप रूपान्तरण टगल गर्नुहोस् (F2)"
        >
          <span className="font-devanagari font-semibold">क</span>
          <span className="hidden sm:inline">{translitEnabled ? 'नेपाली' : 'English'}</span>
          <kbd className="text-[10px] bg-slate-800 px-1 py-0.5 rounded border border-slate-700 font-mono">
            F2
          </kbd>
        </button>
      </div>

      {/* Side Action Panels */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onToggleExamples}
          className={`p-2 rounded-md transition-colors text-xs flex items-center space-x-1 ${
            isExamplesOpen ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="उदाहरणहरू (Examples)"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden lg:inline">उदाहरण</span>
        </button>

        <button
          onClick={onToggleAi}
          className={`p-2 rounded-md transition-colors text-xs flex items-center space-x-1 ${
            isAiOpen ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="नेपाली एआई सहायक"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="hidden lg:inline">एआई सहायक</span>
        </button>

        <button
          onClick={onToggleInspector}
          className={`p-2 rounded-md transition-colors text-xs flex items-center space-x-1 ${
            isInspectorOpen ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="AST र बाइटकोड निरीक्षक"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
