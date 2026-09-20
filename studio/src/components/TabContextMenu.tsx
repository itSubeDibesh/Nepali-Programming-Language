'use client';
import React, { useEffect, useRef } from 'react';
import {
  X,
  XCircle,
  Pencil,
  Copy,
  Trash2,
  FileCode,
  Download,
  Columns2,
  Rows2,
  ArrowRightToLine,
  Layers,
} from 'lucide-react';
import { CodeFile } from '../lib/types';
import { getI18n } from '../lib/i18n';

export interface TabContextMenuState {
  x: number;
  y: number;
  file: CodeFile;
}

interface TabContextMenuProps {
  menu: TabContextMenuState | null;
  onClose: () => void;
  onCloseTab: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onCloseAll?: () => void;
  onSplitRight?: (file: CodeFile) => void;
  onSplitDown?: (file: CodeFile) => void;
  onRename: (file: CodeFile) => void;
  onDeleteFile: (id: string) => void;
  onCopyName: (name: string) => void;
  onDownload: (file: CodeFile) => void;
  canCloseOthers: boolean;
  canCloseToRight?: boolean;
  canCloseAll?: boolean;
  translitEnabled?: boolean;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  menu,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onSplitRight,
  onSplitDown,
  onRename,
  onDeleteFile,
  onCopyName,
  onDownload,
  canCloseOthers,
  canCloseToRight = true,
  canCloseAll = true,
  translitEnabled = true,
}) => {
  const i18n = getI18n(translitEnabled).editor;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (menu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  // Keep menu inside viewport boundaries
  const adjustedX = Math.min(menu.x, window.innerWidth - 240);
  const adjustedY = Math.min(menu.y, window.innerHeight - 360);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-60 bg-[#0B0F19]/95 backdrop-blur-xl border border-[#1E293B] rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in duration-100 font-sans"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header with File Name */}
      <div className="px-3 py-1.5 border-b border-[#1E293B]/60 flex items-center space-x-2 text-slate-400 font-mono text-[11px] truncate">
        <FileCode className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="truncate text-slate-300 font-medium">{menu.file.name}</span>
      </div>

      <div className="py-1">
        {/* Close Tab */}
        <button
          onClick={() => {
            onCloseTab(menu.file.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-devanagari">{i18n.closeTab}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Ctrl+W</span>
        </button>

        {/* Close Other Tabs */}
        {canCloseOthers && onCloseOthers && (
          <button
            onClick={() => {
              onCloseOthers(menu.file.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-devanagari">{i18n.closeOthers}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Others</span>
          </button>
        )}

        {/* Close to Right */}
        {canCloseToRight && onCloseToRight && (
          <button
            onClick={() => {
              onCloseToRight(menu.file.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ArrowRightToLine className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-devanagari">{i18n.closeToRight}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Right</span>
          </button>
        )}

        {/* Close All */}
        {canCloseAll && onCloseAll && (
          <button
            onClick={() => {
              onCloseAll();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-rose-400 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-devanagari">{i18n.closeAll}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">All</span>
          </button>
        )}
      </div>

      {/* Split Views */}
      {(onSplitRight || onSplitDown) && (
        <div className="border-t border-[#1E293B]/60 my-1 pt-1">
          {onSplitRight && (
            <button
              onClick={() => {
                onSplitRight(menu.file);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Columns2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-devanagari">{i18n.splitRight}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Split |</span>
            </button>
          )}

          {onSplitDown && (
            <button
              onClick={() => {
                onSplitDown(menu.file);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Rows2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-devanagari">{i18n.splitDown}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Split —</span>
            </button>
          )}
        </div>
      )}

      <div className="border-t border-[#1E293B]/60 my-1 pt-1">
        {/* Rename */}
        <button
          onClick={() => {
            onRename(menu.file);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-devanagari">{i18n.renameTab}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">F2</span>
        </button>

        {/* Copy File Name */}
        <button
          onClick={() => {
            onCopyName(menu.file.name);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-devanagari">{i18n.copyName}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Copy</span>
        </button>

        {/* Download File */}
        <button
          onClick={() => {
            onDownload(menu.file);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-devanagari">{i18n.downloadFile}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Save</span>
        </button>
      </div>

      <div className="border-t border-[#1E293B]/60 my-1 pt-1">
        {/* Delete File from Workspace */}
        <button
          onClick={() => {
            onDeleteFile(menu.file.id);
            onClose();
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-rose-500/10 text-rose-400 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-devanagari">{i18n.deleteFile}</span>
          </div>
          <span className="text-[10px] text-rose-400/70 font-mono">Delete</span>
        </button>
      </div>
    </div>
  );
};
