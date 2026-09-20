'use client';
import React from 'react';
import { X, Download, ExternalLink, CheckCircle2, CloudDownload, RefreshCw, Cpu, Layers, HardDrive, ShieldCheck, Sparkles, Terminal, Code2 } from 'lucide-react';
import { CURRENT_STUDIO_VERSION, UpdateInfo } from '../lib/updateChecker';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  onRecheck: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking,
  onRecheck
}) => {
  if (!isOpen) return null;

  const currentVersion = updateInfo?.currentVersion || CURRENT_STUDIO_VERSION;

  const getBadgeColor = (type: UpdateInfo['updateType']) => {
    switch (type) {
      case 'patch':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'minor':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'major':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getTypeLabel = (type: UpdateInfo['updateType']) => {
    switch (type) {
      case 'patch':
        return 'प्याच अपडेट (Patch / Bugfix)';
      case 'minor':
        return 'नयाँ सुविधा अपडेट (Minor Feature Update)';
      case 'major':
        return 'प्रमुख संस्करण (Major Release)';
      default:
        return 'नवीनतम संस्करण';
    }
  };

  const getPlatformName = () => {
    if (typeof window === 'undefined') return 'अज्ञात (Unknown)';
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'macOS Darwin (Apple Silicon / Intel)';
    if (ua.includes('Linux')) return 'Linux OS (Debian / Ubuntu / Arch)';
    if (ua.includes('Win')) return 'Microsoft Windows (x64)';
    return 'वेब क्लाइन्ट (Web Browser)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shadow-emerald-500/20">
              <CloudDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base font-devanagari flex items-center gap-2">
                <span>सफ्टवेयर संस्करण तथा अपडेट</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  v{currentVersion}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-devanagari">
                नेपाली प्रोग्रामिङ भाषा स्टुडियो (Nepali Studio IDE)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            title="बन्द गर्नुहोस्"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Status Banner */}
          {isChecking ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-3 bg-[#060911] border border-[#1E293B] rounded-xl p-4">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300 font-devanagari">
                अपडेट जाँच्दैछ... कृपया प्रतीक्षा गर्नुहोस्
              </p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <div className="space-y-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getBadgeColor(updateInfo.updateType)}`}>
                  {getTypeLabel(updateInfo.updateType)}
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  v{updateInfo.latestVersion} उपलब्ध छ
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-100 font-devanagari">
                  {updateInfo.releaseName}
                </div>
                <div className="text-xs text-slate-300 max-h-28 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed bg-[#060911]/80 p-2.5 rounded-lg border border-[#1E293B]">
                  {updateInfo.releaseNotes}
                </div>
              </div>

              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
              >
                <CloudDownload className="w-4 h-4" />
                <span className="font-devanagari">नयाँ अपडेट डाउनलोड गर्नुहोस् (Download Update)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex items-center space-x-3.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-200">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-100 font-devanagari flex items-center gap-2">
                  <span>तपाईंको स्टुडियो पूर्ण रूपमा अद्यावधिक छ</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">STABLE</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Nepali Studio v{currentVersion} — हालको नवीनतम स्थिर संस्करण सक्रिय छ।
                </p>
              </div>
            </div>
          )}

          {/* Full Detailed Version & System Specification Card */}
          <div className="p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] space-y-3">
            <div className="font-semibold text-slate-200 font-devanagari text-xs flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>प्रणाली तथा विस्तृत संस्करण विवरण (System Specifications)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">स्टुडियो संस्करण:</span>
                <span className="text-slate-200 font-bold">v{currentVersion}</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">कोर प्रोग्रामिङ इन्जिन:</span>
                <span className="text-emerald-400 font-semibold">nepali-core v0.1.0</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">वेब-एसेम्बली रनटाइम:</span>
                <span className="text-slate-200">nepali-wasm v0.1.0</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">कम्पाइलर मोडहरू:</span>
                <span className="text-slate-200">Tree-walk / VM / LLVM</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">सिस्टम प्लेटफर्म:</span>
                <span className="text-slate-200 text-[11px] truncate block" title={getPlatformName()}>
                  {getPlatformName()}
                </span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">एआई निदान इन्जिन:</span>
                <span className="text-emerald-400">Neural AST Diagnoser</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">फाइलसिस्टम ब्रिज:</span>
                <span className="text-slate-200">HTML5 FSA / Tauri IPC</span>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B]/70">
                <span className="text-slate-500 block text-[10px] font-devanagari">लिपि र अंक प्रणाली:</span>
                <span className="text-slate-200">देवनागरी + रोमन + अंक</span>
              </div>
            </div>
          </div>

          {/* Key Architecture Features */}
          <div className="p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] space-y-2 text-xs">
            <div className="font-semibold text-slate-300 font-devanagari text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>संस्करणका मुख्य विशेषताहरू (Active Features & Modules)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400 font-devanagari">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>शून्य-अवस्था वर्कस्पेस (० फाइल/फोल्डर)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>हार्डड्राइभ सिधा लिङ्किङ (Native Folder Sync)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>डाइरेक्टरी ड्र्याग-एन्ड-ड्रप मोबिलिटी</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>एआई सिन्ट्याक्स सुधार तथा त्रुटि निदान</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>नेटिभ OS क्लिपबोर्ड ब्रिज (Cmd+C / Cmd+V)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>वास्तविक समयको बाइटकोड विच्छेदन</span>
              </div>
            </div>
          </div>

          {/* Open Source & Author Info */}
          <div className="p-3 rounded-xl bg-[#060911]/60 border border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 font-devanagari">
            <div>
              <span className="text-slate-500">इजाजतपत्र: </span>
              <span className="text-slate-300 font-mono font-medium">MIT License (Open Source)</span>
            </div>
            <div>
              <span className="text-slate-500">निर्माता: </span>
              <a
                href="https://dibe.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                दिबेश राज सुवेदी (dibe.sh)
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={onRecheck}
              disabled={isChecking}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-50 transition-colors py-1.5 px-2.5 rounded-lg border border-[#1E293B] hover:bg-[#0F172A]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span className="font-devanagari">अपडेट पुनः जाँच्नुहोस्</span>
            </button>
            <a
              href="https://github.com/itSubeDibesh/Nepali-Programming-Language/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="font-devanagari">सबै रिलिजहरू</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#1E293B] text-slate-200 hover:text-white hover:bg-[#0F172A] text-xs font-devanagari font-medium transition-colors"
          >
            बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};

