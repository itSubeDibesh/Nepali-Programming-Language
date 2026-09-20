'use client';
import React from 'react';
import { Files, BookOpen, Sparkles, Layers, HelpCircle, Settings, Play, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { RunMode } from '../lib/types';

export type ActiveSidebarTab = 'files' | 'examples' | 'cheatsheet' | 'ai' | 'inspector' | null;

interface ActivityBarProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  onRun: () => void;
  isRunning: boolean;
  mode: RunMode;
  onModeChange: (m: RunMode) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  onRun,
  isRunning,
  mode,
  onModeChange,
}) => {
  const toggle = (tab: ActiveSidebarTab) => {
    onSelectTab(activeTab === tab ? null : tab);
  };

  return (
    <aside className="w-12 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col items-center py-3 select-none z-30 justify-between">
      {/* Top Icons */}
      <div className="flex flex-col items-center space-y-2.5 w-full">
        {/* Nepal Flag IDE Icon */}
        <div className="w-8 h-9 flex items-center justify-center filter drop-shadow-md mb-2 cursor-pointer" title="नेपाली स्टुडियो IDE">
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

        {/* Files Explorer Tab */}
        <button
          onClick={() => toggle('files')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'files'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="फाइल अन्वेषक (Files Explorer)"
        >
          {activeTab === 'files' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <Files className="w-5 h-5" />
        </button>

        {/* Examples Catalog Tab */}
        <button
          onClick={() => toggle('examples')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'examples'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="उदाहरण पुस्तकालय (Examples Library)"
        >
          {activeTab === 'examples' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <BookOpen className="w-5 h-5" />
        </button>

        {/* Cheatsheet / Reference Tab */}
        <button
          onClick={() => toggle('cheatsheet')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'cheatsheet'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="भाषा सन्दर्भ र कुञ्जीशब्दहरू (Language Cheatsheet)"
        >
          {activeTab === 'cheatsheet' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* AI Assistant Tab */}
        <button
          onClick={() => toggle('ai')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'ai'
              ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="नेपाली एआई सहायक (AI Assistant)"
        >
          {activeTab === 'ai' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-lg shadow-indigo-500/50" />
          )}
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </button>

        {/* AST & Bytecode Inspector Tab */}
        <button
          onClick={() => toggle('inspector')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'inspector'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="AST र बाइटकोड निरीक्षक (AST & Bytecode)"
        >
          {activeTab === 'inspector' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Run Action Button */}
      <div className="flex flex-col items-center space-y-3 w-full pb-1">
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
            isRunning
              ? 'bg-amber-600 text-white cursor-wait animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
          }`}
          title="प्रोग्राम चलाउनुहोस् (Ctrl+Enter / ⌘↵)"
        >
          {isRunning ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </aside>
  );
};
