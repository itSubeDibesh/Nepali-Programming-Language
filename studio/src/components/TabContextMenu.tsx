'use client';
import React, { useEffect, useRef, useState } from 'react';
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
  FolderInput,
  Folder,
  FolderPlus,
  Home,
  ChevronRight,
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
  onMoveFile?: (fileId: string, targetFolder: string | null) => void;
  availableFolders?: string[];
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
  onMoveFile,
  availableFolders = [],
  canCloseOthers,
  canCloseToRight = true,
  canCloseAll = true,
  translitEnabled = true,
}) => {
  const i18n = getI18n(translitEnabled).editor;
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState<boolean>(false);
  const [customNewFolder, setCustomNewFolder] = useState<string>('');
  const [isAddingNewFolder, setIsAddingNewFolder] = useState<boolean>(false);

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
  const adjustedX = Math.min(menu.x, window.innerWidth - 260);
  const adjustedY = Math.min(menu.y, window.innerHeight - 420);

  const isFileInSubfolder = menu.file.name.includes('/');
  const currentParentFolder = isFileInSubfolder
    ? menu.file.name.substring(0, menu.file.name.lastIndexOf('/'))
    : null;

  const validTargetFolders = availableFolders.filter((f) => f !== currentParentFolder);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-64 bg-[#0B0F19]/95 backdrop-blur-xl border border-[#1E293B] rounded-xl shadow-2xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in duration-100 font-sans"
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

      {/* Move File Operations */}
      {onMoveFile && (
        <div className="border-t border-[#1E293B]/60 my-1 pt-1">
          {/* Move to Root (if inside a directory) */}
          {isFileInSubfolder && (
            <button
              onClick={() => {
                onMoveFile(menu.file.id, null);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-amber-300 transition-colors text-amber-400"
            >
              <div className="flex items-center space-x-2">
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-devanagari font-medium">मूल फोल्डरमा सार्नुहोस् (Move to Root)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">/</span>
            </button>
          )}

          {/* Move to other folders */}
          <div className="relative">
            <button
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#0F172A] hover:text-emerald-400 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FolderInput className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-devanagari">फोल्डरमा सार्नुहोस् (Move to Folder)</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showMoveSubmenu ? 'rotate-90' : ''}`} />
            </button>

            {showMoveSubmenu && (
              <div className="mt-1 mb-1 mx-2 p-1.5 bg-[#060911] border border-[#1E293B] rounded-lg space-y-1 max-h-40 overflow-y-auto">
                {validTargetFolders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => {
                      onMoveFile(menu.file.id, folder);
                      onClose();
                    }}
                    className="w-full flex items-center space-x-2 px-2 py-1 rounded text-left hover:bg-[#0F172A] text-slate-300 hover:text-amber-300 transition-colors text-[11px] font-mono"
                  >
                    <Folder className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{folder}</span>
                  </button>
                ))}

                {isAddingNewFolder ? (
                  <div className="flex items-center space-x-1 pt-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="नयाँ फोल्डर..."
                      value={customNewFolder}
                      onChange={(e) => setCustomNewFolder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customNewFolder.trim()) {
                          onMoveFile(menu.file.id, customNewFolder.trim());
                          onClose();
                        } else if (e.key === 'Escape') {
                          setIsAddingNewFolder(false);
                        }
                      }}
                      className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-amber-500 text-[11px] font-mono w-full outline-none"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingNewFolder(true)}
                    className="w-full flex items-center space-x-1.5 px-2 py-1 rounded text-left hover:bg-[#0F172A] text-emerald-400 hover:text-emerald-300 transition-colors text-[11px] font-devanagari"
                  >
                    <FolderPlus className="w-3 h-3 text-emerald-400" />
                    <span>+ नयाँ फोल्डरमा सार्नुहोस्</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
