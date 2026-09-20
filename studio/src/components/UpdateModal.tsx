'use client';
import React from 'react';
import { Sparkles, X, Download, ExternalLink, CheckCircle2, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { UpdateInfo } from '../lib/updateChecker';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm font-devanagari">
                सफ्टवेयर अपडेट (Software Update)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                हालको संस्करण: v{updateInfo?.currentVersion || '1.1.0'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {isChecking ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-300 font-devanagari">
                अपडेट जाँच्दैछ... कृपया प्रतीक्षा गर्नुहोस्
              </p>
            </div>
          ) : updateInfo?.hasUpdate ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getBadgeColor(updateInfo.updateType)}`}>
                  {getTypeLabel(updateInfo.updateType)}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  v{updateInfo.latestVersion}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060911] border border-[#1E293B] space-y-2">
                <div className="text-xs font-semibold text-slate-200 font-devanagari">
                  {updateInfo.releaseName}
                </div>
                <div className="text-xs text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                  {updateInfo.releaseNotes}
                </div>
              </div>

              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span className="font-devanagari">अहिले अपडेट डाउनलोड गर्नुहोस्</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center space-y-3 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-slate-100 font-devanagari">
                  तपाईंको स्टुडियो पूर्ण रूपमा अद्यावधिक छ
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Nepali Studio v{updateInfo?.currentVersion || '1.1.0'} is up to date.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#060911] flex items-center justify-between">
          <button
            onClick={onRecheck}
            disabled={isChecking}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span className="font-devanagari">पुनः जाँच्नुहोस्</span>
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[#1E293B] text-slate-300 hover:text-white hover:bg-[#0F172A] text-xs font-devanagari transition-colors"
          >
            बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};
