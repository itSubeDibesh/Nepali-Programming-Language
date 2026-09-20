'use client';
import React, { useState } from 'react';
import { ActiveSidebarTab } from './ActivityBar';
import { CodeFile, RecipeItem } from '../lib/types';
import { EXAMPLES } from '../lib/examples';
import { DOCS_CATALOG } from '../lib/docs';
import {
  FileCode,
  Plus,
  Trash2,
  RefreshCw,
  X,
  BookOpen,
  FolderOpen,
  HelpCircle,
  Code,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight,
  Pencil,
  Check,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveSidebarTab;
  onClose: () => void;
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onSelectExample: (ex: RecipeItem) => void;
  onInsertCode: (snippet: string) => void;
  onResetWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onSelectExample,
  onInsertCode,
  onResetWorkspace,
}) => {
  const [docSearch, setDocSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState<string>('');

  if (!activeTab) {
    return null;
  }

  const startRename = (file: CodeFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const finishRename = (id: string) => {
    if (!editingFileName.trim()) {
      setEditingFileId(null);
      return;
    }
    let finalName = editingFileName.trim();
    if (!finalName.endsWith('.nep')) {
      finalName += '.nep';
    }
    if (onRenameFile) {
      onRenameFile(id, finalName);
    }
    setEditingFileId(null);
  };

  const filteredExamples = EXAMPLES.filter((ex) => {
    if (selectedCategory === 'all') return true;
    return ex.category === selectedCategory;
  });

  const filteredDocs = DOCS_CATALOG.filter((doc) => {
    if (!docSearch.trim()) return true;
    const q = docSearch.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.romanAlias.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.englishDescription.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-64 md:w-72 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col h-full z-20 select-none overflow-hidden shadow-xl">
      {/* Sidebar Header */}
      <div className="h-10 px-3 bg-[#060911]/80 border-b border-[#1E293B] flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          {activeTab === 'files' && <FolderOpen className="w-4 h-4 text-emerald-400" />}
          {activeTab === 'examples' && <BookOpen className="w-4 h-4 text-emerald-400" />}
          {activeTab === 'cheatsheet' && <HelpCircle className="w-4 h-4 text-emerald-400" />}
          
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {activeTab === 'files' && 'फाइल अन्वेषक (Files)'}
            {activeTab === 'examples' && 'उदाहरण पुस्तकालय (Examples)'}
            {activeTab === 'cheatsheet' && 'भाषा सन्दर्भ (Docs & Reference)'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#0F172A] transition-colors"
          title="प्यानल बन्द गर्नुहोस् (Close Sidebar)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* VIEW 1: FILES EXPLORER */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              परियोजना फाइलहरू ({files.length})
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={onAddFile}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-[#0F172A] rounded transition-colors"
                title="नयाँ फाइल थप्नुहोस् (New File)"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onResetWorkspace}
                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-[#0F172A] rounded transition-colors"
                title="पूर्वनिर्धारितमा रिसेट गर्नुहोस् (Reset Files)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              const isEditing = editingFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  onDoubleClick={(e) => e.preventDefault()}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-[#0F172A] text-emerald-400 border border-emerald-500/30 font-medium'
                      : 'text-slate-400 hover:bg-[#0F172A]/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate flex-1 min-w-0 mr-1">
                    <FileCode className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingFileName}
                        onChange={(e) => setEditingFileName(e.target.value)}
                        onBlur={() => finishRename(file.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(file.id);
                          if (e.key === 'Escape') setEditingFileId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-emerald-500 outline-none w-full text-xs font-mono"
                      />
                    ) : (
                      <span className="truncate">{file.name}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onRenameFile && (
                        <button
                          onClick={(e) => startRename(file, e)}
                          className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-emerald-300 rounded transition-colors"
                          title="नाम परिवर्तन गर्नुहोस् (Rename File)"
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
                          className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 rounded transition-colors"
                          title="हटाउनुहोस् (Delete File)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1 text-emerald-400 font-semibold font-devanagari">
              <Sparkles className="w-3 h-3" />
              <span>स्वत: बचत सक्षम छ</span>
            </div>
            <p className="text-[10px] text-slate-500 font-devanagari">
              सबै कोड ब्राउजरको लोकल स्टोरेजमा तुरुन्तै सुरक्षित हुन्छ।
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: EXAMPLES CATALOG */}
      {activeTab === 'examples' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
            {['all', 'basics', 'math', 'dates', 'system'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0F172A]'
                }`}
              >
                {cat === 'all' && 'सबै (All)'}
                {cat === 'basics' && 'आधारभूत'}
                {cat === 'math' && 'गणित'}
                {cat === 'dates' && 'मिति/उमेर'}
                {cat === 'system' && 'प्रणाली'}
              </button>
            ))}
          </div>

          {/* Examples List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredExamples.map((ex) => (
              <div
                key={ex.id}
                onClick={() => onSelectExample(ex)}
                onDoubleClick={(e) => e.preventDefault()}
                className="group p-2.5 rounded-lg border border-[#1E293B] hover:border-emerald-500/40 bg-[#060911]/50 hover:bg-[#0F172A] cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 font-devanagari">
                    {ex.nepaliTitle}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1E293B] text-slate-400">
                    {ex.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {ex.description}
                </p>
                <div className="flex items-center justify-end text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity space-x-1 font-devanagari">
                  <span>लोड गर्नुहोस्</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: CHEATSHEET / DOCS */}
      {activeTab === 'cheatsheet' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="खोज्नुहोस् (search docs)..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#060911] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-devanagari"
            />
          </div>

          {/* Reference Items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredDocs.map((doc) => (
              <div
                key={doc.name}
                onDoubleClick={(e) => e.preventDefault()}
                className="p-2.5 rounded-lg border border-[#1E293B] bg-[#060911]/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 font-devanagari font-mono">
                    {doc.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {doc.romanAlias}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-devanagari leading-snug">
                  {doc.description}
                </p>
                {doc.example && (
                  <div className="pt-1 flex items-center justify-between border-t border-[#1E293B]/60">
                    <code className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                      {doc.example}
                    </code>
                    <button
                      onClick={() => onInsertCode(doc.example)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 font-devanagari transition-colors"
                      title="कोडमा घुसाउनुहोस्"
                    >
                      घुसाउनुहोस्
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
