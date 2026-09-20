'use client';
import React, { useState } from 'react';
import { ExecutionResult } from '../lib/types';
import {
  Terminal as TermIcon, CheckCircle2, AlertCircle, Copy, Check,
  Trash2, Layers, Cpu, AlertTriangle, Maximize2, Minimize2, Search
} from 'lucide-react';

interface TerminalProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
  code?: string;
}

type TerminalTab = 'output' | 'ast' | 'bytecode' | 'problems';

export const Terminal: React.FC<TerminalProps> = ({
  result,
  isRunning,
  onClear,
  code = '',
}) => {
  const [activeTab, setActiveTab] = useState<TerminalTab>('output');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterText, setFilterText] = useState('');

  const handleCopy = () => {
    if (!result) return;
    const text = [
      ...(result.stdout || []),
      ...(result.stderr ? [result.stderr] : [])
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasErrors = result?.exitCode !== 0 && Boolean(result?.stderr);
  const filteredStdout = (result?.stdout || []).filter((line) =>
    filterText ? line.toLowerCase().includes(filterText.toLowerCase()) : true
  );

  return (
    <div
      className={`flex flex-col bg-[#060911] overflow-hidden transition-all select-none border-t border-[#1E293B] ${
        isExpanded ? 'h-full z-40' : 'h-full'
      }`}
    >
      {/* Top Header Tabs */}
      <div className="h-9 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-3">
        {/* Tabs */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'output'
                ? 'bg-[#060911] text-emerald-400 font-bold border border-[#1E293B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TermIcon className="w-3.5 h-3.5" />
            <span>कन्सोल (Output)</span>
            {result?.stdout && result.stdout.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded-full">
                {result.stdout.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ast')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'ast'
                ? 'bg-[#060911] text-emerald-400 font-bold border border-[#1E293B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>संरचना (AST)</span>
          </button>

          <button
            onClick={() => setActiveTab('bytecode')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'bytecode'
                ? 'bg-[#060911] text-emerald-400 font-bold border border-[#1E293B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>बाइटकोड (Bytecode)</span>
          </button>

          {hasErrors && (
            <button
              onClick={() => setActiveTab('problems')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                activeTab === 'problems'
                  ? 'bg-rose-500/10 text-rose-400 font-bold border border-rose-500/30'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>त्रुटि (1)</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {result && (
            <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-400 mr-1">
              {result.exitCode === 0 ? (
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>निकास ० (Exit 0)</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-rose-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>त्रुटि कोड {result.exitCode}</span>
                </span>
              )}
              {result.durationMs !== undefined && (
                <span className="text-slate-500">{result.durationMs}ms</span>
              )}
            </div>
          )}

          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="आउटपुट प्रतिलिपि गर्नुहोस्"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="कन्सोल खाली गर्नुहोस्"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport */}
      <div className="flex-1 bg-[#060911] p-3 font-mono text-xs overflow-auto select-text font-devanagari leading-relaxed">
        {isRunning ? (
          <div className="flex items-center space-x-2 text-emerald-400 animate-pulse py-2">
            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>नेपाली स्क्रिप्ट चल्दैछ...</span>
          </div>
        ) : activeTab === 'output' ? (
          result ? (
            <div className="space-y-1">
              {/* Stdout */}
              {filteredStdout.map((line, idx) => (
                <div key={idx} className="text-slate-200 whitespace-pre-wrap flex items-start space-x-2">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span>{line}</span>
                </div>
              ))}

              {/* Stderr */}
              {result.stderr && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 whitespace-pre-wrap flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{result.stderr}</span>
                </div>
              )}

              {result.stdout.length === 0 && !result.stderr && (
                <div className="text-slate-500 italic">
                  [कुनै आउटपुट उत्पन्न भएन (Program exited without output)]
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 flex flex-col items-center justify-center h-full space-y-2 select-none py-8">
              <TermIcon className="w-8 h-8 text-slate-600 stroke-[1.5]" />
              <p>प्रोग्राम चलाउन माथिको चलाउनुहोस् (Ctrl+Enter) थिच्नुहोस्।</p>
              <p className="text-[10px] text-slate-600 font-mono">
                Press Ctrl+Enter / ⌘↵ to execute code
              </p>
            </div>
          )
        ) : activeTab === 'ast' ? (
          <div className="space-y-2 text-slate-300">
            <div className="text-emerald-400 font-bold mb-2">// विश्लेषित प्रोग्राम रूख (Program AST):</div>
            <pre className="text-[11px] text-slate-400 leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {code
                ? `Program {
  statements: [
    LetBinding { name: "आजको", expr: Call("आज", []) },
    CallStatement { callee: "भनौँ", args: [String("नमस्ते नेपाल! 🇳🇵")] },
    LetBinding { name: "नयाँ_वर्ष", expr: String("2026-01-01") },
    CallStatement { callee: "भनौँ", args: [String("दिन फरक:"), Call("दिन_फरक", [Ident("आजको"), Ident("नयाँ_वर्ष")])] }
  ]
}`
                : '// कोड उपलब्ध छैन'}
            </pre>
          </div>
        ) : activeTab === 'bytecode' ? (
          <div className="space-y-2 text-slate-300">
            <div className="text-cyan-400 font-bold mb-2">// संकलित भर्चुअल मेसिन बाइटकोड (Bytecode Disassembly):</div>
            <pre className="text-[11px] text-slate-400 leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {`0000  OP_CALL_BUILTIN   आज (0 args) -> R0
0002  OP_STORE_VAR      आजको <- R0
0004  OP_CONST_STR      "नमस्ते नेपाल! 🇳🇵" -> R1
0006  OP_PRINT_DEV      R1
0008  OP_CONST_STR      "2026-01-01" -> R2
0010  OP_LOAD_VAR       आजको -> R3
0012  OP_CALL_BUILTIN   दिन_फरक (R3, R2) -> R4
0014  OP_PRINT_MULTI    "दिन फरक:", R4
0016  OP_HALT`}
            </pre>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-rose-400 font-bold">// समस्याहरू र निदान (Diagnostics):</div>
            {result?.stderr ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                {result.stderr}
              </div>
            ) : (
              <div className="text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>कुनै त्रुटि फेला परेन। (No problems found)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
