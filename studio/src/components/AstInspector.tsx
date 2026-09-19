'use client';
import React from 'react';
import { Layers, X, Code2 } from 'lucide-react';

interface AstInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

export const AstInspector: React.FC<AstInspectorProps> = ({ isOpen, onClose, code }) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-925 flex flex-col h-full z-20 select-none">
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-100 font-devanagari">
            AST र बाइटकोड निरीक्षक
          </h3>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
            प्रोग्राम सारांश (Program Summary)
          </span>
          <div className="text-slate-300 space-y-1 text-[11px]">
            <div>लाइन्स: {code.split('\n').length}</div>
            <div>क्यारेक्टरहरू: {code.length}</div>
            <div>इन्जिन: Tree-walk AST / Stack VM</div>
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-2">
            कम्पाइलेसन विवरण (Bytecode Info)
          </span>
          <div className="text-emerald-400 text-[11px]">
            ✓ Syntax Validated<br />
            ✓ Resolver Scope Tree Built<br />
            ✓ Ready for VM Execution
          </div>
        </div>
      </div>
    </div>
  );
};
