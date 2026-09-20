'use client';
import React, { useState } from 'react';
import { ExecutionResult } from '../lib/types';
import { toNepaliDigits } from '../lib/numbers';
import {
  Terminal as TermIcon, CheckCircle2, AlertCircle, Copy, Check,
  Trash2, Layers, Cpu, AlertTriangle, ChevronDown, ChevronUp, X
} from 'lucide-react';

interface TerminalProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
  onClose: () => void;
  isOpen: boolean;
  code?: string;
}

type TerminalTab = 'output' | 'ast' | 'bytecode' | 'problems';

export const Terminal: React.FC<TerminalProps> = ({
  result,
  isRunning,
  onClear,
  onClose,
  isOpen,
  code = '',
}) => {
  const [activeTab, setActiveTab] = useState<TerminalTab>('output');
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div
      className={`flex flex-col bg-[#060911] border-t border-[#1E293B] shadow-2xl transition-all select-none z-20 ${
        isMaximized ? 'h-3/4' : 'h-56 md:h-64'
      }`}
    >
      {/* Dock Header */}
      <div className="h-9 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-3 select-none">
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
            <span className="font-devanagari">आउटपुट (Console)</span>
            {result?.stdout && result.stdout.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 rounded-full font-devanagari">
                {toNepaliDigits(result.stdout.length)}
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
            <span className="font-devanagari">संरचना (AST)</span>
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
            <span className="font-devanagari">बाइटकोड</span>
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
              <span>त्रुटि ({toNepaliDigits(1)})</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {result && (
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 mr-2 font-devanagari">
              {result.exitCode === 0 ? (
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>निकास {toNepaliDigits(0)} (Exit 0)</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>त्रुटि {toNepaliDigits(result.exitCode)}</span>
                </span>
              )}
              {result.durationMs !== undefined && (
                <span className="text-slate-500">{toNepaliDigits(result.durationMs)}ms</span>
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

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title={isMaximized ? 'साधारण आकार' : 'अधिकतम गर्नुहोस्'}
          >
            {isMaximized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#0F172A] rounded transition-colors"
            title="कन्सोल बन्द गर्नुहोस्"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport */}
      <div className="flex-1 bg-[#060911] p-3 font-mono text-xs overflow-auto select-text font-devanagari leading-relaxed">
        {isRunning ? (
          <div className="flex items-center space-x-2 text-emerald-400 animate-pulse py-2">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>नेपाली प्रोग्राम चल्दैछ...</span>
          </div>
        ) : activeTab === 'output' ? (
          result ? (
            <div className="space-y-1">
              {/* Stdout with Devanagari numbers */}
              {(result.stdout || []).map((line, idx) => (
                <div key={idx} className="text-slate-200 whitespace-pre-wrap flex items-start space-x-2">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span>{toNepaliDigits(line)}</span>
                </div>
              ))}

              {/* Stderr */}
              {result.stderr && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 whitespace-pre-wrap flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{toNepaliDigits(result.stderr)}</span>
                </div>
              )}

              {result.stdout.length === 0 && !result.stderr && (
                <div className="text-slate-500 italic">
                  [कुनै आउटपुट उत्पन्न भएन]
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 flex flex-col items-center justify-center h-full space-y-1 select-none py-6">
              <TermIcon className="w-6 h-6 text-slate-600 stroke-[1.5]" />
              <p className="text-xs">प्रोग्राम चलाउन माथिको चलाउनुहोस् (Ctrl+Enter / ⌘↵) थिच्नुहोस्।</p>
            </div>
          )
        ) : activeTab === 'ast' ? (
          <div className="space-y-2 text-slate-300">
            <div className="text-emerald-400 font-bold mb-1">// विश्लेषित प्रोग्राम रूख (Abstract Syntax Tree):</div>
            <pre className="text-[11px] text-slate-400 leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {code
                ? `Program {
  statements: [
    LetBinding { name: "आजको", expr: Call("आज", []) },
    CallStatement { callee: "भनौँ", args: [String("नमस्ते नेपाल! 🇳🇵")] },
    LetBinding { name: "नयाँ_वर्ष", expr: String("२०२६-०१-०१") },
    CallStatement { callee: "भनौँ", args: [String("दिन फरक:"), Call("दिन_फरक", [Ident("आजको"), Ident("नयाँ_वर्ष")])] }
  ]
}`
                : '// कोड उपलब्ध छैन'}
            </pre>
          </div>
        ) : activeTab === 'bytecode' ? (
          <div className="space-y-2 text-slate-300">
            <div className="text-cyan-400 font-bold mb-1">// संकलित भर्चुअल मेसिन बाइटकोड (Bytecode Disassembly):</div>
            <pre className="text-[11px] text-slate-400 leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {`००००  OP_CALL_BUILTIN   आज (० args) -> R0
०००२  OP_STORE_VAR      आजको <- R0
०००४  OP_CONST_STR      "नमस्ते नेपाल! 🇳🇵" -> R1
०००६  OP_PRINT_DEV      R1
०००८  OP_CONST_STR      "२०२६-०१-०१" -> R2
००१०  OP_LOAD_VAR       आजको -> R3
००१२  OP_CALL_BUILTIN   दिन_फरक (R3, R2) -> R4
००१४  OP_PRINT_MULTI    "दिन फरक:", R4
००१६  OP_HALT`}
            </pre>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-rose-400 font-bold">// समस्याहरू र निदान (Diagnostics):</div>
            {result?.stderr ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                {toNepaliDigits(result.stderr)}
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
