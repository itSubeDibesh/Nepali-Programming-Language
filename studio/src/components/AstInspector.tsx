'use client';
import React, { useState, useEffect } from 'react';
import { Layers, X, Cpu, FileCode, Copy, Check, Terminal, Binary } from 'lucide-react';
import { copyToClipboard } from '../lib/clipboard';
import { engine } from '../lib/engine';
import { toNepaliDigits } from '../lib/numbers';

interface AstInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

export const AstInspector: React.FC<AstInspectorProps> = ({ isOpen, onClose, code }) => {
  const [activeTab, setActiveTab] = useState<'bytecode' | 'ast'>('bytecode');
  const [bytecodeText, setBytecodeText] = useState<string>('कम्पाइल गरिँदैछ...');
  const [astText, setAstText] = useState<string>('पार्स गरिँदैछ...');
  const [copied, setCopied] = useState(false);
  const [opcodeCount, setOpcodeCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const updateInspector = async () => {
      try {
        const [disasm, ast] = await Promise.all([
          engine.disassemble(code),
          engine.astDump(code)
        ]);

        if (isMounted) {
          setBytecodeText(disasm);
          setAstText(ast);

          // Calculate approximate opcodes
          const opMatches = disasm.match(/^[0-9]{4}\s+/gm);
          setOpcodeCount(opMatches ? opMatches.length : 0);
        }
      } catch (err: any) {
        if (isMounted) {
          setBytecodeText(`// Disassembly error: ${err.message || err}`);
          setAstText(`// AST error: ${err.message || err}`);
        }
      }
    };

    updateInspector();
    return () => {
      isMounted = false;
    };
  }, [code, isOpen]);

  const handleCopy = async () => {
    const textToCopy = activeTab === 'bytecode' ? bytecodeText : astText;
    await copyToClipboard(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-[420px] border-l border-[#1E293B] bg-[#070B14] flex flex-col h-full z-20 select-none shadow-2xl flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 border-b border-[#1E293B] px-4 flex items-center justify-between bg-[#0B0F19]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Binary className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-100 font-devanagari tracking-wide">
            बाइटकोड र AST निरीक्षक
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            title="क्लिपबोर्डमा प्रतिलिपि गर्नुहोस्"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            title="बन्द गर्नुहोस्"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-[#1E293B] flex items-center space-x-2 bg-[#060911]">
        <button
          onClick={() => setActiveTab('bytecode')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'bytecode'
              ? 'bg-[#0F172A] text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-devanagari">बाइटकोड (Disassembly)</span>
        </button>
        <button
          onClick={() => setActiveTab('ast')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'ast'
              ? 'bg-[#0F172A] text-sky-400 border border-sky-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span className="font-devanagari">AST रूख (Syntax Tree)</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-3 py-1.5 bg-[#0A0E1A] border-b border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div>
          कुल OpCodes: <span className="text-emerald-400 font-semibold font-devanagari">{toNepaliDigits(opcodeCount)}</span>
        </div>
        <div>
          इन्जिन: <span className="text-sky-400">Stack Bytecode VM</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-3 overflow-auto font-mono text-xs bg-[#050810]">
        <pre className="text-slate-200 leading-relaxed whitespace-pre font-mono text-[11px] selection:bg-emerald-500/30 selection:text-white">
          {activeTab === 'bytecode' ? bytecodeText : astText}
        </pre>
      </div>
    </div>
  );
};
