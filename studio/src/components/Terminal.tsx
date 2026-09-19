'use client';
import React, { useState } from 'react';
import { Terminal as TermIcon, Trash2, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { ExecutionResult } from '../lib/types';

interface TerminalProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ result, isRunning, onClear }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    const text = [
      ...(result.stdout || []),
      result.stderr ? `Error: ${result.stderr}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden select-text">
      {/* Terminal Header */}
      <div className="h-9 bg-slate-925 border-b border-slate-800 flex items-center justify-between px-3 select-none">
        <div className="flex items-center space-x-2">
          <TermIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-semibold text-slate-200">
            आउटपुट (Terminal)
          </span>
          {result && (
            <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-slate-850 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              <span>{result.durationMs}ms</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded"
            title="प्रतिलिपि गर्नुहोस्"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded"
            title="सफा गर्नुहोस् (Clear)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 p-4 font-mono text-xs overflow-auto font-devanagari space-y-1 leading-relaxed">
        {isRunning && (
          <div className="flex items-center space-x-2 text-amber-400 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>नेपाली प्रोग्राम चल्दैछ...</span>
          </div>
        )}

        {!isRunning && !result && (
          <div className="text-slate-600 italic">
            प्रोग्राम चलाउन माथिको 'चलाउनुहोस्' बटन थिच्नुहोस् वा ⌘+Enter दबाउनुहोस्।
          </div>
        )}

        {result && (
          <>
            {result.stdout && result.stdout.length > 0 ? (
              result.stdout.map((line, idx) => (
                <div key={idx} className="text-emerald-300 whitespace-pre-wrap">
                  {line}
                </div>
              ))
            ) : !result.stderr && (
              <div className="text-slate-500 italic">(कार्यक्रम सफलतापूर्वक सम्पन्न भयो, कुनै आउटपुट छैन)</div>
            )}

            {result.stderr && (
              <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="whitespace-pre-wrap">{result.stderr}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
