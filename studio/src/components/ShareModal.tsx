'use client';
import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, MessageCircle, Send, Facebook, Code2 } from 'lucide-react';
import { encodeCodeToUrl, PUBLIC_STUDIO_URL } from '../lib/share';
import { copyToClipboard } from '../lib/clipboard';

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
  const [copiedMd, setCopiedMd] = useState(false);

  if (!isOpen) return null;

  const shareUrl = encodeCodeToUrl(code, fileName);
  const shareTitle = `नेपाली कोड: ${fileName} — Nepali Studio`;
  const shareText = `नेपाली प्रोग्रामिङ भाषामा लेखिएको कोड हेर्नुहोस् र चलाउनुहोस्: ${shareUrl}`;

  const handleCopy = async () => {
    await copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyMarkdown = async () => {
    const md = `[![Nepali Studio](${PUBLIC_STUDIO_URL}/opengraph-image)](${shareUrl})\n\n[नेपाली कोड हेर्नुहोस् (Open in Nepali Studio)](${shareUrl})`;
    await copyToClipboard(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2500);
  };

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-[#1E293B] max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-emerald-400">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 font-devanagari">
                प्रोग्राम साझेदारी गर्नुहोस् (Share Code)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{fileName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed font-devanagari">
          यो लिङ्क जोकोहीसँग साझेदारी गर्नुहोस्। लिङ्क खोल्दा तपाईंको कोड सिधै नेपाली स्टुडियोमा लोड भई तुरुन्त कम्पाइल र रन हुनेछ।
        </p>

        {/* Share Link Box */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>सार्वजनिक लिङ्क (Public URL)</span>
            <span className="text-emerald-400 lowercase">nepali.dibe.sh</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#060911] border border-[#1E293B] text-slate-200 font-mono text-xs px-3 py-2 rounded-lg outline-none truncate select-all focus:border-emerald-500/60"
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

        {/* Social Share One-Click Buttons */}
        <div className="space-y-2 pt-2 border-t border-[#1E293B]/70">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            सामाजिक सञ्जालमा सेयर गर्नुहोस् (1-Click Share)
          </span>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {/* WhatsApp */}
            <button
              onClick={() =>
                openShareWindow(
                  `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
                )
              }
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-emerald-400 border border-[#1E293B] transition-colors"
              title="WhatsApp मा सेयर गर्नुहोस्"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">WhatsApp</span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={() =>
                openShareWindow(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    shareTitle
                  )}&url=${encodeURIComponent(shareUrl)}`
                )
              }
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-sky-400 border border-[#1E293B] transition-colors"
              title="X (Twitter) मा सेयर गर्नुहोस्"
            >
              <span className="font-bold text-[11px]">𝕏</span>
              <span className="text-[11px] font-medium">Post</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() =>
                openShareWindow(
                  `https://t.me/share/url?url=${encodeURIComponent(
                    shareUrl
                  )}&text=${encodeURIComponent(shareTitle)}`
                )
              }
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-blue-400 border border-[#1E293B] transition-colors"
              title="Telegram मा सेयर गर्नुहोस्"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Telegram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() =>
                openShareWindow(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
                )
              }
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-indigo-400 border border-[#1E293B] transition-colors"
              title="Facebook मा सेयर गर्नुहोस्"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Facebook</span>
            </button>
          </div>
        </div>

        {/* Copy Markdown Embed */}
        <div className="pt-2">
          <button
            onClick={handleCopyMarkdown}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-[#060911] hover:bg-[#0F172A] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-mono transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{copiedMd ? '✓ Markdown Embed कोड प्रतिलिपि भयो' : 'GitHub / Markdown Embed कोड प्रतिलिपि'}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="bg-[#060911] border border-[#1E293B] rounded-xl p-3 flex items-start space-x-2.5 text-[11px] text-slate-400 font-devanagari">
          <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            कोड URL को ह्यासमा सुरक्षित रूपमा इन्कोड गरिएको हुन्छ। सर्भरमा कुनै पनि व्यक्तिगत डाटा भण्डारण हुँदैन।
          </span>
        </div>
      </div>
    </div>
  );
};
