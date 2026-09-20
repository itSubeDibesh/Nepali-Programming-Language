'use client';
import { ensureNepaliExtension, getFileExtensionBadgeColor, handleRenameInputKeyDown } from '../lib/fileUtils';
import { copyToClipboard } from '../lib/clipboard';
import { TabContextMenu, TabContextMenuState } from './TabContextMenu';
import { toNepaliDigits } from '../lib/numbers';
import { getI18n } from '../lib/i18n';
import {
  Eye,
  EyeOff,
  Play,
  Download,
  FileCode,
  Plus,
  Trash2,
  RefreshCw,
  X,
  BookOpen,
  FolderOpen,
  Folder,
  FolderPlus,
  FolderInput,
  Home,
  HelpCircle,
  Code,
  Sparkles,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  Copy,
  ArrowDownUp,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { ActiveSidebarTab } from './ActivityBar';
import { CodeFile, RecipeItem } from '../lib/types';
import { isDesktopApp } from '../lib/env';
import { EXAMPLES, EXAMPLE_CATEGORIES } from '../lib/examples';
import { DOCS_CATALOG } from '../lib/docs';

interface SidebarProps {
  activeTab: ActiveSidebarTab;
  translitEnabled?: boolean;
  onClose: () => void;
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (folderPrefix?: string) => void;
  onAddFolder?: (folderName: string) => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onRenameFolder?: (oldPath: string, newPath: string) => void;
  onCloseTab?: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onMoveFile?: (fileId: string, targetFolderPath: string | null) => void;
  onSelectExample: (ex: RecipeItem, saveToFolder?: boolean) => void;
  onInsertCode: (snippet: string) => void;
  onResetWorkspace: () => void;
  onOpenDownload?: () => void;
  onOpenUpdate?: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: CodeFile;
  children: TreeNode[];
}

function buildFileTree(files: CodeFile[]): TreeNode[] {
  const rootNodes: TreeNode[] = [];
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  for (const file of sortedFiles) {
    const parts = file.name.split('/').filter(Boolean);
    if (parts.length === 1) {
      rootNodes.push({
        name: parts[0],
        path: file.name,
        isFolder: false,
        file,
        children: [],
      });
    } else {
      let currentLevel = rootNodes;
      let currentPath = '';

      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

        let dirNode = currentLevel.find((n) => n.isFolder && n.name === dirName);
        if (!dirNode) {
          dirNode = {
            name: dirName,
            path: currentPath,
            isFolder: true,
            children: [],
          };
          currentLevel.push(dirNode);
        }
        currentLevel = dirNode.children;
      }

      const fileName = parts[parts.length - 1];
      currentLevel.push({
        name: fileName,
        path: file.name,
        isFolder: false,
        file,
        children: [],
      });
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });
    for (const node of nodes) {
      if (node.isFolder) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(rootNodes);
  return rootNodes;
}

function countFilesInTree(node: TreeNode): number {
  if (!node.isFolder) return 1;
  return node.children.reduce((acc, child) => acc + countFilesInTree(child), 0);
}

const CATEGORY_NAMES_NEPALI: Record<string, string> = {
  basics: 'आधारभूत (Basics)',
  control: 'नियन्त्रण प्रवाह (Control Flow)',
  functions: 'कार्य र रिकर्सन (Functions)',
  algorithms: 'एल्गोरिदम (Algorithms)',
  data: 'डेटा संरचना (Data Structures)',
  dates: 'मिति र समय (Dates & BS)',
  system: 'प्रणाली र OS (System & OS)',
  interop: 'इन्टरअप र FFI (Interop)',
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFolder,
  onCloseTab,
  onRenameFile,
  onMoveFile,
  onSelectExample,
  onInsertCode,
  onResetWorkspace,
  translitEnabled = true,
  onOpenDownload,
  onOpenUpdate,
}) => {
  const i18n = getI18n(translitEnabled).sidebar;
  const [docSearch, setDocSearchState] = useState<string>('');
  const [exampleSearch, setExampleSearchState] = useState<string>('');
  const [previewExampleId, setPreviewExampleId] = useState<string | null>(null);
  const [copiedExampleId, setCopiedExampleId] = useState<string | null>(null);
  const [fileContextMenu, setFileContextMenu] = useState<TabContextMenuState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Directory organization state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [editingFolderOriginal, setEditingFolderOriginal] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');

  // Drag & Drop State for moving files
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState<boolean>(false);

  // File rename state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState<string>('');

  // Collapsible Categories in Examples Tab
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of EXAMPLE_CATEGORIES) {
      initial[cat] = true;
    }
    return initial;
  });

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // Collect all existing folder paths in the project
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

  if (!activeTab) {
    return null;
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: prev[path] === undefined ? false : !prev[path],
    }));
  };

  const isFolderExpanded = (path: string): boolean => {
    return expandedFolders[path] !== false; // default open
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const startRenameFile = (file: CodeFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const finishRenameFile = (id: string) => {
    if (!editingFileName.trim()) {
      setEditingFileId(null);
      return;
    }
    const finalName = ensureNepaliExtension(editingFileName.trim());
    if (onRenameFile) {
      onRenameFile(id, finalName);
    }
    setEditingFileId(null);
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (trimmed && onAddFolder) {
      onAddFolder(trimmed);
      setExpandedFolders((prev) => ({ ...prev, [trimmed]: true }));
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleFinishRenameFolder = (oldPath: string) => {
    const trimmed = editingFolderName.trim();
    if (trimmed && trimmed !== oldPath && onRenameFolder) {
      onRenameFolder(oldPath, trimmed);
    }
    setEditingFolderOriginal(null);
    setEditingFolderName('');
  };

  const handleCopyExample = (ex: RecipeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(ex.code);
    setCopiedExampleId(ex.id);
    setTimeout(() => setCopiedExampleId(null), 2000);
  };

  const filteredExamples = EXAMPLES.filter((ex) => {
    const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
    if (!matchesCat) return false;
    if (!exampleSearch.trim()) return true;
    const q = exampleSearch.toLowerCase();
    return (
      ex.title.toLowerCase().includes(q) ||
      ex.nepaliTitle.toLowerCase().includes(q) ||
      ex.description.toLowerCase().includes(q) ||
      ex.code.toLowerCase().includes(q)
    );
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

  // Check if currently dragged file is inside a subfolder
  const draggedFile = draggedFileId ? files.find((f) => f.id === draggedFileId) : null;
  const isDraggedFileInSubfolder = Boolean(draggedFile && draggedFile.name.includes('/'));

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const paddingLeft = `${depth * 12 + 8}px`;

    if (node.isFolder) {
      const isExpanded = isFolderExpanded(node.path);
      const isEditing = editingFolderOriginal === node.path;
      const fileCount = countFilesInTree(node);
      const isTargetHovered = dragOverFolder === node.path;

      return (
        <div
          key={node.path}
          className="space-y-0.5"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolder(node.path);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverFolder === node.path) {
              setDragOverFolder(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolder(null);
            const droppedId = e.dataTransfer.getData('text/nepali-file-id') || draggedFileId;
            if (droppedId && onMoveFile) {
              onMoveFile(droppedId, node.path);
            }
            setDraggedFileId(null);
          }}
        >
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft }}
            className={`group flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer text-xs font-mono transition-all ${
              isTargetHovered
                ? 'bg-amber-500/20 border-2 border-dashed border-amber-400 text-amber-200 ring-2 ring-amber-500/40 scale-[1.01]'
                : 'text-slate-300 hover:bg-[#0F172A]/70 hover:text-emerald-300'
            }`}
          >
            <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0 mr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.path);
                }}
                className="p-0.5 text-slate-400 hover:text-white"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}

              {isEditing ? (
                <input
                  type="text"
                  autoFocus
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onBlur={() => handleFinishRenameFolder(node.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRenameFolder(node.path);
                    else if (e.key === 'Escape') setEditingFolderOriginal(null);
                    else handleRenameInputKeyDown(e, translitEnabled, setEditingFolderName);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-amber-500 outline-none w-full text-xs font-mono"
                />
              ) : (
                <span className="font-semibold text-slate-200 truncate group-hover:text-amber-300">
                  {node.name}
                </span>
              )}

              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                {toNepaliDigits(fileCount)}
              </span>
            </div>

            {!isEditing && (
              <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFile(node.path);
                  }}
                  className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                  title={`${node.name} भित्र नयाँ फाइल थप्नुहोस्`}
                >
                  <Plus className="w-3 h-3" />
                </button>
                {onRenameFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderOriginal(node.path);
                      setEditingFolderName(node.path);
                    }}
                    className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-amber-300 rounded transition-colors"
                    title="फोल्डरको नाम बदल्नुहोस् (Rename Folder)"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {onDeleteFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(node.path);
                    }}
                    className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    title="फोल्डर मेटाउनुहोस् (Delete Folder)"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Children nodes */}
          {isExpanded && (
            <div className="space-y-0.5">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Single File Node
    const file = node.file!;
    const isActive = file.id === activeFileId;
    const isEditing = editingFileId === file.id;

    return (
      <div
        key={file.id}
        draggable={!isEditing}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/nepali-file-id', file.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggedFileId(file.id);
        }}
        onDragEnd={() => {
          setDraggedFileId(null);
          setDragOverFolder(null);
          setIsDragOverRoot(false);
        }}
        onClick={() => onSelectFile(file.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setFileContextMenu({ x: e.clientX, y: e.clientY, file });
        }}
        style={{ paddingLeft }}
        className={`group flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer text-xs font-mono transition-all ${
          isActive
            ? 'bg-[#0F172A] text-emerald-400 border border-emerald-500/30 font-medium'
            : 'text-slate-400 hover:bg-[#0F172A]/50 hover:text-slate-200'
        } ${draggedFileId === file.id ? 'opacity-40 border border-dashed border-slate-500' : ''}`}
      >
        <div className="flex items-center space-x-2 truncate flex-1 min-w-0 mr-1">
          <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editingFileName}
              onChange={(e) => setEditingFileName(e.target.value)}
              onBlur={() => finishRenameFile(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishRenameFile(file.id);
                else if (e.key === 'Escape') setEditingFileId(null);
                else handleRenameInputKeyDown(e, translitEnabled, setEditingFileName);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-emerald-500 outline-none w-full text-xs font-mono"
            />
          ) : (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="truncate">{node.name}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${getFileExtensionBadgeColor(file.name).bg} ${getFileExtensionBadgeColor(file.name).text}`}>
                {getFileExtensionBadgeColor(file.name).label}
              </span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick Move Button */}
            {onMoveFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileContextMenu({ x: e.clientX, y: e.clientY, file });
                }}
                className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-amber-300 rounded transition-colors"
                title="फोल्डरमा सार्नुहोस् (Move File)"
              >
                <FolderInput className="w-3 h-3" />
              </button>
            )}
            {onRenameFile && (
              <button
                onClick={(e) => startRenameFile(file, e)}
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
  };

  return (
    <aside className="w-64 md:w-72 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col h-full z-20 select-none overflow-x-hidden overflow-y-hidden shadow-xl min-w-0 flex-shrink-0">
      {/* Sidebar Header */}
      <div className="h-10 px-3 bg-[#060911]/80 border-b border-[#1E293B] flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          {activeTab === 'files' && <FolderOpen className="w-4 h-4 text-emerald-400" />}
          {activeTab === 'examples' && <BookOpen className="w-4 h-4 text-emerald-400" />}
          {activeTab === 'cheatsheet' && <HelpCircle className="w-4 h-4 text-emerald-400" />}

          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {activeTab === 'files' && i18n.filesTitle}
            {activeTab === 'examples' && i18n.examplesTitle}
            {activeTab === 'cheatsheet' && i18n.docsTitle}
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

      {/* VIEW 1: FILES & FOLDER EXPLORER */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              परियोजना संरचना ({toNepaliDigits(files.length)})
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onAddFile()}
                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-[#0F172A] rounded transition-colors"
                title={i18n.newFile}
              >
                <Plus className="w-4 h-4" />
              </button>
              {onAddFolder && (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1 text-slate-400 hover:text-amber-400 hover:bg-[#0F172A] rounded transition-colors"
                  title={i18n.newFolder}
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onResetWorkspace}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#0F172A] rounded transition-colors"
                title={i18n.resetFiles}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* New Folder Inline Form */}
          {isCreatingFolder && (
            <div className="flex items-center space-x-1.5 p-2 bg-[#0F172A] border border-amber-500/40 rounded-lg animate-in fade-in duration-150">
              <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="फोल्डरको नाम (उदा: lib, src)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  else if (e.key === 'Escape') setIsCreatingFolder(false);
                  else handleRenameInputKeyDown(e, translitEnabled, setNewFolderName);
                }}
                className="bg-slate-950 text-white px-2 py-0.5 rounded border border-slate-700 outline-none w-full text-xs font-mono"
              />
              <button
                onClick={handleCreateFolder}
                className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="p-1 text-slate-400 hover:bg-slate-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dedicated Root Drop Target (visible when dragging a subfolder file) */}
          {draggedFileId && isDraggedFileInSubfolder && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOverRoot(true);
              }}
              onDragLeave={() => setIsDragOverRoot(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverRoot(false);
                const droppedId = e.dataTransfer.getData('text/nepali-file-id') || draggedFileId;
                if (droppedId && onMoveFile) {
                  onMoveFile(droppedId, null);
                }
                setDraggedFileId(null);
              }}
              className={`p-2 rounded-lg border-2 border-dashed transition-all flex items-center justify-center space-x-2 cursor-pointer font-devanagari text-xs ${
                isDragOverRoot
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500/40'
                  : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>मूल फोल्डरमा सार्नुहोस् (Drop for Root Workspace)</span>
            </div>
          )}

          {/* Directory & File Tree with Drop Zone */}
          <div
            className={`flex-1 overflow-y-auto space-y-0.5 pr-1 rounded-md transition-colors ${
              isDragOverRoot ? 'bg-[#0F172A]/50' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverRoot(true);
            }}
            onDragLeave={() => setIsDragOverRoot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverRoot(false);
              const droppedId = e.dataTransfer.getData('text/nepali-file-id') || draggedFileId;
              if (droppedId && onMoveFile) {
                onMoveFile(droppedId, null);
              }
              setDraggedFileId(null);
            }}
          >
            {fileTree.map((node) => renderTreeNode(node, 0))}
          </div>

          {/* Footer Info & Desktop Badges */}
          <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1 text-emerald-400 font-semibold font-devanagari">
              <Sparkles className="w-3 h-3" />
              <span>{i18n.autoSaveEnabled}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-devanagari">
              {i18n.autoSaveDesc}
            </p>
            {isDesktopApp() ? (
              <div className="w-full mt-2 flex items-center justify-between py-1.5 px-2.5 rounded-md bg-[#040711] text-slate-300 border border-[#1E293B] text-[10px]">
                <span className="font-mono text-emerald-400">नेपाली स्टुडियो डेस्कटप v1.1.0</span>
                {onOpenUpdate && (
                  <button
                    onClick={onOpenUpdate}
                    className="text-amber-400 hover:text-amber-300 font-devanagari transition-colors font-medium"
                  >
                    अपडेट
                  </button>
                )}
              </div>
            ) : (
              onOpenDownload && (
                <button
                  onClick={onOpenDownload}
                  className="w-full mt-2 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-[10px] font-devanagari transition-colors font-medium shadow-sm"
                >
                  <Download className="w-3 h-3" />
                  <span>{translitEnabled ? 'डेस्कटप एप डाउनलोड गर्नुहोस्' : 'Download Desktop App'}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: EXAMPLES CATALOG (34 Verified Real Programs) */}
      {activeTab === 'examples' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={exampleSearch}
              onChange={(e) => setExampleSearchState(e.target.value)}
              placeholder="उदाहरण खोज्नुहोस् (उदा: प्राइम, लुप, फिबोनाची)..."
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-devanagari transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex-shrink-0 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-[#0F172A] text-slate-400 hover:text-slate-200'
              }`}
            >
              सबै ({toNepaliDigits(EXAMPLES.length)})
            </button>
            {EXAMPLE_CATEGORIES.map((cat) => {
              const count = EXAMPLES.filter((e) => e.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex-shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-[#0F172A] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {CATEGORY_NAMES_NEPALI[cat] || cat} ({toNepaliDigits(count)})
                </button>
              );
            })}
          </div>

          {/* Grouped Examples List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {selectedCategory === 'all' && !exampleSearch.trim() ? (
              // Collapsible Accordion view by Category
              EXAMPLE_CATEGORIES.map((cat) => {
                const catExamples = EXAMPLES.filter((e) => e.category === cat);
                if (catExamples.length === 0) return null;
                const isExpanded = expandedCategories[cat] !== false;

                return (
                  <div key={cat} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-2 py-1.5 bg-[#0F172A]/70 hover:bg-[#0F172A] border border-[#1E293B]/60 rounded-md text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{CATEGORY_NAMES_NEPALI[cat] || cat}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {toNepaliDigits(catExamples.length)}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-1 pl-1">
                        {catExamples.map((ex) => (
                          <div
                            key={ex.id}
                            className="p-2 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-emerald-500/30 transition-all space-y-1.5 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 font-devanagari">
                                {ex.nepaliTitle}
                              </span>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() =>
                                    setPreviewExampleId(previewExampleId === ex.id ? null : ex.id)
                                  }
                                  className="p-1 hover:bg-[#0F172A] text-slate-400 hover:text-white rounded"
                                  title="कोड पूर्वावलोकन (Preview)"
                                >
                                  {previewExampleId === ex.id ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => handleCopyExample(ex, e)}
                                  className="p-1 hover:bg-[#0F172A] text-slate-400 hover:text-emerald-400 rounded"
                                  title="कोड कपी गर्नुहोस् (Copy)"
                                >
                                  {copiedExampleId === ex.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 font-devanagari">
                              {ex.description}
                            </p>

                            {/* Preview Code View */}
                            {previewExampleId === ex.id && (
                              <pre className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-32">
                                {ex.code}
                              </pre>
                            )}

                            <div className="flex items-center space-x-1.5 pt-0.5">
                              <button
                                onClick={() => onSelectExample(ex, false)}
                                className="flex-1 flex items-center justify-center space-x-1 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-devanagari border border-emerald-500/20 transition-colors"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>{i18n.load}</span>
                              </button>
                              <button
                                onClick={() => onSelectExample(ex, true)}
                                className="px-2 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-slate-300 text-[10px] font-devanagari border border-slate-700 transition-colors"
                                title="उदाहरण फोल्डरमा नयाँ फाइलको रूपमा सुरक्षित गर्नुहोस्"
                              >
                                <span>+ फाइल</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Filtered flat list
              filteredExamples.map((ex) => (
                <div
                  key={ex.id}
                  className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B] hover:border-emerald-500/30 transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 font-devanagari">
                      {ex.nepaliTitle}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() =>
                          setPreviewExampleId(previewExampleId === ex.id ? null : ex.id)
                        }
                        className="p-1 hover:bg-[#0F172A] text-slate-400 hover:text-white rounded"
                        title="कोड पूर्वावलोकन"
                      >
                        {previewExampleId === ex.id ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleCopyExample(ex, e)}
                        className="p-1 hover:bg-[#0F172A] text-slate-400 hover:text-emerald-400 rounded"
                        title="कपी गर्नुहोस्"
                      >
                        {copiedExampleId === ex.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-devanagari">
                    {ex.description}
                  </p>

                  {previewExampleId === ex.id && (
                    <pre className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto max-h-32">
                      {ex.code}
                    </pre>
                  )}

                  <div className="flex items-center space-x-1.5 pt-0.5">
                    <button
                      onClick={() => onSelectExample(ex, false)}
                      className="flex-1 flex items-center justify-center space-x-1 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-devanagari border border-emerald-500/20 transition-colors"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>{i18n.load}</span>
                    </button>
                    <button
                      onClick={() => onSelectExample(ex, true)}
                      className="px-2 py-1 rounded bg-[#0F172A] hover:bg-slate-800 text-slate-300 text-[10px] font-devanagari border border-slate-700 transition-colors"
                    >
                      <span>+ फाइल</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: CHEATSHEET & DOCUMENTATION */}
      {activeTab === 'cheatsheet' && (
        <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearchState(e.target.value)}
              placeholder="कुञ्जीशब्द खोज्नुहोस् (उदा: राखौँ, भनौँ, यदि)..."
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-devanagari transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredDocs.map((doc) => (
              <div
                key={doc.name}
                className="p-2.5 rounded-lg bg-[#060911] border border-[#1E293B] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">
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
                      {i18n.insertSnippet}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Right-Click Context Menu for Files */}
      <TabContextMenu
        menu={fileContextMenu}
        onClose={() => setFileContextMenu(null)}
        onCloseTab={(id) => {
          if (onCloseTab) {
            onCloseTab(id);
          } else {
            onDeleteFile(id);
          }
        }}
        onRename={(file) => {
          setEditingFileId(file.id);
          setEditingFileName(file.name);
        }}
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
        canCloseOthers={false}
      />
    </aside>
  );
};
