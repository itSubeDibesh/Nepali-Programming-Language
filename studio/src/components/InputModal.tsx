'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, CornerDownLeft, Globe } from 'lucide-react';
import { PromptRequest } from '../lib/types';
import { transliterateWord, transliterateText } from '../lib/translit';
import { toNepaliDigits } from '../lib/numbers';

interface InputModalProps {
  request: PromptRequest | null;
}

export const InputModal: React.FC<InputModalProps> = ({ request }) => {
  const [value, setValue] = useState('');
  const [translitEnabled, setTranslitEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request) {
      setValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [request]);

  if (!request) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setTranslitEnabled((prev) => !prev);
      return;
    }

    if (!translitEnabled) return;

    if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const target = inputRef.current;
      if (!target) return;
      const nepDigit = toNepaliDigits(e.key);
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const val = target.value;
      const newVal = val.substring(0, start) + nepDigit + val.substring(end);
      setValue(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + nepDigit.length;
      }, 0);
      return;
    }

    if (e.key === ' ' || e.key === '।' || e.key === ',' || e.key === ';' || e.key === '.') {
      const target = inputRef.current;
      if (!target) return;
      const pos = target.selectionStart || 0;
      const text = target.value;

      let wordStart = pos - 1;
      while (wordStart >= 0 && /[a-zA-Z0-9_]/.test(text[wordStart])) {
        wordStart--;
      }
      wordStart++;

      if (wordStart < pos) {
        const rawWord = text.substring(wordStart, pos);
        const nepaliWord = transliterateWord(rawWord);
        if (nepaliWord !== rawWord) {
          e.preventDefault();
          const extraKey = e.key === '.' ? '।' : e.key;
          const newText = text.substring(0, wordStart) + nepaliWord + extraKey + text.substring(pos);
          setValue(newText);
          const newCursorPos = wordStart + nepaliWord.length + extraKey.length;
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = newCursorPos;
          }, 0);
          return;
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalValue = value;
    if (translitEnabled && value) {
      finalValue = transliterateText(value.trim());
    }
    request.resolve(finalValue || value);
    setValue('');
  };

  const previewValue = translitEnabled && value ? transliterateText(value) : '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-925">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-devanagari">
                प्रोग्राम इनपुट आवश्यक (Input Request)
              </h3>
              <p className="text-xs text-slate-400 font-devanagari mt-0.5">
                {request.prompt || 'कृपया मान प्रविष्ट गर्नुहोस्:'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTranslitEnabled(!translitEnabled)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ` +
              (translitEnabled
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700')}
            title="भाषा मोड परिवर्तन गर्न F2 दबाउनुहोस् (Toggle Nepali / English)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-devanagari">{translitEnabled ? '🇳🇵 नेपाली (F2)' : '🔤 English (F2)'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={translitEnabled ? 'यहाँ टाइप गर्नुहोस् (जस्तै: dibesh, 27)...' : 'Type here...'}
                className="w-full px-4 py-3 bg-slate-950/90 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-devanagari shadow-inner transition-colors"
              />
            </div>

            {translitEnabled && previewValue && previewValue !== value && (
              <div className="flex items-center space-x-1.5 px-2 text-xs text-emerald-400/90 font-devanagari bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-900/40">
                <span className="text-slate-400">नेपाली रूप:</span>
                <span className="font-semibold text-emerald-300">{previewValue}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-slate-500 flex items-center space-x-2 font-devanagari">
              <span>Space/Enter थिच्दा रूपान्तरण हुन्छ</span>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/40 active:scale-95 transition-all"
              >
                <span className="font-devanagari font-medium">पठाउनुहोस्</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};