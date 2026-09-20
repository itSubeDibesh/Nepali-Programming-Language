'use client';
import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, Sparkles } from 'lucide-react';
import { encodeCodeToUrl } from '../lib/share';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  fileName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  code,
  fileName,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const shareUrl = encodeCodeToUrl(code, fileName);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0F172A] border border-[#1E293B] max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Share2 className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-100 font-devanagari">
              प्रोग्राम साझेदारी गर्नुहोस् (Share Code)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">
          यो लिङ्क जोकोहीसँग साझेदारी गर्नुहोस्। लिङ्क खोल्दा तपाईंको नेपाली कोड सिधै स्टुडियोमा लोड हुनेछ।
        </p>

        {/* Share Link Box */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            साझेदारी योग्य लिङ्क (Shareable URL)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#060911] border border-[#1E293B] text-slate-300 font-mono text-xs px-3 py-2 rounded-lg outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'प्रतिलिपि भयो' : 'प्रतिलिपि'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#060911] border border-[#1E293B] rounded-xl p-3 flex items-start space-x-2.5 text-[11px] text-slate-400">
          <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            कोड URL को ह्यासमा सुरक्षित रूपमा इन्कोड गरिएको हुन्छ। सर्भरमा कुनै पनि व्यक्तिगत डाटा भण्डारण हुँदैन।
          </span>
        </div>
      </div>
    </div>
  );
};
