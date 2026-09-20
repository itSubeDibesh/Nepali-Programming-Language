'use client';
import React from 'react';
import { Files, BookOpen, Sparkles, Layers, HelpCircle, Play } from 'lucide-react';
import { RunMode } from '../lib/types';

export type ActiveSidebarTab = 'files' | 'examples' | 'cheatsheet' | null;

interface ActivityBarProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  isAiOpen: boolean;
  onToggleAi: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  onRun: () => void;
  isRunning: boolean;
  mode: RunMode;
  onModeChange: (m: RunMode) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  isAiOpen,
  onToggleAi,
  isInspectorOpen,
  onToggleInspector,
  onRun,
  isRunning,
}) => {
  const toggleTab = (tab: 'files' | 'examples' | 'cheatsheet') => {
    onSelectTab(activeTab === tab ? null : tab);
  };

  return (
    <aside className="w-12 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col items-center py-2.5 select-none z-30 justify-between">
      {/* Action Icons Rail */}
      <div className="flex flex-col items-center space-y-2 w-full">
        {/* Files Explorer Tab */}
        <button
          onClick={() => toggleTab('files')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'files'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="फाइल अन्वेषक (Files Explorer - Toggle)"
        >
          {activeTab === 'files' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <Files className="w-5 h-5" />
        </button>

        {/* Examples Catalog Tab */}
        <button
          onClick={() => toggleTab('examples')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'examples'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="उदाहरण पुस्तकालय (Examples Library - Toggle)"
        >
          {activeTab === 'examples' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <BookOpen className="w-5 h-5" />
        </button>

        {/* Cheatsheet / Reference Tab */}
        <button
          onClick={() => toggleTab('cheatsheet')}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTab === 'cheatsheet'
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="भाषा सन्दर्भ र कुञ्जीशब्दहरू (Language Cheatsheet - Toggle)"
        >
          {activeTab === 'cheatsheet' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* AI Assistant Tab */}
        <button
          onClick={onToggleAi}
          className={`p-2.5 rounded-xl transition-all relative ${
            isAiOpen
              ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="नेपाली एआई सहायक (AI Assistant - Toggle)"
        >
          {isAiOpen && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-lg shadow-indigo-500/50" />
          )}
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </button>

        {/* AST & Bytecode Inspector Tab */}
        <button
          onClick={onToggleInspector}
          className={`p-2.5 rounded-xl transition-all relative ${
            isInspectorOpen
              ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title="AST र बाइटकोड निरीक्षक (AST & Bytecode - Toggle)"
        >
          {isInspectorOpen && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-r-full shadow-lg shadow-emerald-500/50" />
          )}
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Run Action Button */}
      <div className="flex flex-col items-center w-full space-y-2">
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`p-2.5 rounded-xl transition-all shadow-md active:scale-95 ${
            isRunning
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
          }`}
          title="प्रोग्राम चलाउनुहोस् (Ctrl+Enter)"
        >
          {isRunning ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </button>
      </div>
    </aside>
  );
};
