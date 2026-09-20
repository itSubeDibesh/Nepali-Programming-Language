'use client';
import React, { useRef, useState } from 'react';
import { CodeFile } from '../lib/types';
import { transliterateWord } from '../lib/translit';
import { highlightNepaliCode } from '../lib/highlighter';
import { getDocumentationForSymbol, DocItem } from '../lib/docs';
import { toNepaliDigits } from '../lib/numbers';
import { formatNepaliCode } from '../lib/formatter';
import { ContextMenu } from './ContextMenu';
import {
  FileCode,
  Plus,
  X,
  Copy,
  Check,
  Download,
  Save,
  Pencil,
  ChevronRight,
  Folder,
  AlignLeft,
  Sparkles,
} from 'lucide-react';

interface EditorProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateContent: (id: string, newContent: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  translitEnabled: boolean;
  onRun: () => void;
  onSave: () => void;
  isSaved: boolean;
  onToggleTranslit?: () => void;
  onOpenAi?: () => void;
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
  isSaved,
  onToggleTranslit,
  onOpenAi,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlighterRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [hoverDoc, setHoverDoc] = useState<{ doc: DocItem; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [formattedFeedback, setFormattedFeedback] = useState(false);

  // Custom Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // File Renaming state
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const activeContent = activeFile ? activeFile.content : '';

  // Synchronize scrolling between textarea, syntax highlighter, and line numbers
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = scrollTop;
      highlighterRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const linesUpToCursor = text.substring(0, selStart).split('\n');
    const line = linesUpToCursor.length;
    const col = linesUpToCursor[linesUpToCursor.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  // Interactive Hover Documentation for Devanagari identifiers
  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;
    const rect = textareaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lineHeight = 24;
    const charWidth = 8.5;
    const lineIndex = Math.floor((y + textareaRef.current.scrollTop - 12) / lineHeight);
    const colIndex = Math.floor((x + textareaRef.current.scrollLeft - 16) / charWidth);

    const lines = activeContent.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      let start = colIndex;
      let end = colIndex;
      while (start > 0 && /[^\s(),.;।+\-*/=><{}]/.test(line[start - 1])) {
        start--;
      }
      while (end < line.length && /[^\s(),.;।+\-*/=><{}]/.test(line[end])) {
        end++;
      }
      if (start < end) {
        const symbol = line.substring(start, end);
        const doc = getDocumentationForSymbol(symbol);
        if (doc) {
          setHoverDoc({
            doc,
            x: Math.min(e.clientX + 10, window.innerWidth - 320),
            y: e.clientY + 15,
          });
          return;
        }
      }
    }
    setHoverDoc(null);
  };

  const handleMouseLeave = () => {
    setHoverDoc(null);
  };

  const handleFormatCode = () => {
    if (!activeFile) return;
    const formatted = formatNepaliCode(activeFile.content);
    onUpdateContent(activeFile.id, formatted);
    setFormattedFeedback(true);
    setTimeout(() => setFormattedFeedback(false), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Format Code: Shift+Alt+F or Shift+Option+F
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      handleFormatCode();
      return;
    }

    // 1. Tab Key Indentation (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = textareaRef.current;
      if (!target || !activeFile) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onUpdateContent(activeFile.id, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
        handleCursorMove();
      }, 0);
      return;
    }

    // 2. Direct Digit Transliteration (0-9 -> ०-९) when in Nepali mode
    if (
      translitEnabled &&
      /^[0-9]$/.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const target = textareaRef.current;
      if (!target || !activeFile) return;
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

    // 3. Full Word Transliteration on Delimiters
    if (
      translitEnabled &&
      (e.key === ' ' || e.key === 'Enter' || e.key === '।' || e.key === '(' || e.key === ')' || e.key === ',' || e.key === ';' || e.key === '.')
    ) {
      const target = textareaRef.current;
      if (!target || !activeFile) return;
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
      const target = textareaRef.current;
      const selected = target && target.selectionStart !== target.selectionEnd
        ? target.value.substring(target.selectionStart, target.selectionEnd)
        : activeFile.content;
      navigator.clipboard.writeText(selected);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCut = () => {
    if (!activeFile || !textareaRef.current) return;
    const target = textareaRef.current;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start === end) return;
    const selected = target.value.substring(start, end);
    navigator.clipboard.writeText(selected);
    const newVal = target.value.substring(0, start) + target.value.substring(end);
    onUpdateContent(activeFile.id, newVal);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start;
      handleCursorMove();
    }, 0);
  };

  const handlePaste = async () => {
    if (!activeFile || !textareaRef.current) return;
    try {
      const text = await navigator.clipboard.readText();
      const target = textareaRef.current;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + text + val.substring(end);
      onUpdateContent(activeFile.id, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + text.length;
        handleCursorMove();
      }, 0);
    } catch {
      // Ignore clipboard permission issues
    }
  };

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleManualSaveTrigger = () => {
    onSave();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const element = document.createElement('a');
    const file = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = activeFile.name.endsWith('.nep') ? activeFile.name : `${activeFile.name}.nep`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const startRenaming = (file: CodeFile) => {
    setEditingNameId(file.id);
    setTempName(file.name);
  };

  const finishRenaming = (id: string) => {
    if (!tempName.trim()) {
      setEditingNameId(null);
      return;
    }
    let finalName = tempName.trim();
    if (!finalName.endsWith('.nep')) {
      finalName += '.nep';
    }
    onRenameFile(id, finalName);
    setEditingNameId(null);
  };

  const linesCount = activeContent.split('\n').length;
  const charsCount = activeContent.length;

  return (
    <div className="flex-1 flex flex-col bg-[#060911] border-r border-[#1E293B] overflow-hidden relative select-none">
      {/* 1. Authentic IDE Tab Bar */}
      <div className="h-10 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-2 select-none overflow-x-auto">
        <div className="flex items-center space-x-0.5 min-w-0">
          {files.map((file) => {
            const isActive = file.id === activeFileId;
            const isEditing = editingNameId === file.id;

            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startRenaming(file);
                }}
                className={`group relative flex items-center space-x-2 px-3.5 py-2 text-xs cursor-pointer transition-all select-none border-r border-[#1E293B]/60 ${
                  isActive
                    ? 'bg-[#060911] text-emerald-400 font-semibold shadow-sm border-t-2 border-t-emerald-500'
                    : 'bg-[#0B0F19] text-slate-400 hover:bg-[#0F172A] hover:text-slate-200 border-t-2 border-t-transparent'
                }`}
              >
                <FileCode
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                  }`}
                />

                {isEditing ? (
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
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-950 text-white font-mono text-xs px-1.5 py-0.5 rounded border border-emerald-500 outline-none w-28 shadow-inner"
                  />
                ) : (
                  <span className="font-mono truncate max-w-[140px]">{file.name}</span>
                )}

                {/* Unsaved status dot */}
                {!isSaved && isActive && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                    title="परिवर्तनहरू सुरक्षित गरिएका छैनन् (Unsaved changes)"
                  />
                )}

                {/* Custom Action Buttons on Tab */}
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenaming(file);
                      }}
                      className="p-0.5 rounded hover:bg-slate-700/60 text-slate-500 hover:text-emerald-300 transition-colors"
                      title="नाम परिवर्तन गर्नुहोस् (Rename)"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.id);
                      }}
                      className="p-0.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors"
                      title="फाइल बन्द गर्नुहोस् (Close Tab)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* "+ New Tab" Button */}
          <button
            onClick={onAddFile}
            className="p-1.5 ml-1 text-slate-400 hover:text-emerald-400 hover:bg-[#0F172A] rounded-lg transition-colors"
            title="नयाँ फाइल सिर्जना गर्नुहोस् (New Tab)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right Toolbar in Tab Bar */}
        <div className="flex items-center space-x-1 text-slate-400">
          <button
            onClick={handleFormatCode}
            className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
              formattedFeedback
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'hover:text-slate-200 hover:bg-[#0F172A]'
            }`}
            title="कोड ढाँचा मिलाउनुहोस् (Format Code - Shift+Alt+F)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleManualSaveTrigger}
            className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
              savedFeedback
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'hover:text-slate-200 hover:bg-[#0F172A]'
            }`}
            title="फाइल सुरक्षित गर्नुहोस् (Save - Ctrl+S)"
          >
            {savedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
          </button>

          {activeFile && (
            <button
              onClick={() => startRenaming(activeFile)}
              className="p-1.5 hover:text-emerald-400 hover:bg-[#0F172A] rounded transition-colors"
              title="सक्रिय फाइलको नाम बदल्नुहोस् (Rename File)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleDownload}
            className="p-1.5 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="डाउनलोड गर्नुहोस् (.nep)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 hover:text-slate-200 hover:bg-[#0F172A] rounded transition-colors"
            title="कोड प्रतिलिपि गर्नुहोस् (Copy Code)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. IDE Breadcrumbs & Context Bar */}
      <div className="h-7 bg-[#060911] border-b border-[#1E293B]/70 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center space-x-1.5 font-devanagari">
          <Folder className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">परियोजना</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-200 font-mono font-medium">{activeFile?.name || 'main.nep'}</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-emerald-400/90 font-mono">⚡ मुख्य कार्यक्रम</span>
        </div>

        <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-devanagari">
          <span>{toNepaliDigits(linesCount)} पंक्तिहरू</span>
          <span>•</span>
          <span>{toNepaliDigits(charsCount)} अक्षरहरू</span>
        </div>
      </div>

      {/* 3. Editor Code Canvas with Custom Right-Click Context Menu */}
      <div
        onContextMenu={handleContextMenu}
        className="flex-1 flex relative overflow-hidden bg-[#060911]"
      >
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="w-14 bg-[#080C16] border-r border-[#1E293B] py-3 text-right pr-3 select-none overflow-hidden font-mono text-xs leading-6 text-slate-600 font-devanagari"
        >
          {Array.from({ length: Math.max(linesCount, 1) }).map((_, i) => {
            const lineNum = i + 1;
            const isCurrentLine = cursorPos.line === lineNum;
            return (
              <div
                key={i}
                className={`transition-colors ${
                  isCurrentLine
                    ? 'text-emerald-400 font-bold bg-emerald-500/10 -mr-3 pr-3 border-r-2 border-emerald-500'
                    : 'hover:text-slate-400'
                }`}
              >
                {toNepaliDigits(lineNum)}
              </div>
            );
          })}
        </div>

        {/* Textarea & Syntax Highlight Layer */}
        <div className="flex-1 relative overflow-hidden bg-[#060911]">
          {/* Syntax Highlighter Underlay */}
          <pre
            ref={highlighterRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 pointer-events-none font-mono text-sm leading-6 whitespace-pre overflow-hidden text-slate-100 select-none font-devanagari"
            style={{ tabSize: 2 }}
            dangerouslySetInnerHTML={{
              __html: highlightNepaliCode(activeContent) + '\n\n',
            }}
          />

          {/* Interactive Textarea Input */}
          <textarea
            ref={textareaRef}
            value={activeContent}
            onChange={(e) => {
              if (activeFile) {
                onUpdateContent(activeFile.id, e.target.value);
              }
              handleCursorMove();
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCursorMove}
            onKeyUp={handleCursorMove}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            style={{
              tabSize: 2,
              WebkitTextFillColor: 'transparent',
            }}
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent font-mono text-sm leading-6 resize-none outline-none border-none whitespace-pre overflow-auto font-devanagari caret-emerald-400 selection:bg-emerald-500/30"
          />
        </div>

        {/* Custom IDE Right-Click Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRun={onRun}
            onFormat={handleFormatCode}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            onSelectAll={handleSelectAll}
            onToggleTranslit={() => onToggleTranslit?.()}
            onAskAi={() => onOpenAi?.()}
            translitEnabled={translitEnabled}
          />
        )}

        {/* Hover Documentation Floating Tooltip */}
        {hoverDoc && !contextMenu && (
          <div
            style={{ top: hoverDoc.y, left: hoverDoc.x }}
            className="fixed z-50 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 pointer-events-none animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-emerald-400 font-mono text-sm font-devanagari">
                {hoverDoc.doc.devanagari || hoverDoc.doc.name}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                {hoverDoc.doc.category}
              </span>
            </div>

            <p className="text-slate-200 font-devanagari leading-relaxed">
              {hoverDoc.doc.description}
            </p>

            {hoverDoc.doc.signature && (
              <div className="bg-slate-950 px-2 py-1 rounded font-mono text-[11px] text-indigo-300 border border-slate-800">
                <code>{hoverDoc.doc.signature}</code>
              </div>
            )}

            {hoverDoc.doc.example && (
              <div className="text-[10px] text-slate-400 font-mono">
                <span className="text-slate-500">उदाहरण:</span> {hoverDoc.doc.example}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Authentic IDE Status Bar */}
      <footer className="h-6 bg-[#080C16] border-t border-[#1E293B] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none font-mono">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="font-devanagari font-semibold">नेपाली (Nepali)</span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400 font-devanagari">
            {translitEnabled ? '🇳🇵 रोमन → देवनागरी (F2)' : '🔤 English (F2)'}
          </span>

          <span className="text-slate-600">|</span>

          <span>UTF-8</span>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <span className="text-slate-500 hidden sm:inline">Spaces: २</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="font-devanagari">
            पं. {toNepaliDigits(cursorPos.line)}, स्त. {toNepaliDigits(cursorPos.col)}
          </span>

          <span className="text-slate-600">|</span>

          <span className="font-devanagari">
            {isSaved ? 'सञ्चित (Saved)' : 'परिवर्तित (Modified)'}
          </span>
        </div>
      </footer>
    </div>
  );
};
