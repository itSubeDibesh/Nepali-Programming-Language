'use client';
import React from 'react';
import {
  FolderOpen,
  BookOpen,
  HelpCircle,
  Sparkles,
  Terminal,
  Play,
} from 'lucide-react';
import { RunMode } from '../lib/types';
import { getI18n } from '../lib/i18n';

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
  translitEnabled?: boolean;
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
  translitEnabled = true,
}) => {
  const i18n = getI18n(translitEnabled).activityBar;

  const handleTabClick = (tab: ActiveSidebarTab) => {
    if (activeTab === tab) {
      onSelectTab(null);
    } else {
      onSelectTab(tab);
    }
  };

  return (
    <div className="w-12 bg-[#060911] border-r border-[#1E293B] flex flex-col items-center py-3 justify-between select-none z-20 flex-shrink-0">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col items-center space-y-2 w-full">
        {/* Files Tab */}
        <button
          onClick={() => handleTabClick('files')}
          className={`p-2.5 rounded-xl transition-all relative group ${
            activeTab === 'files'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title={i18n.files}
        >
          <FolderOpen className="w-5 h-5" />
          {activeTab === 'files' && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r-full" />
          )}
        </button>

        {/* Examples Catalog Tab */}
        <button
          onClick={() => handleTabClick('examples')}
          className={`p-2.5 rounded-xl transition-all relative group ${
            activeTab === 'examples'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title={i18n.examples}
        >
          <BookOpen className="w-5 h-5" />
          {activeTab === 'examples' && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r-full" />
          )}
        </button>

        {/* Cheatsheet / Reference Tab */}
        <button
          onClick={() => handleTabClick('cheatsheet')}
          className={`p-2.5 rounded-xl transition-all relative group ${
            activeTab === 'cheatsheet'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title={i18n.docs}
        >
          <HelpCircle className="w-5 h-5" />
          {activeTab === 'cheatsheet' && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r-full" />
          )}
        </button>
      </div>

      {/* Bottom Utility Tools (AI, Inspector, Run) */}
      <div className="flex flex-col items-center space-y-2 w-full">
        {/* AI Assistant Toggle */}
        <button
          onClick={onToggleAi}
          className={`p-2.5 rounded-xl transition-all relative group ${
            isAiOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title={i18n.ai}
        >
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Bottom Inspector / Terminal Toggle */}
        <button
          onClick={onToggleInspector}
          className={`p-2.5 rounded-xl transition-all relative group ${
            isInspectorOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
          }`}
          title={i18n.terminal}
        >
          <Terminal className="w-5 h-5" />
        </button>

        {/* Quick Mini Run Trigger */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`p-2.5 rounded-xl transition-all ${
            isRunning
              ? 'bg-emerald-950 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 shadow-sm'
          }`}
          title={i18n.run}
        >
          <Play className={`w-4 h-4 fill-emerald-400 ${isRunning ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
