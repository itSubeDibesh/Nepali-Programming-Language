'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Terminal,
  Apple,
  Monitor,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  translitEnabled?: boolean;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  translitEnabled = true,
}) => {
  const [detectedOs, setDetectedOs] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [copiedCli, setCopiedCli] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('win')) setDetectedOs('windows');
      else if (ua.includes('linux')) setDetectedOs('linux');
      else setDetectedOs('mac');
    }
  }, []);

  if (!isOpen) return null;

  const cliCommand =
    'curl -fsSL https://raw.githubusercontent.com/itSubeDibesh/Nepali-Programming-Language/main/scripts/install.sh | bash';

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const releasesUrl =
    'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B0F19] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#060911]/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
              न
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2 font-devanagari">
                <span>नेपाली स्टुडियो डेस्कटप डाउनलोड</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-normal border border-emerald-500/30">
                  v1.0.0
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-devanagari">
                पूर्ण अफलाइन, डिस्क फाइल सेव, र तीव्र नेटिभ गति (Native OS, SQLite, Python/Rust)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* OS Download Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* macOS */}
            <div
              className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                detectedOs === 'mac'
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-[#060911] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {detectedOs === 'mac' && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-full font-mono">
                  तपाईंको OS
                </span>
              )}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-200">
                  <Apple className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">macOS</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-devanagari">
                  Apple Silicon (M1-M4) &amp; Intel. .dmg इन्स्टलर।
                </p>
              </div>
              <a
                href={`${releasesUrl}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.DMG डाउनलोड</span>
              </a>
            </div>

            {/* Windows */}
            <div
              className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                detectedOs === 'windows'
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-[#060911] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {detectedOs === 'windows' && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-full font-mono">
                  तपाईंको OS
                </span>
              )}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-200">
                  <Monitor className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Windows</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-devanagari">
                  Windows 10 / 11 (64-bit). .msi / .exe इन्स्टलर।
                </p>
              </div>
              <a
                href={`${releasesUrl}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.MSI डाउनलोड</span>
              </a>
            </div>

            {/* Linux */}
            <div
              className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                detectedOs === 'linux'
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-[#060911] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {detectedOs === 'linux' && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-full font-mono">
                  तपाईंको OS
                </span>
              )}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-200">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">Linux</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-devanagari">
                  Ubuntu/Debian (.deb) र Universal (.AppImage).
                </p>
              </div>
              <a
                href={`${releasesUrl}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.DEB / AppImage</span>
              </a>
            </div>
          </div>

          {/* CLI One-Liner Install */}
          <div className="p-4 rounded-xl bg-[#060911] border border-[#1E293B] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-devanagari">कमाण्ड लाइन (CLI) बाट सिधै इन्स्टल गर्नुहोस्</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">macOS / Linux / WSL</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-emerald-400 overflow-x-auto">
              <span className="truncate selection:bg-emerald-500/40">{cliCommand}</span>
              <button
                onClick={handleCopyCli}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1E293B] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-[11px] transition-colors flex-shrink-0"
                title="कपी गर्नुहोस्"
              >
                {copiedCli ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>कपी भयो!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>कपी</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Features highlight */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-devanagari">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>१००% अफलाइन र गोप्य (No tracking)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>स्थानीय डिस्क फाइलहरू खोल्ने र सेभ गर्ने</span>
            </div>
          </div>
        </div>

        {/* Footer with Creator & Open Source Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-[#1E293B] bg-[#060911]/80 gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400 text-[11px] font-devanagari">
            <span className="text-slate-500">निर्माता:</span>
            <a
              href="https://dibe.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition-colors"
            >
              दिबेश राज सुवेदी (dibe.sh)
            </a>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono">MIT License</span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 text-slate-300 hover:text-emerald-400 transition-colors font-medium font-mono text-[11px]"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              बन्द गर्नुहोस्
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
