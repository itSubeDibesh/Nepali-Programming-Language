'use client';
import React from 'react';
import {
  Download,
  Github,
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
import { getI18n } from '../lib/i18n';
import { getAvailableModes, isDesktopApp } from '../lib/env';

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
  isAiAvailable?: boolean;
  isInspectorOpen?: boolean;
  onOpenDownload?: () => void;
  onOpenUpdate?: () => void;
  hasUpdate?: boolean;
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
  isAiAvailable = false,
  isInspectorOpen,
  onOpenDownload,
  onOpenUpdate,
  hasUpdate,
}) => {
  const i18n = getI18n(translitEnabled).navbar;

  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#0B0F19]/90 backdrop-blur-md px-3 md:px-4 flex items-center justify-between select-none z-30 flex-shrink-0">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSidebarOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] border-[#1E293B]'
            }`}
            title="टगल साइडबार (Ctrl+B)"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          {/* Authentic Nepal Flag Icon */}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm shadow-inner shadow-emerald-500/10">
            ने
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide text-white flex items-center space-x-1.5">
              <span>{i18n.title}</span>
              <button
                onClick={onOpenUpdate}
                className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium border border-emerald-500/30 transition-all flex items-center space-x-1"
                title="सफ्टवेयर अपडेट जाँच्नुहोस्"
              >
                <span>v1.1.0</span>
                {hasUpdate && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Run Button & Mode Switcher */}
      <div className="flex items-center space-x-2">
        {/* Big Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg font-medium text-xs md:text-sm transition-all shadow-lg active:scale-95 ${
            isRunning
              ? 'bg-emerald-800 text-slate-300 cursor-not-allowed opacity-75'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-emerald-500/20 hover:shadow-emerald-500/30'
          }`}
          title="प्रोग्राम चलाउनुहोस् (Ctrl+Enter)"
        >
          <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
          <span className="font-devanagari">{isRunning ? i18n.running : i18n.run}</span>
        </button>

        {/* Runtime Engine Switcher */}
        {(() => {
          const available = getAvailableModes();
          if (available.length <= 1) return null;
          return (
            <div className="hidden sm:flex items-center bg-[#060911] rounded-lg p-0.5 border border-[#1E293B]">
              {available.includes('os') && (
                <button
                  onClick={() => onModeChange('os')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    mode === 'os'
                      ? 'bg-[#0F172A] text-emerald-400 font-medium shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="पूर्ण नेटिभ ओएस मोड (SQLite, File I/O, Subprocesses सक्षम)"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{i18n.modeOs}</span>
                </button>
              )}

              {available.includes('wasm') && (
                <button
                  onClick={() => onModeChange('wasm')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    mode === 'wasm'
                      ? 'bg-[#0F172A] text-emerald-400 font-medium shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="ब्राउजर-आधारित WASM इन्जिन (शून्य नेटवर्क विलम्ब)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{i18n.modeWasm}</span>
                </button>
              )}

              {available.includes('sandbox') && (
                <button
                  onClick={() => onModeChange('sandbox')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                    mode === 'sandbox'
                      ? 'bg-[#0F172A] text-emerald-400 font-medium shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="सुरक्षित स्यान्डबक्स मोड"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{i18n.modeSandbox}</span>
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Right: Transliteration Toggle, Drawers & Share */}
      <div className="flex items-center space-x-2">
        {/* Devanagari Translit Switch */}
        <button
          onClick={onToggleTranslit}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors font-medium ${
            translitEnabled
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm'
              : 'bg-[#060911] border-[#1E293B] text-slate-400 hover:text-slate-200'
          }`}
          title="नेपाली / English टाइप मोड (F2)"
        >
          <span className="font-mono text-xs font-bold text-emerald-400">क</span>
          <span className="hidden lg:inline font-devanagari">
            {translitEnabled ? i18n.translitNepali : i18n.translitEnglish}
          </span>
        </button>

        {/* AI Assistant Toggle */}
        {isAiAvailable && (
          <button
            onClick={onToggleAi}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              isAiOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#060911] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
            title="एआई सहायक (AI Assistant)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline font-devanagari">{i18n.aiAssistant}</span>
          </button>
        )}

        {/* Output Terminal Toggle */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              isInspectorOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#060911] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
            title="कन्सोल आउटपुट प्यानल"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-devanagari">{i18n.terminal}</span>
          </button>
        )}

        {/* Download Desktop App (Web) or Check Updates (Desktop) */}
        {isDesktopApp() ? (
          onOpenUpdate && (
            <button
              onClick={onOpenUpdate}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors shadow-sm font-medium ${
                hasUpdate
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 animate-pulse'
                  : 'bg-[#060911] hover:bg-[#0F172A] border-[#1E293B] text-slate-300'
              }`}
              title="सफ्टवेयर अपडेट जाँच गर्नुहोस् (Check for Updates)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-devanagari">
                {hasUpdate ? 'नयाँ अपडेट' : 'अपडेट'}
              </span>
            </button>
          )
        ) : (
          onOpenDownload && (
            <button
              onClick={onOpenDownload}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs transition-colors shadow-sm font-medium"
              title="डेस्कटप एप डाउनलोड गर्नुहोस् (Download Desktop App)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-devanagari">डाउनलोड</span>
            </button>
          )
        )}
        {/* GitHub Repository Link */}
        <a
          href="https://github.com/itSubeDibesh/Nepali-Programming-Language"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#060911] border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#0F172A] text-xs transition-colors"
          title="खुला स्रोत कोड (Open Source on GitHub)"
        >
          <Github className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden xl:inline font-mono">GitHub</span>
        </a>
        {/* Share Button */}
        <button
          onClick={onOpenShare}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#060911] border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#0F172A] text-xs transition-colors"
          title="कोड साझा गर्नुहोस् (Share Code)"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline font-devanagari">{i18n.share}</span>
        </button>
      </div>
    </header>
  );
};
