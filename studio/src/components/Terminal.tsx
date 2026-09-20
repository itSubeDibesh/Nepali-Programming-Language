'use client';
import React, { useState, useEffect } from 'react';
import { ExecutionResult } from '../lib/types';
import { getI18n } from '../lib/i18n';
import { toNepaliDigits } from '../lib/numbers';
import {
  Terminal as TermIcon, CheckCircle2, AlertCircle, Copy, Check,
  Trash2, Layers, Cpu, AlertTriangle, ChevronDown, ChevronUp, X
} from 'lucide-react';

import { copyToClipboard } from '../lib/clipboard';
import { engine } from '../lib/engine';

interface TerminalProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
  onClose: () => void;
  isOpen: boolean;
  code?: string;
  translitEnabled?: boolean;
}

type TerminalTab = 'output' | 'ast' | 'bytecode' | 'problems';


function getInitialTerminalTab(): TerminalTab {
  if (typeof window === 'undefined') return 'output';
  try {
    const saved = localStorage.getItem('nepali_studio_terminal_tab_v1') as TerminalTab;
    if (saved && ['output', 'ast', 'bytecode', 'problems'].includes(saved)) return saved;
  } catch {}
  return 'output';
}

export const Terminal: React.FC<TerminalProps> = ({
  result,
  isRunning,
  onClear,
  onClose,
  isOpen,
  code = '',
  translitEnabled = true,
}) => {
  const [activeTab, setActiveTabState] = useState<TerminalTab>(getInitialTerminalTab);

  const setActiveTab = (tab: TerminalTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('nepali_studio_terminal_tab_v1', tab);
    } catch {}
  };
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [astText, setAstText] = useState<string>('विश्लेषण गरिँदैछ...');
  const [bytecodeText, setBytecodeText] = useState<string>('कम्पाइल गरिँदैछ...');
  const [isLoadingAst, setIsLoadingAst] = useState(false);
  const [isLoadingBytecode, setIsLoadingBytecode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!code || !code.trim()) {
      setAstText('// कोड खाली छ (Code is empty)');
      setBytecodeText('// कोड खाली छ (Code is empty)');
      return;
    }

    let isMounted = true;
    const fetchInspection = async () => {
      try {
        if (activeTab === 'ast') {
          setIsLoadingAst(true);
          const ast = await engine.astDump(code);
          if (isMounted) {
            setAstText(ast);
            setIsLoadingAst(false);
          }
        } else if (activeTab === 'bytecode') {
          setIsLoadingBytecode(true);
          const disasm = await engine.disassemble(code);
          if (isMounted) {
            setBytecodeText(disasm);
            setIsLoadingBytecode(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          if (activeTab === 'ast') {
            setAstText(`// AST त्रुटि: ${err.message || err}`);
            setIsLoadingAst(false);
          }
          if (activeTab === 'bytecode') {
            setBytecodeText(`// बाइटकोड त्रुटि: ${err.message || err}`);
            setIsLoadingBytecode(false);
          }
        }
      }
    };

    fetchInspection();
    return () => {
      isMounted = false;
    };
  }, [code, activeTab, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    let text = '';
    if (activeTab === 'output') {
      if (!result) return;
      text = [
        ...(result.stdout || []),
        ...(result.stderr ? [result.stderr] : [])
      ].join('\n');
    } else if (activeTab === 'ast') {
      text = astText;
    } else if (activeTab === 'bytecode') {
      text = bytecodeText;
    } else if (activeTab === 'problems') {
      text = result?.stderr || 'कुनै त्रुटि फेला परेन।';
    }
    if (!text) return;
    await copyToClipboard(text);
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
              {/* Stdout */}
              {(result.stdout || []).map((line, idx) => (
                <div key={idx} className="text-slate-200 whitespace-pre-wrap flex items-start space-x-2">
                  <span className="text-emerald-500 select-none">&gt;</span>
                  <span>{line}</span>
                </div>
              ))}

              {/* Stderr (exact message, no mangling) */}
              {result.stderr && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 whitespace-pre-wrap flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{result.stderr}</span>
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
            <div className="flex items-center justify-between">
              <div className="text-emerald-400 font-bold text-xs">// विश्लेषित प्रोग्राम रूख (Abstract Syntax Tree):</div>
              {isLoadingAst && (
                <div className="text-[11px] text-emerald-400 flex items-center space-x-1 animate-pulse">
                  <div className="w-2.5 h-2.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>पार्स गरिँदैछ...</span>
                </div>
              )}
            </div>
            <pre className="text-[11px] text-slate-300 font-mono leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {astText}
            </pre>
          </div>
        ) : activeTab === 'bytecode' ? (
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between">
              <div className="text-cyan-400 font-bold text-xs">// संकलित भर्चुअल मेसिन बाइटकोड (Bytecode Disassembly):</div>
              {isLoadingBytecode && (
                <div className="text-[11px] text-cyan-400 flex items-center space-x-1 animate-pulse">
                  <div className="w-2.5 h-2.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>संकलन गरिँदैछ...</span>
                </div>
              )}
            </div>
            <pre className="text-[11px] text-cyan-300/90 font-mono leading-5 whitespace-pre overflow-x-auto bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
              {bytecodeText}
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
