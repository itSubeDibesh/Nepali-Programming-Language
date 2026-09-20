'use client';
import React, { useState } from 'react';
import { CodeFile, RecipeItem } from '../lib/types';
import { EXAMPLES } from '../lib/examples';
import { DOCS_CATALOG } from '../lib/docs';
import { ActiveSidebarTab } from './ActivityBar';
import {
  FileCode, Plus, Trash2, Download, Search, Sparkles,
  BookOpen, Layers, X, RefreshCw, FolderOpen, Code2, Tag, ChevronRight, HelpCircle
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveSidebarTab;
  onClose: () => void;
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
  onSelectExample: (ex: RecipeItem) => void;
  onInsertCode: (code: string) => void;
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
  onSelectExample,
  onInsertCode,
  onResetWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!activeTab || activeTab === 'ai' || activeTab === 'inspector') {
    return null;
  }

  // Filter examples
  const filteredExamples = EXAMPLES.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.nepaliTitle.includes(searchQuery) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const allCategories = ['all', 'basics', 'dates', 'input', 'math', 'arrays', 'sqlite'];

  // Filter docs
  const filteredDocs = DOCS_CATALOG.filter((d) =>
    d.name.includes(searchQuery) ||
    d.devanagari.includes(searchQuery) ||
    d.romanAlias.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.includes(searchQuery) ||
    d.englishDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-72 md:w-80 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col h-full select-none z-20 shadow-2xl">
      {/* Header */}
      <div className="h-10 border-b border-[#1E293B] px-3.5 flex items-center justify-between">
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
          title="प्यानल बन्द गर्नुहोस्"
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
                title="नयाँ फाइल थप्नुहोस्"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={onResetWorkspace}
                className="p-1 text-slate-400 hover:text-amber-400 hover:bg-[#0F172A] rounded transition-colors"
                title="पूर्वनिर्धारितमा रिसेट गर्नुहोस्"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-[#0F172A] text-emerald-400 border border-emerald-500/30 font-medium'
                      : 'text-slate-400 hover:bg-[#0F172A]/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.name}</span>
                  </div>

                  {files.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 rounded transition-opacity"
                      title="हटाउनुहोस्"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>स्वत: बचत सक्षम छ</span>
            </div>
            <p className="text-[10px] text-slate-500">
              सबै कोड ब्राउजरको लोकल स्टोरेजमा तुरुन्तै सुरक्षित हुन्छ।
            </p>
          </div>
        </div>
      )}

      {/* VIEW 2: EXAMPLES LIBRARY */}
      {activeTab === 'examples' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="उदाहरण खोज्नुहोस्..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060911] border border-[#1E293B] text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono capitalize whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'bg-[#060911] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Examples Catalog */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredExamples.map((ex) => (
              <div
                key={ex.id}
                onClick={() => onSelectExample(ex)}
                className="group bg-[#060911] border border-[#1E293B] hover:border-emerald-500/40 rounded-lg p-2.5 cursor-pointer transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {ex.title}
                  </h4>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="text-[11px] font-devanagari text-emerald-400/80 mb-1">
                  {ex.nepaliTitle}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {ex.description}
                </p>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#0F172A] text-slate-400 rounded">
                  #{ex.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: CHEATSHEET & DOCUMENTATION EXPLORER */}
      {activeTab === 'cheatsheet' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="कुञ्जीशब्द वा फलन खोज्नुहोस्..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060911] border border-[#1E293B] text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredDocs.map((doc) => (
              <div
                key={doc.name}
                className="bg-[#060911] border border-[#1E293B] hover:border-emerald-500/30 rounded-lg p-2.5 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-emerald-400 font-devanagari">
                      {doc.devanagari}
                    </span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.2 rounded">
                      {doc.romanAlias}
                    </span>
                  </div>
                  <button
                    onClick={() => onInsertCode(doc.example)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded transition-colors"
                    title="सम्पादकमा घुसाउनुहोस्"
                  >
                    + घुसाउनुहोस्
                  </button>
                </div>

                <div className="bg-[#0B0F19] px-2 py-1 rounded text-[10px] font-mono text-sky-300 truncate">
                  {doc.signature}
                </div>

                <p className="text-[11px] text-slate-300 leading-snug font-devanagari">
                  {doc.description}
                </p>

                <p className="text-[10px] text-slate-400 italic">
                  {doc.englishDescription}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
