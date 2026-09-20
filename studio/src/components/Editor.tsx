'use client';
import { ensureNepaliExtension, getFileExtensionBadgeColor, handleRenameInputKeyDown } from '../lib/fileUtils';
import React, { useRef, useState, useMemo } from 'react';
import { CodeFile } from '../lib/types';
import { convertWord, transliterateWord } from '../lib/translit';
import { highlightNepaliCode } from '../lib/highlighter';
import { getDocumentationForSymbol, DocItem } from '../lib/docs';
import { toNepaliDigits } from '../lib/numbers';
import { getI18n } from '../lib/i18n';
import { formatNepaliCode } from '../lib/formatter';
import { copyToClipboard, readFromClipboard } from '../lib/clipboard';
import { getAutoSuggestions, SuggestionItem, SuggestionResult } from '../lib/autocomplete';
import { ContextMenu } from './ContextMenu';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';
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
  Columns2,
  Rows2,
  Split,
  CloudDownload,
} from 'lucide-react';
import { CURRENT_STUDIO_VERSION } from '../lib/updateChecker';

interface EditorProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateContent: (id: string, newContent: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onMoveFile?: (fileId: string, targetFolder: string | null) => void;
  onCloseTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onCloseAll?: () => void;
  translitEnabled: boolean;
  onRun: () => void;
  onSave: () => void;
  isSaved: boolean;
  onToggleTranslit?: () => void;
  onOpenAi?: () => void;
  isAiAvailable?: boolean;
  onOpenExplorer?: () => void;
  onOpenUpdate?: () => void;
  hasUpdate?: boolean;
}


function getInitialSplitFileId(currentFiles: CodeFile[]): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('nepali_studio_split_file_id_v1');
    if (saved && currentFiles.some((f) => f.id === saved)) return saved;
  } catch {}
  return null;
}

function getInitialSplitDirection(): 'horizontal' | 'vertical' {
  if (typeof window === 'undefined') return 'horizontal';
  try {
    const saved = localStorage.getItem('nepali_studio_split_dir_v1');
    if (saved === 'vertical' || saved === 'horizontal') return saved;
  } catch {}
  return 'horizontal';
}

export const Editor: React.FC<EditorProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onUpdateContent,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  translitEnabled,
  onRun,
  onSave,
  isSaved,
  onToggleTranslit,
  onOpenAi,
  isAiAvailable = false,
  onOpenExplorer,
  onOpenUpdate,
  hasUpdate = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlighterRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [hoverDoc, setHoverDoc] = useState<{ doc: DocItem; x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [formattedFeedback, setFormattedFeedback] = useState(false);
  const i18n = getI18n(translitEnabled).editor;

  // Custom Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState | null>(null);
  const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // File Renaming state
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const activeContent = activeFile ? activeFile.content : '';

  const allFolderPaths = useMemo(() => {
    const folders = new Set<string>();
    for (const f of files) {
      const parts = f.name.split('/').filter(Boolean);
      if (parts.length > 1) {
        let current = '';
        for (let i = 0; i < parts.length - 1; i++) {
          current = current ? `${current}/${parts[i]}` : parts[i];
          folders.add(current);
        }
      }
    }
    return Array.from(folders).sort();
  }, [files]);

  // Split View State
  const [splitFileId, setSplitFileIdState] = useState<string | null>(() => getInitialSplitFileId(files));
  const [splitDirection, setSplitDirectionState] = useState<'horizontal' | 'vertical'>(getInitialSplitDirection);

  const setSplitFileId = (id: string | null) => {
    setSplitFileIdState(id);
    try {
      if (id) localStorage.setItem('nepali_studio_split_file_id_v1', id);
      else localStorage.removeItem('nepali_studio_split_file_id_v1');
    } catch {}
  };

  const setSplitDirection = (dir: 'horizontal' | 'vertical') => {
    setSplitDirectionState(dir);
    try {
      localStorage.setItem('nepali_studio_split_dir_v1', dir);
    } catch {}
  };
  const splitTextareaRef = useRef<HTMLTextAreaElement>(null);
  const splitHighlighterRef = useRef<HTMLPreElement>(null);
  const splitLineNumbersRef = useRef<HTMLDivElement>(null);

  const splitFile = splitFileId ? files.find((f) => f.id === splitFileId) || null : null;
  const splitContent = splitFile ? splitFile.content : '';

  const handleSplitScroll = () => {
    if (!splitTextareaRef.current) return;
    const { scrollTop, scrollLeft } = splitTextareaRef.current;
    if (splitHighlighterRef.current) {
      splitHighlighterRef.current.scrollTop = scrollTop;
      splitHighlighterRef.current.scrollLeft = scrollLeft;
    }
    if (splitLineNumbersRef.current) {
      splitLineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const handleToggleSplit = () => {
    if (splitFileId) {
      setSplitFileId(null);
    } else {
      const other = files.find((f) => f.id !== activeFileId) || activeFile;
      if (other) {
        setSplitFileId(other.id);
        setSplitDirection('horizontal');
      }
    }
  };

  const handleSplitRight = (file: CodeFile) => {
    setSplitFileId(file.id);
    setSplitDirection('horizontal');
  };

  const handleSplitDown = (file: CodeFile) => {
    setSplitFileId(file.id);
    setSplitDirection('vertical');
  };

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
    const selEnd = textareaRef.current.selectionEnd;
    if (selStart !== undefined && selEnd !== undefined) {
      savedSelectionRef.current = { start: selStart, end: selEnd };
    }
    const linesUpToCursor = text.substring(0, selStart).split('\n');
    const line = linesUpToCursor.length;
    const col = linesUpToCursor[linesUpToCursor.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  // Interactive Hover Documentation for Devanagari identifiers using exact DOM token matching
  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (typeof document === 'undefined' || !highlighterRef.current) return;

    try {
      // Temporarily enable pointer events on highlighter layer for hit-testing
      highlighterRef.current.style.pointerEvents = 'auto';
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      highlighterRef.current.style.pointerEvents = 'none';

      const tokenEl = elements.find((el) => el.hasAttribute('data-token'));

      if (tokenEl) {
        const token = tokenEl.getAttribute('data-token');
        if (token) {
          const doc = getDocumentationForSymbol(token);
          if (doc) {
            setHoverDoc({
              doc,
              x: Math.min(e.clientX + 12, window.innerWidth - 340),
              y: e.clientY + 18,
            });
            return;
          }
        }
      }
    } catch {
      // Fallback
    }
    setHoverDoc(null);
  };

  const handleMouseLeave = () => {
    setHoverDoc(null);
  };

  const phoneticRef = useRef<{ word: string; shown: string; start: number }>({
    word: '',
    shown: '',
    start: 0,
  });

  const splitPhoneticRef = useRef<{ word: string; shown: string; start: number }>({
    word: '',
    shown: '',
    start: 0,
  });

  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number }>({ top: 40, left: 60 });

  const updateSuggestions = (content: string, cursorOffset: number) => {
    const res = getAutoSuggestions(content, cursorOffset, translitEnabled);
    if (res && res.items.length > 0) {
      setSuggestions(res);
      setSelectedSuggestionIndex(0);

      if (textareaRef.current) {
        const textBefore = content.substring(0, cursorOffset);
        const lines = textBefore.split('\n');
        const lineIdx = lines.length - 1;
        const colIdx = lines[lineIdx].length;

        const lineHeight = 24;
        const charWidth = 8.5;
        const paddingTop = 14;
        const paddingLeft = 14;

        const scrollTop = textareaRef.current.scrollTop;
        const scrollLeft = textareaRef.current.scrollLeft;

        const top = paddingTop + (lineIdx + 1) * lineHeight - scrollTop;
        const left = Math.min(
          paddingLeft + colIdx * charWidth - scrollLeft,
          (textareaRef.current.clientWidth || 500) - 290
        );

        setSuggestionPos({
          top: Math.max(top, 30),
          left: Math.max(left, 16),
        });
      }
    } else {
      setSuggestions(null);
    }
  };

  const applySuggestion = (item: SuggestionItem) => {
    if (!suggestions || !activeFile || !textareaRef.current) return;
    const target = textareaRef.current;
    const val = target.value;
    const { replaceStart, replaceEnd } = suggestions;

    const newVal = val.substring(0, replaceStart) + item.insertText + val.substring(replaceEnd);
    onUpdateContent(activeFile.id, newVal);
    setSuggestions(null);
    resetPhonetic();

    const newCursor = replaceStart + (item.cursorOffset ?? item.insertText.length);
    setTimeout(() => {
      target.focus();
      target.selectionStart = target.selectionEnd = newCursor;
      handleCursorMove();
    }, 0);
  };

  const resetPhonetic = () => {
    phoneticRef.current = { word: '', shown: '', start: 0 };
  };

  const resetSplitPhonetic = () => {
    splitPhoneticRef.current = { word: '', shown: '', start: 0 };
  };

  const handleFormatCode = () => {
    if (!activeFile) return;
    const formatted = formatNepaliCode(activeFile.content, translitEnabled);
    onUpdateContent(activeFile.id, formatted);
    setFormattedFeedback(true);
    setTimeout(() => setFormattedFeedback(false), 1500);
  };

  const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // F2: Toggle Transliteration
    if (e.key === 'F2') {
      e.preventDefault();
      resetPhonetic();
      onToggleTranslit?.();
      return;
    }

    // Format Code: Shift+Alt+F or Shift+Option+F or Shift+Cmd+F
    if (
      e.shiftKey &&
      (e.altKey || e.metaKey) &&
      (e.code === 'KeyF' || e.key.toLowerCase() === 'f' || e.key === 'ƒ')
    ) {
      e.preventDefault();
      resetPhonetic();
      handleFormatCode();
      return;
    }

    // Suggestion Navigation & Selection
    if (suggestions && suggestions.items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.items.length) % suggestions.items.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = suggestions.items[selectedSuggestionIndex] || suggestions.items[0];
        if (selected) {
          applySuggestion(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions(null);
        return;
      }
    }

    // Ctrl+Space or Cmd+Space: Trigger suggestions explicitly
    if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
      e.preventDefault();
      const target = textareaRef.current;
      if (target && activeFile) {
        updateSuggestions(activeFile.content, target.selectionStart);
      }
      return;
    }

    // 1. Tab Key Indentation (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      resetPhonetic();
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

    // Reset phonetic buffer on navigation/arrow keys
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'Escape'
    ) {
      resetPhonetic();
      return;
    }

    const k = e.key;

    // 2. Live Phonetic Typing (Roman -> Devanagari as each character is typed)
    if (translitEnabled && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // A. Letter typed -> Live phonetic conversion
      if (k.length === 1 && LETTERS.includes(k)) {
        e.preventDefault();
        const target = textareaRef.current;
        if (!target || !activeFile) return;

        let start = phoneticRef.current.start;
        let oldLen = phoneticRef.current.shown.length;
        const currentVal = target.value;

        if (!phoneticRef.current.word) {
          start = target.selectionStart;
          const end = target.selectionEnd;
          if (start !== end) {
            const cutVal = currentVal.substring(0, start) + currentVal.substring(end);
            phoneticRef.current.start = start;
            phoneticRef.current.word = k;
            const text = convertWord(k);
            phoneticRef.current.shown = text;
            const newVal = cutVal.substring(0, start) + text + cutVal.substring(start);
            onUpdateContent(activeFile.id, newVal);
            const newCursor = start + text.length;
            setTimeout(() => {
              target.selectionStart = target.selectionEnd = newCursor;
              handleCursorMove();
            }, 0);
            return;
          }
          phoneticRef.current.start = start;
          phoneticRef.current.shown = '';
          oldLen = 0;
        }

        phoneticRef.current.word += k;
        const text = convertWord(phoneticRef.current.word);
        const newVal = currentVal.substring(0, start) + text + currentVal.substring(start + oldLen);
        phoneticRef.current.shown = text;
        onUpdateContent(activeFile.id, newVal);
        const newCursor = start + text.length;
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = newCursor;
          handleCursorMove();
          updateSuggestions(newVal, newCursor);
        }, 0);
        return;
      }

      // B. Backspace within active phonetic word
      if (k === 'Backspace' && phoneticRef.current.word) {
        e.preventDefault();
        const target = textareaRef.current;
        if (!target || !activeFile) return;

        const start = phoneticRef.current.start;
        const oldLen = phoneticRef.current.shown.length;
        const currentVal = target.value;
        phoneticRef.current.word = phoneticRef.current.word.slice(0, -1);

        if (phoneticRef.current.word) {
          const text = convertWord(phoneticRef.current.word);
          const newVal = currentVal.substring(0, start) + text + currentVal.substring(start + oldLen);
          phoneticRef.current.shown = text;
          onUpdateContent(activeFile.id, newVal);
          const newCursor = start + text.length;
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = newCursor;
            handleCursorMove();
            updateSuggestions(newVal, newCursor);
          }, 0);
        } else {
          const newVal = currentVal.substring(0, start) + currentVal.substring(start + oldLen);
          resetPhonetic();
          setSuggestions(null);
          onUpdateContent(activeFile.id, newVal);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start;
            handleCursorMove();
          }, 0);
        }
        return;
      }

      // C. Reset phonetic on delimiters / symbols / spaces
      resetPhonetic();

      // D. Direct Digit Transliteration (0-9 -> ०-९)
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        const target = textareaRef.current;
        if (!target || !activeFile) return;
        const nepDigit = toNepaliDigits(k);
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

      // E. Pipe | -> Nepali Purna Biram (।)
      if (k === '|') {
        e.preventDefault();
        const target = textareaRef.current;
        if (!target || !activeFile) return;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;
        const newVal = val.substring(0, start) + '।' + val.substring(end);
        onUpdateContent(activeFile.id, newVal);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
          handleCursorMove();
        }, 0);
        return;
      }
    } else {
      resetPhonetic();
    }
  };

  const handleSplitKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!splitFile) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      resetSplitPhonetic();
      const target = splitTextareaRef.current;
      if (!target) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onUpdateContent(splitFile.id, newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
      return;
    }

    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'Escape'
    ) {
      resetSplitPhonetic();
      return;
    }

    const k = e.key;

    if (translitEnabled && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (k.length === 1 && LETTERS.includes(k)) {
        e.preventDefault();
        const target = splitTextareaRef.current;
        if (!target) return;

        let start = splitPhoneticRef.current.start;
        let oldLen = splitPhoneticRef.current.shown.length;
        const currentVal = target.value;

        if (!splitPhoneticRef.current.word) {
          start = target.selectionStart;
          const end = target.selectionEnd;
          if (start !== end) {
            const cutVal = currentVal.substring(0, start) + currentVal.substring(end);
            splitPhoneticRef.current.start = start;
            splitPhoneticRef.current.word = k;
            const text = convertWord(k);
            splitPhoneticRef.current.shown = text;
            const newVal = cutVal.substring(0, start) + text + cutVal.substring(start);
            onUpdateContent(splitFile.id, newVal);
            const newCursor = start + text.length;
            setTimeout(() => {
              target.selectionStart = target.selectionEnd = newCursor;
            }, 0);
            return;
          }
          splitPhoneticRef.current.start = start;
          splitPhoneticRef.current.shown = '';
          oldLen = 0;
        }

        splitPhoneticRef.current.word += k;
        const text = convertWord(splitPhoneticRef.current.word);
        const newVal = currentVal.substring(0, start) + text + currentVal.substring(start + oldLen);
        splitPhoneticRef.current.shown = text;
        onUpdateContent(splitFile.id, newVal);
        const newCursor = start + text.length;
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = newCursor;
        }, 0);
        return;
      }

      if (k === 'Backspace' && splitPhoneticRef.current.word) {
        e.preventDefault();
        const target = splitTextareaRef.current;
        if (!target) return;

        const start = splitPhoneticRef.current.start;
        const oldLen = splitPhoneticRef.current.shown.length;
        const currentVal = target.value;
        splitPhoneticRef.current.word = splitPhoneticRef.current.word.slice(0, -1);

        if (splitPhoneticRef.current.word) {
          const text = convertWord(splitPhoneticRef.current.word);
          const newVal = currentVal.substring(0, start) + text + currentVal.substring(start + oldLen);
          splitPhoneticRef.current.shown = text;
          onUpdateContent(splitFile.id, newVal);
          const newCursor = start + text.length;
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = newCursor;
          }, 0);
        } else {
          const newVal = currentVal.substring(0, start) + currentVal.substring(start + oldLen);
          resetSplitPhonetic();
          onUpdateContent(splitFile.id, newVal);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = start;
          }, 0);
        }
        return;
      }

      resetSplitPhonetic();

      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        const target = splitTextareaRef.current;
        if (!target) return;
        const nepDigit = toNepaliDigits(k);
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;
        const newVal = val.substring(0, start) + nepDigit + val.substring(end);
        onUpdateContent(splitFile.id, newVal);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + nepDigit.length;
        }, 0);
        return;
      }

      if (k === '|') {
        e.preventDefault();
        const target = splitTextareaRef.current;
        if (!target) return;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;
        const newVal = val.substring(0, start) + '।' + val.substring(end);
        onUpdateContent(splitFile.id, newVal);
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
        }, 0);
        return;
      }
    } else {
      resetSplitPhonetic();
    }
  };

  const handleCopy = async () => {
    if (!activeFile) return;
    const target = textareaRef.current;
    let selected = '';
    if (target) {
      const isSelected = target.selectionStart !== target.selectionEnd;
      const start = isSelected ? target.selectionStart : savedSelectionRef.current.start;
      const end = isSelected ? target.selectionEnd : savedSelectionRef.current.end;
      if (start !== end && start < end) {
        selected = target.value.substring(start, end);
      } else {
        selected = activeFile.content;
      }
    } else {
      selected = activeFile.content;
    }
    await copyToClipboard(selected);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCut = async () => {
    if (!activeFile || !textareaRef.current) return;
    const target = textareaRef.current;
    const isSelected = target.selectionStart !== target.selectionEnd;
    const start = isSelected ? target.selectionStart : savedSelectionRef.current.start;
    const end = isSelected ? target.selectionEnd : savedSelectionRef.current.end;
    if (start === end || start >= end) return;
    const selected = target.value.substring(start, end);
    await copyToClipboard(selected);
    const newVal = target.value.substring(0, start) + target.value.substring(end);
    resetPhonetic();
    onUpdateContent(activeFile.id, newVal);
    setTimeout(() => {
      target.focus();
      target.selectionStart = target.selectionEnd = start;
      handleCursorMove();
    }, 0);
  };

  const handlePaste = async () => {
    if (!activeFile || !textareaRef.current) return;
    const target = textareaRef.current;
    resetPhonetic();
    target.focus();
    let text = await readFromClipboard();
    if (text === null || text === undefined) {
      try {
        const promptVal = window.prompt('यहाँ टाँस्नुहोस् (Paste text here):');
        if (promptVal !== null && promptVal !== '') {
          text = promptVal;
        } else {
          return;
        }
      } catch {
        return;
      }
    }
    const isSelected = target.selectionStart !== target.selectionEnd;
    const start = isSelected ? target.selectionStart : savedSelectionRef.current.start;
    const end = isSelected ? target.selectionEnd : savedSelectionRef.current.end;
    const val = target.value;
    const safeStart = Math.min(start, val.length);
    const safeEnd = Math.min(end, val.length);
    const newVal = val.substring(0, safeStart) + text + val.substring(safeEnd);
    onUpdateContent(activeFile.id, newVal);
    setTimeout(() => {
      target.focus();
      target.selectionStart = target.selectionEnd = safeStart + text.length;
      handleCursorMove();
    }, 0);
  };

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (textareaRef.current) {
      savedSelectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
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
    const file = new Blob(['\uFEFF' + activeFile.content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = ensureNepaliExtension(activeFile.name);
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
    const finalName = ensureNepaliExtension(tempName.trim());
    onRenameFile(id, finalName);
    setEditingNameId(null);
  };

  const linesCount = activeContent.split('\n').length;
  const charsCount = activeContent.length;

  return (
    <div className="flex-1 flex flex-col bg-[#060911] border-r border-[#1E293B] overflow-hidden relative select-none">
      {/* 1. Authentic IDE Tab Bar */}
      <div
        className="h-10 bg-[#0B0F19] border-b border-[#1E293B] flex items-center justify-between px-2 select-none overflow-x-auto no-scrollbar"
      >
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTabContextMenu({ x: e.clientX, y: e.clientY, file });
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
                      else if (e.key === 'Escape') setEditingNameId(null);
                      else handleRenameInputKeyDown(e, translitEnabled, setTempName);
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCloseTab) {
                        onCloseTab(file.id);
                      } else {
                        onDeleteFile(file.id);
                      }
                    }}
                    className="p-0.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors"
                    title={i18n.closeTab}
                  >
                    <X className="w-3 h-3" />
                  </button>
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
            onClick={handleToggleSplit}
            className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
              splitFileId
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'hover:text-slate-200 hover:bg-[#0F172A]'
            }`}
            title={splitFileId ? i18n.closeSplit : i18n.toggleSplit}
          >
            {splitDirection === 'vertical' ? (
              <Rows2 className="w-3.5 h-3.5" />
            ) : (
              <Columns2 className="w-3.5 h-3.5" />
            )}
          </button>
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
            onClick={handleCopy}
            className={`p-1.5 rounded transition-colors text-xs flex items-center space-x-1 ${
              copied
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'hover:text-slate-200 hover:bg-[#0F172A]'
            }`}
            title="कोड प्रतिलिपि गर्नुहोस् (Copy Code - Ctrl+C)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
            title="डाउनलोड गर्नुहोस् (.nep / .nepali / .नेपाली)"
          >
            <Download className="w-3.5 h-3.5" />
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
          <span>{translitEnabled ? toNepaliDigits(linesCount) : linesCount} {translitEnabled ? 'पंक्तिहरू' : 'lines'}</span>
          <span>•</span>
          <span>{translitEnabled ? toNepaliDigits(charsCount) : charsCount} {translitEnabled ? 'अक्षरहरू' : 'chars'}</span>
        </div>
      </div>

      {/* Empty State when no tabs are open */}
      {(!activeFile || files.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#060911] text-center select-none space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/10">
            <FileCode className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="text-base font-bold text-slate-200 font-devanagari">
              {i18n.noOpenTabsTitle || 'कुनै ट्याब खुला छैन'}
            </h3>
            <p className="text-xs text-slate-400 font-devanagari leading-relaxed">
              {i18n.noOpenTabsDesc || 'सम्पादकमा कोड लेख्न नयाँ फाइल सिर्जना गर्नुहोस् वा फाइल अन्वेषकबाट खोल्नुहोस्।'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddFile}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium font-devanagari shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{i18n.newFileAction || 'नयाँ फाइल (+)'}</span>
            </button>
            {onOpenExplorer && (
              <button
                onClick={onOpenExplorer}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs font-medium font-devanagari transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Folder className="w-4 h-4 text-emerald-400" />
                <span>{i18n.openFileAction || 'फाइल अन्वेषक खोल्नुहोस्'}</span>
              </button>
            )}
          </div>
          <div className="pt-4 border-t border-[#1E293B]/60 text-[11px] text-slate-500 font-mono flex items-center space-x-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-400">F5</kbd> Run</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-400">F2</kbd> Language</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-400">Ctrl+S</kbd> Save</span>
          </div>
        </div>
      ) : (
      /* 3. Editor Code Canvas with Custom Right-Click Context Menu and Split View */
      <div
        onContextMenu={handleContextMenu}
        className={`flex-1 flex relative overflow-hidden bg-[#060911] ${
          splitDirection === 'vertical' ? 'flex-col' : 'flex-row'
        }`}
      >
        {/* Primary Editor Pane */}
        <div className="flex-1 flex relative overflow-hidden min-w-0 min-h-0 bg-[#060911]">
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
                  {translitEnabled ? toNepaliDigits(lineNum) : lineNum}
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
                const val = e.target.value;
                const cur = e.target.selectionStart;
                if (activeFile) {
                  onUpdateContent(activeFile.id, val);
                }
                handleCursorMove();
                setTimeout(() => updateSuggestions(val, cur), 10);
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onPaste={() => {
                resetPhonetic();
                setSuggestions(null);
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => {
                resetPhonetic();
                setSuggestions(null);
              }}
              onMouseUp={handleCursorMove}
              onSelect={handleCursorMove}
              onBlur={() => {
                resetPhonetic();
                setTimeout(() => setSuggestions(null), 200);
              }}
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

            {/* Live Syntax Auto-Suggestion IntelliSense Box */}
            {suggestions && suggestions.items.length > 0 && (
              <div
                style={{
                  top: `${suggestionPos.top}px`,
                  left: `${suggestionPos.left}px`,
                  zIndex: 40,
                }}
                className="absolute w-80 max-w-[calc(100%-32px)] max-h-72 bg-[#0A0F1D]/95 border border-emerald-500/40 shadow-2xl rounded-lg overflow-hidden flex flex-col font-sans backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-1.5 bg-[#060911] border-b border-[#1E293B] flex items-center justify-between text-[10px] text-slate-400 select-none">
                  <span className="flex items-center space-x-1 font-semibold text-emerald-400">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>स्वतः सुझाव (IntelliSense)</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Tab / Enter</span>
                </div>

                <div className="overflow-y-auto max-h-48 py-1 divide-y divide-[#1E293B]/40">
                  {suggestions.items.map((item, idx) => {
                    const isSelected = idx === selectedSuggestionIndex;
                    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    let badgeLabel = 'किवर्ड';

                    if (item.category === 'builtin') {
                      badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                      badgeLabel = 'बिल्ट-इन';
                    } else if (item.category === 'function') {
                      badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                      badgeLabel = 'फङ्क्सन';
                    } else if (item.category === 'variable') {
                      badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      badgeLabel = 'चर';
                    } else if (item.category === 'snippet') {
                      badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                      badgeLabel = 'स्निपेट';
                    }

                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySuggestion(item);
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-500/20 border-l-2 border-emerald-400' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-medium flex-shrink-0 ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                          <span className="font-mono text-xs text-slate-100 font-semibold truncate font-devanagari">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono truncate ml-2 max-w-[110px]">
                          {item.detail}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Description Preview Footer */}
                {suggestions.items[selectedSuggestionIndex] && (
                  <div className="px-2.5 py-1.5 bg-[#060A14] border-t border-[#1E293B] text-[10px] text-slate-300 font-devanagari line-clamp-2">
                    {suggestions.items[selectedSuggestionIndex].description}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Split Editor Pane */}
        {splitFile && (
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#060911] ${
            splitDirection === 'vertical'
              ? 'border-t-2 border-[#1E293B]'
              : 'border-l-2 border-[#1E293B]'
          }`}>
            {/* Split Pane Header */}
            <div className="h-8 bg-[#090D18] border-b border-[#1E293B] px-3 flex items-center justify-between text-xs text-slate-300 font-mono select-none flex-shrink-0">
              <div className="flex items-center space-x-2 truncate">
                <FileCode className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold text-slate-200 truncate">{splitFile.name}</span>
                <span className="text-[10px] text-slate-500 font-sans font-devanagari flex-shrink-0">
                  ({splitDirection === 'vertical' ? 'तल विभाजित' : 'दायाँ विभाजित'})
                </span>
              </div>
              <button
                onClick={() => setSplitFileId(null)}
                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title={i18n.closeSplit}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Split Editor Body */}
            <div className="flex-1 flex relative overflow-hidden bg-[#060911]">
              <div
                ref={splitLineNumbersRef}
                className="w-14 bg-[#080C16] border-r border-[#1E293B] py-3 text-right pr-3 select-none overflow-hidden font-mono text-xs leading-6 text-slate-600 font-devanagari"
              >
                {Array.from({ length: Math.max(splitContent.split('\n').length, 1) }).map((_, i) => (
                  <div key={i} className="hover:text-slate-400">
                    {translitEnabled ? toNepaliDigits(i + 1) : (i + 1)}
                  </div>
                ))}
              </div>

              <div className="flex-1 relative overflow-hidden bg-[#060911]">
                <pre
                  ref={splitHighlighterRef}
                  aria-hidden="true"
                  className="absolute inset-0 p-3 m-0 pointer-events-none font-mono text-sm leading-6 whitespace-pre overflow-hidden text-slate-100 select-none font-devanagari"
                  style={{ tabSize: 2 }}
                  dangerouslySetInnerHTML={{
                    __html: highlightNepaliCode(splitContent) + '\n\n',
                  }}
                />

                <textarea
                  ref={splitTextareaRef}
                  value={splitContent}
                  onChange={(e) => {
                    onUpdateContent(splitFile.id, e.target.value);
                  }}
                  onScroll={handleSplitScroll}
                  onKeyDown={handleSplitKeyDown}
                  onPaste={() => resetSplitPhonetic()}
                  onMouseDown={resetSplitPhonetic}
                  onBlur={resetSplitPhonetic}
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
            </div>
          </div>
        )}

        {/* Custom IDE Right-Click Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRun={onRun}
            onSave={handleManualSaveTrigger}
            onFormat={handleFormatCode}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            onSelectAll={handleSelectAll}
            onNewFile={onAddFile}
            onToggleTranslit={() => onToggleTranslit?.()}
            onAskAi={() => onOpenAi?.()}
            translitEnabled={translitEnabled}
            isAiAvailable={isAiAvailable}
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
              {translitEnabled ? hoverDoc.doc.description : hoverDoc.doc.englishDescription || hoverDoc.doc.description}
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
      )}

      {/* 4. Authentic IDE Status Bar */}
      <footer className="h-6 shrink-0 bg-[#080C16] border-t border-[#1E293B] px-3 flex items-center justify-between gap-2 text-[11px] text-slate-400 select-none font-mono whitespace-nowrap overflow-hidden">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="font-devanagari font-semibold">नेपाली</span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400 font-devanagari hidden sm:inline">
            {translitEnabled ? 'रोमन → देवनागरी (F2)' : 'English (F2)'}
          </span>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <span className="hidden xl:inline">UTF-8</span>

          <span className="text-slate-600 hidden xl:inline">|</span>

          <span className="text-slate-500 hidden xl:inline">Spaces: {translitEnabled ? '२' : '2'}</span>
        </div>

        {/* Open Source & Author Credit & Version Info (hide when editor pane is narrow) */}
        <div className="hidden xl:flex items-center space-x-2 text-[10px] text-slate-400 min-w-0">
          <a
            href="https://github.com/itSubeDibesh/Nepali-Programming-Language"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1 text-slate-400 font-devanagari"
            title="खुला स्रोत कोड (Open Source on GitHub)"
          >
            <span>खुला स्रोत</span>
          </a>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500 font-devanagari">निर्माता:</span>
          <a
            href="https://dibe.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors flex items-center gap-0.5 font-devanagari"
            title="दिबेश राज सुवेदी (Dibesh Raj Subedi Portfolio)"
          >
            दिबेश राज सुवेदी (dibe.sh)
          </a>
          {onOpenUpdate && (
            <>
              <span className="text-slate-600">•</span>
              <button
                onClick={onOpenUpdate}
                className="flex items-center space-x-1 hover:text-emerald-400 transition-colors cursor-pointer text-slate-400"
                title="सफ्टवेयर संस्करण र अपडेट जानकारी हेर्नुहोस् (View Version & Update Info)"
              >
                <CloudDownload className={`w-3.5 h-3.5 ${hasUpdate ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className="font-mono text-slate-300 hover:text-white">v{CURRENT_STUDIO_VERSION}</span>
                {hasUpdate && (
                  <span className="px-1 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-devanagari">
                    अपडेट
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="font-devanagari hidden sm:inline">
            {translitEnabled
              ? `पं. ${toNepaliDigits(cursorPos.line)}, स्त. ${toNepaliDigits(cursorPos.col)}`
              : `Ln ${cursorPos.line}, Col ${cursorPos.col}`}
          </span>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <span className="font-devanagari">
            {isSaved ? i18n.statusSaved : i18n.statusUnsaved}
          </span>
        </div>
      </footer>

      {/* Right-Click Tab Context Menu */}
      <TabContextMenu
        menu={tabContextMenu}
        onClose={() => setTabContextMenu(null)}
        onCloseTab={(id) => {
          if (onCloseTab) onCloseTab(id);
          else onDeleteFile(id);
        }}
        onCloseOthers={onCloseOthers}
        onCloseToRight={onCloseToRight}
        onCloseAll={onCloseAll}
        onSplitRight={handleSplitRight}
        onSplitDown={handleSplitDown}
        onRename={startRenaming}
        onDeleteFile={onDeleteFile}
        onMoveFile={onMoveFile}
        availableFolders={allFolderPaths}
        onCopyName={(name) => copyToClipboard(name)}
        onDownload={(file) => {
          const element = document.createElement('a');
          const blob = new Blob(['\uFEFF' + file.content], { type: 'text/plain;charset=utf-8' });
          element.href = URL.createObjectURL(blob);
          element.download = ensureNepaliExtension(file.name);
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }}
        canCloseOthers={files.length > 1}
        canCloseToRight={Boolean(onCloseToRight)}
        canCloseAll={Boolean(onCloseAll)}
        translitEnabled={translitEnabled}
      />
    </div>
  );
};
