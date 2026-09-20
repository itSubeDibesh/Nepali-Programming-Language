'use client';
import React, { useState } from 'react';
import { EXAMPLES } from '../lib/examples';
import { RecipeItem } from '../lib/types';
import { BookOpen, X, Code2, Play, Search } from 'lucide-react';

interface ExamplesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (ex: RecipeItem) => void;
}

export const ExamplesDrawer: React.FC<ExamplesDrawerProps> = ({
  isOpen,
  onClose,
  onSelectExample,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = EXAMPLES.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(search.toLowerCase()) ||
      ex.nepaliTitle.includes(search) ||
      ex.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || ex.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-80 md:w-96 border-r border-slate-800 bg-slate-925 flex flex-col h-full z-20 select-none">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-100 font-devanagari">
            नेपाली कोड उदाहरणहरू
          </h3>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Categories */}
      <div className="p-3 border-b border-slate-850 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="उदाहरण खोज्नुहोस्..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-devanagari"
          />
        </div>

        <div className="flex space-x-1 overflow-x-auto text-[11px] pb-1">
          {['all', 'basics', 'control', 'functions', 'algorithms', 'data', 'dates', 'system', 'interop'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2 py-0.5 rounded capitalize whitespace-nowrap text-[10px] ${
                category === cat ? 'bg-emerald-600 text-white font-medium' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'सबै' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            onClick={() => onSelectExample(ex)}
            className="group p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 cursor-pointer transition-all shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-devanagari font-bold text-xs text-slate-100 group-hover:text-indigo-300">
                {ex.nepaliTitle}
              </span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                {ex.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {ex.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
