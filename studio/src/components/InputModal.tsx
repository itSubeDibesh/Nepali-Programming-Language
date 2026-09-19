'use client';
import React, { useState } from 'react';
import { MessageSquare, CornerDownLeft } from 'lucide-react';
import { PromptRequest } from '../lib/types';

interface InputModalProps {
  request: PromptRequest | null;
}

export const InputModal: React.FC<InputModalProps> = ({ request }) => {
  const [value, setValue] = useState('');

  if (!request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    request.resolve(value);
    setValue('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-925">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-devanagari">
              प्रोग्राम इनपुट आवश्यक (Input Request)
            </h3>
            <p className="text-xs text-slate-400">
              {request.prompt || 'कृपया मान प्रविष्ट गर्नुहोस्:'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="यहाँ उत्तर टाइप गर्नुहोस्..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-devanagari"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all"
            >
              <span>पठाउनुहोस्</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
