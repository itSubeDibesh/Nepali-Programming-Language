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
  FileCode2,
  HelpCircle,
  Cpu,
  FolderArchive,
} from 'lucide-react';
import { CURRENT_STUDIO_VERSION, UpdateInfo, checkForAppUpdates } from '@/lib/updateChecker';
import { toNepaliDigits } from '../lib/numbers';
import { copyToClipboard } from '../lib/clipboard';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  translitEnabled?: boolean;
  updateInfo?: UpdateInfo | null;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  translitEnabled = true,
  updateInfo: initialUpdateInfo,
}) => {
  const [detectedOs, setDetectedOs] = useState<'mac' | 'windows' | 'linux'>('mac');
  const [copiedCli, setCopiedCli] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(initialUpdateInfo || null);
  const [isLoadingRelease, setIsLoadingRelease] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('win')) setDetectedOs('windows');
      else if (ua.includes('linux')) setDetectedOs('linux');
      else setDetectedOs('mac');
    }
  }, []);

  useEffect(() => {
    if (isOpen && !updateInfo) {
      setIsLoadingRelease(true);
      checkForAppUpdates()
        .then((info) => setUpdateInfo(info))
        .catch(() => {})
        .finally(() => setIsLoadingRelease(false));
    }
  }, [isOpen, updateInfo]);

  if (!isOpen) return null;

  const versionTag = updateInfo?.latestVersion || CURRENT_STUDIO_VERSION;
  const releasesBase = 'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases';
  const latestReleaseUrl = updateInfo?.downloadUrl || `${releasesBase}/latest`;

  // Find specific platform assets if available in release
  const assets = updateInfo?.assets || [];
  const macAsset = assets.find((a) => a.name.endsWith('.dmg') || a.name.includes('mac') || a.name.includes('darwin'));
  const winAsset = assets.find((a) => a.name.endsWith('.msi') || a.name.endsWith('.exe') || a.name.includes('windows'));
  const linuxDebAsset = assets.find((a) => a.name.endsWith('.deb') || a.name.endsWith('.AppImage') || a.name.includes('linux'));

  const macDownloadUrl = macAsset?.downloadUrl || `${releasesBase}/download/v${versionTag}/Nepali.Studio-${versionTag}-macOS.dmg`;
  const winDownloadUrl = winAsset?.downloadUrl || `${releasesBase}/download/v${versionTag}/nepali-windows-x86_64.msi`;
  const linuxDownloadUrl = linuxDebAsset?.downloadUrl || `${releasesBase}/download/v${versionTag}/nepali-linux-x86_64.deb`;

  const cliCommand =
    'curl -fsSL https://raw.githubusercontent.com/itSubeDibesh/Nepali-Programming-Language/main/scripts/install.sh | bash';

  const handleCopyCli = async () => {
    await copyToClipboard(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

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
                  v{versionTag}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-devanagari">
                पूर्ण अफलाइन, डिस्क फाइल सेभ, र नेटिभ सिस्टम इन्टरप (Tauri + Rust + SQLite + Python)
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
        <div className="p-6 overflow-y-auto space-y-5">
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
                  Apple Silicon (M1-M4) र Intel. .dmg इन्स्टलर।
                </p>
              </div>
              <div className="mt-4 space-y-1.5">
                <a
                  href={macDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.DMG डाउनलोड</span>
                </a>
              </div>
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
              <div className="mt-4 space-y-1.5">
                <a
                  href={winDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.MSI / .EXE डाउनलोड</span>
                </a>
              </div>
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
              <div className="mt-4 space-y-1.5">
                <a
                  href={linuxDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.DEB / AppImage</span>
                </a>
              </div>
            </div>
          </div>

          {/* Direct Releases Page Link Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center space-x-2 text-slate-300 font-devanagari">
              <FileCode2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>सबै बाइनरीहरू र रिलीज नोटहरू GitHub मा उपलब्ध छन्:</span>
            </div>
            <a
              href={latestReleaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-medium transition-colors border border-emerald-500/30 text-xs font-mono flex-shrink-0"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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

          {/* macOS Gatekeeper tip */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold font-devanagari">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>macOS मा एप खुल्न समस्या भएमा (Gatekeeper Note):</span>
            </div>
            <p className="text-slate-400 font-mono text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all">
              xattr -cr /Applications/&quot;Nepali Studio.app&quot;
            </p>
          </div>

          {/* Features highlight */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-devanagari">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>१००% अफलाइन र सुरक्षित (No tracking)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>नेटिभ एआई सपोर्ट (AI Ask, Listen, Speak)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>नेटिभ बाइटकोड VM र डिस्क I/O</span>
            </div>
            <div className="flex items-center space-x-2">
              <FolderArchive className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
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
              href={releasesBase}
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
