'use client';
import React, { useRef, useState } from 'react';
import { CodeFile } from '../lib/types';
import { transliterateWord } from '../lib/translit';
import { highlightNepaliCode } from '../lib/highlighter';
import { getDocumentationForSymbol, DocItem } from '../lib/docs';
import { toNepaliDigits } from '../lib/numbers';
import {
  FileCode, Plus, X, Copy, Check, Download, Save,
  Sparkles, HelpCircle, Info
} from 'lucide-react';

interface EditorProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  translitEnabled: boolean;
  onRun: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onUpdateContent,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  translitEnabled,
  onRun,
  onSave,
  isSaved = true,
}) => {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Hover Doc Tooltip State
  const [hoverDoc, setHoverDoc] = useState<{ doc: DocItem; x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize scroll between textarea and syntax highlight backdrop
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    setHoverDoc(null);
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.slice(0, textareaRef.current.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    const clientX = e.clientX;
    const clientY = e.clientY;

    hoverTimeoutRef.current = setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const pos = textarea.selectionStart;
      const text = textarea.value;

      // Extract current word around cursor
      let start = pos;
      while (start > 0 && /[^\s()\[\]{};,।॥"']/.test(text[start - 1])) {
        start--;
      }
      let end = pos;
      while (end < text.length && /[^\s()\[\]{};,।॥"']/.test(text[end])) {
        end++;
      }

      if (start < end) {
        const word = text.substring(start, end);
        const doc = getDocumentationForSymbol(word);
        if (doc) {
          setHoverDoc({
            doc,
            x: Math.min(clientX + 10, window.innerWidth - 340),
            y: Math.min(clientY + 15, window.innerHeight - 220),
          });
          return;
        }
      }
      setHoverDoc(null);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverDoc(null);
  };

  const triggerSave = () => {
    if (onSave) onSave();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setHoverDoc(null);

    // Ctrl+S / Cmd+S: Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      triggerSave();
      return;
    }

    // Ctrl+Enter / Cmd+Enter: Run
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }

    // Tab: 2-space indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = textareaRef.current;
      if (!target) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onUpdateContent(activeFile.id, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
      return;
    }

    // 1. Direct Digit Transliteration (0-9 -> ०-९) when in Nepali mode
    if (
      translitEnabled &&
      /^[0-9]$/.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const target = textareaRef.current;
      if (!target) return;
      const nepDigit = toNepaliDigits(e.key);
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + nepDigit + val.substring(end);
      onUpdateContent(activeFile.id, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + nepDigit.length;
        handleCursorMove();
      }, 0);
      return;
    }

    // 2. Full Word Transliteration on Delimiters
    if (
      translitEnabled &&
      (e.key === ' ' || e.key === 'Enter' || e.key === '।' || e.key === '(' || e.key === ')' || e.key === ',' || e.key === ';' || e.key === '.')
    ) {
      const target = textareaRef.current;
      if (!target) return;
      const pos = target.selectionStart;
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
          const extraKey = e.key === 'Enter' ? '\n' : e.key === '.' ? '।' : e.key;
          const newText = text.substring(0, wordStart) + nepaliWord + extraKey + text.substring(pos);
          onUpdateContent(activeFile.id, newText);
          const newCursorPos = wordStart + nepaliWord.length + extraKey.length;
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = newCursorPos;
            handleCursorMove();
          }, 0);
          return;
        }
      }
    }
  };

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.endsWith('.nep') ? activeFile.name : activeFile.name + '.nep';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startRenaming = (file: CodeFile) => {
    setEditingNameId(file.id);
    setTempName(file.name);
  };

  const finishRenaming = (id: string) => {
    if (tempName.trim()) {
      const finalName = tempName.trim().endsWith('.nep') ? tempName.trim() : tempName.trim() + '.nep';
      onRenameFile(id, finalName);
    }
    setEditingNameId(null);
  };

  const lineCount = (activeFile?.content || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  const charCount = (activeFile?.content || '').length;

  const highlightedHtml = highlightNepaliCode(activeFile?.content || '');

  return (
    <div className="flex-1 flex flex-col bg-[#060911] border-r border-[#1E293B] overflow-hidden relative select-none">
      {/* Tab Bar */}
      <div className="h-10 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-2 select-none overflow-x-auto">
        <div className="flex items-center space-x-1">
          {files.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                onDoubleClick={() => startRenaming(file)}
                className={`group flex items-center space-x-2 px-3.5 py-1.5 rounded-t-lg text-xs cursor-pointer border-t-2 transition-all select-none ${
                  isActive
                    ? 'bg-[#060911] text-emerald-400 border-emerald-500 font-semibold shadow-sm'
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-[#0F172A] hover:text-slate-300'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                
                {editingNameId === file.id ? (
                  <input
                    type="text"
                    value={tempName}
                    autoFocus
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => finishRenaming(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishRenaming(file.id);
                      if (e.key === 'Escape') setEditingNameId(null);
                    }}
                    className="bg-slate-900 text-white font-mono text-xs px-1 py-0.5 rounded border border-emerald-500 outline-none w-24"
                  />
                ) : (
                  <span className="font-mono">{file.name}</span>
                )}

                {!isSaved && isActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="परिवर्तन सुरक्षित गरिएको छैन (Unsaved)" />
                )}

                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-opacity"
                    title="फाइल बन्द गर्नुहोस्"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onAddFile}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-[#0F172A] rounded-md transition-colors"
            title="नयाँ फाइल सिर्जना गर्नुहोस् (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Editor Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={triggerSave}
            className="px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded text-xs flex items-center space-x-1.5 transition-colors"
            title="परियोजना सुरक्षित गर्नुहोस् (Ctrl+S / ⌘S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">बचत</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="यो फाइल डाउनलोड गर्नुहोस् (.nep)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="सबै कोड प्रतिलिपि गर्नुहोस्"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas with Syntax Highlighting Layer */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-sm">
        {/* Line Numbers in Devanagari */}
        <div className="w-12 bg-[#060911] py-3.5 select-none text-right pr-3 font-mono text-xs text-slate-600 overflow-hidden leading-6 border-r border-[#1E293B]">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className={num === cursorPos.line ? 'text-emerald-400 font-bold bg-emerald-500/10 -mr-3 pr-3 rounded-l font-devanagari' : 'font-devanagari'}
            >
              {toNepaliDigits(num)}
            </div>
          ))}
        </div>

        {/* Code Viewports Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Highlight Backdrop */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '<br/>' }}
            className="absolute inset-0 p-3.5 font-mono text-sm leading-6 overflow-hidden pointer-events-none whitespace-pre font-devanagari text-transparent select-none z-0"
          />

          {/* Editable Transparent Textarea */}
          <textarea
            ref={textareaRef}
            value={activeFile?.content || ''}
            onChange={(e) => {
              onUpdateContent(activeFile.id, e.target.value);
              handleCursorMove();
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCursorMove}
            onKeyUp={handleCursorMove}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-emerald-400 font-mono text-sm p-3.5 leading-6 outline-none resize-none overflow-auto whitespace-pre selection:bg-emerald-500/30 font-devanagari z-10"
            placeholder="// यहाँ नेपाली कोड लेख्नुहोस्..."
          />
        </div>
      </div>

      {/* Floating Hover Documentation Card */}
      {hoverDoc && (
        <div
          style={{ top: `${hoverDoc.y}px`, left: `${hoverDoc.x}px` }}
          className="fixed z-50 max-w-sm bg-[#0F172A]/95 backdrop-blur-xl border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl space-y-2 pointer-events-none animate-in fade-in zoom-in-95 text-xs select-none"
        >
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-emerald-400 font-devanagari text-sm">
                {hoverDoc.doc.devanagari}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded">
                {hoverDoc.doc.romanAlias}
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {hoverDoc.doc.category}
            </span>
          </div>

          <div className="bg-[#060911] p-1.5 rounded font-mono text-[11px] text-sky-300">
            {hoverDoc.doc.signature}
          </div>

          <p className="text-[11px] text-slate-200 leading-snug font-devanagari">
            {hoverDoc.doc.description}
          </p>

          <div className="text-[10px] text-slate-400 italic">
            {hoverDoc.doc.englishDescription}
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {showSaveToast && (
        <div className="absolute bottom-10 right-6 z-50 bg-[#0F172A] border border-emerald-500/40 text-emerald-400 px-3.5 py-1.5 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>परियोजना सुरक्षित भयो (Saved to Browser)</span>
        </div>
      )}

      {/* Status Bar */}
      <div className="h-6 bg-[#0B0F19] border-t border-[#1E293B] px-3.5 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
        <div className="flex items-center space-x-4 font-devanagari">
          <span className="text-slate-300 font-semibold">
            पंक्ति {toNepaliDigits(cursorPos.line)}, स्तम्भ {toNepaliDigits(cursorPos.col)}
          </span>
          <span className="text-slate-500">
            {toNepaliDigits(lineCount)} पंक्तिहरू
          </span>
          <span className="text-slate-500">
            {toNepaliDigits(charCount)} वर्णहरू
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-devanagari">{translitEnabled ? 'रोमन → नेपाली (F2)' : 'English (F2)'}</span>
          </span>
          <span className="text-slate-500">UTF-8</span>
          <span className="text-slate-500">Nepali v1.0</span>
        </div>
      </div>
    </div>
  );
};
