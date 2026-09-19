'use client';
import React, { useRef, useState, useEffect } from 'react';
import { CodeFile } from '../lib/types';
import { transliterateWord } from '../lib/translit';
import { FileCode, Plus, X, Copy, Check, Sparkles, AlignLeft } from 'lucide-react';

interface EditorProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  translitEnabled: boolean;
  onRun: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onUpdateContent,
  onAddFile,
  onDeleteFile,
  translitEnabled,
  onRun,
}) => {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);

  // Update cursor line & column
  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.slice(0, textareaRef.current.selectionStart);
    const lines = text.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Keyboard events (F2 toggle handled globally, space/enter transliteration, Tab indent, ⌘Enter run)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }

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

    // Live Transliteration on delimiter key press (Space, ।, Enter, comma, etc.)
    if (translitEnabled && (e.key === ' ' || e.key === 'Enter' || e.key === '।' || e.key === '(' || e.key === ')' || e.key === ',')) {
      const target = textareaRef.current;
      if (!target) return;
      const pos = target.selectionStart;
      const text = target.value;
      
      // Find the start of the current word before cursor
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
          const extraKey = e.key === 'Enter' ? '\n' : e.key;
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

  const lineCount = (activeFile?.content || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden relative">
      {/* File Tabs Header */}
      <div className="h-9 bg-slate-925 border-b border-slate-800 flex items-center justify-between px-2 select-none overflow-x-auto">
        <div className="flex items-center space-x-1">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group flex items-center space-x-2 px-3 py-1 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
                file.id === activeFileId
                  ? 'bg-slate-950 text-slate-100 border-indigo-500 font-medium'
                  : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-300'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono">{file.name}</span>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={onAddFile}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded"
            title="नयाँ फाइल थप्नुहोस्"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded text-xs flex items-center space-x-1"
            title="कोड प्रतिलिपि गर्नुहोस् (Copy)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers */}
        <div className="w-12 bg-slate-950 py-3 select-none text-right pr-3 font-mono text-xs text-slate-600 overflow-hidden leading-6 border-r border-slate-900">
          {lineNumbers.map((num) => (
            <div key={num} className={num === cursorPos.line ? 'text-indigo-400 font-semibold' : ''}>
              {num}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={activeFile?.content || ''}
          onChange={(e) => {
            onUpdateContent(activeFile.id, e.target.value);
            handleCursorMove();
          }}
          onKeyDown={handleKeyDown}
          onClick={handleCursorMove}
          onKeyUp={handleCursorMove}
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-100 font-mono text-sm p-3 leading-6 outline-none resize-none overflow-auto whitespace-pre selection:bg-indigo-500/30 font-devanagari"
          placeholder="// यहाँ नेपाली कोड लेख्नुहोस्..."
        />
      </div>

      {/* Editor Footer Status Bar */}
      <div className="h-6 bg-slate-925 border-t border-slate-850 px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
        <div className="flex items-center space-x-4">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span>{lineCount} lines</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{translitEnabled ? 'नेपाली (F2)' : 'English (F2)'}</span>
          </span>
          <span className="text-slate-500">UTF-8</span>
        </div>
      </div>
    </div>
  );
};
