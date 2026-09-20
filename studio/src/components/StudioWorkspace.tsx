'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { ActivityBar, ActiveSidebarTab } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { Terminal } from './Terminal';
import { AiAssistant } from './AiAssistant';
import { ShareModal } from './ShareModal';
import { InputModal } from './InputModal';
import { ToastContainer, ToastMessage } from './Toast';
import { ConfirmModal, ConfirmDialogState } from './ConfirmModal';
import { engine } from '../lib/engine';
import { ExecutionResult, RunMode, PromptRequest, CodeFile, RecipeItem } from '../lib/types';
import { decodeCodeFromUrl } from '../lib/share';
import { ensureNepaliExtension } from '../lib/fileUtils';
import { toNepaliDigits } from '../lib/numbers';
import { getI18n } from '../lib/i18n';

const DEFAULT_CODE = `// नेपाली भाषामा पहिलो कार्यक्रम (Your First Program)
राखौँ सन्देश = "नमस्ते, नेपाल !"।
भनौँ(सन्देश)।

// ५ पटक लुप चलाउने उदाहरण
राखौँ गन्ती = ०।
भएसम्म गन्ती < ५ {
    भनौँ("गन्ती सङ्ख्या:", गन्ती + १)।
    गन्ती = गन्ती + १।
}
`;

const STORAGE_KEYS = {
  FILES: 'nepali_studio_files_v1',
  OPEN_TABS: 'nepali_studio_open_tabs_v1',
  ACTIVE_FILE_ID: 'nepali_studio_active_file_id_v1',
  MODE: 'nepali_studio_mode_v1',
  TRANSLIT: 'nepali_studio_translit_v1',
  SIDEBAR_TAB: 'nepali_studio_sidebar_v1',
  AI_OPEN: 'nepali_studio_ai_open_v1',
  TERMINAL_OPEN: 'nepali_studio_terminal_open_v1',
};

// Synchronous initial state getters (zero-flicker on reload)
function getInitialFiles(): CodeFile[] {
  if (typeof window === 'undefined') {
    return [{ id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }];
  }
  try {
    const shared = decodeCodeFromUrl();
    if (shared) {
      return [{
        id: 'shared',
        name: shared.name || 'shared.nep',
        content: shared.code,
        isMain: true
      }];
    }
    const saved = localStorage.getItem(STORAGE_KEYS.FILES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [{ id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }];
}


function getInitialOpenTabs(initialFiles: CodeFile[]): string[] {
  if (typeof window === 'undefined') {
    return initialFiles.map((f) => f.id);
  }
  try {
    const shared = decodeCodeFromUrl();
    if (shared) return ['shared'];
    const saved = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id) => initialFiles.some((f) => f.id === id));
        if (valid.length > 0) {
          return valid;
        }
      }
    }
  } catch {}
  return initialFiles.map((f) => f.id);
}

function getInitialActiveFileId(initialFiles: CodeFile[]): string {
  if (typeof window === 'undefined') return '1';
  try {
    const shared = decodeCodeFromUrl();
    if (shared) return 'shared';
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_ID);
    if (saved && initialFiles.some((f) => f.id === saved)) {
      return saved;
    }
  } catch {}
  return initialFiles[0]?.id || '1';
}

function getInitialMode(): RunMode {
  if (typeof window === 'undefined') return 'os';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE) as RunMode;
    if (saved && ['os', 'wasm', 'sandbox'].includes(saved)) {
      return saved;
    }
  } catch {}
  return 'os';
}

function getInitialTranslit(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSLIT);
    if (saved !== null) return saved === 'true';
  } catch {}
  return true;
}

function getInitialSidebarTab(): ActiveSidebarTab {
  if (typeof window === 'undefined') return 'files';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_TAB);
    if (saved === 'null' || saved === '') return null;
    if (saved && ['files', 'examples', 'cheatsheet'].includes(saved)) {
      return saved as ActiveSidebarTab;
    }
  } catch {}
  return 'files';
}

function getInitialAiOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AI_OPEN);
    if (saved !== null) return saved === 'true';
  } catch {}
  return false;
}

function getInitialTerminalOpen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TERMINAL_OPEN);
    if (saved !== null) return saved === 'true';
  } catch {}
  return false;
}

export default function StudioWorkspace() {
  const [files, setFiles] = useState<CodeFile[]>(getInitialFiles);
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => getInitialOpenTabs(getInitialFiles()));
  const [activeFileId, setActiveFileId] = useState<string>(() => getInitialActiveFileId(getInitialFiles()));
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<RunMode>(getInitialMode);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [translitEnabled, setTranslitEnabled] = useState<boolean>(getInitialTranslit);
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);

  // Layout Drawers & Dock state
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>(getInitialSidebarTab);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(getInitialAiOpen);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(getInitialTerminalOpen);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // App-level Toast Notifications & Confirm Dialogs
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: String(Date.now() + Math.random()),
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check URL share parameters on client mount
  useEffect(() => {
    const shared = decodeCodeFromUrl();
    if (shared) {
      const sharedFile: CodeFile = {
        id: 'shared',
        name: shared.name || 'shared.nep',
        content: shared.code,
        isMain: true
      };
      setFiles([sharedFile]);
      setActiveFileId('shared');
      showToast('info', 'साझेदारी गरिएको कोड लोड भयो', `${shared.name} सफलतापूर्वक लोड गरियो।`);
    }
  }, [showToast]);

  const saveFilesToStorage = (updatedFiles: CodeFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(updatedFiles));
      setIsSaved(true);
    } catch {}
  };

  const saveOpenTabsToStorage = (tabs: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(tabs));
    } catch {}
  };

  const handleSetActiveFileId = (id: string) => {
    setActiveFileId(id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE_ID, id);
    } catch {}
  };

  const handleSelectFile = (id: string) => {
    if (!openTabIds.includes(id)) {
      const nextOpen = [...openTabIds, id];
      setOpenTabIds(nextOpen);
      saveOpenTabsToStorage(nextOpen);
    }
    handleSetActiveFileId(id);
  };


  const handleSetMode = (newMode: RunMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, newMode);
    } catch {}
    showToast('info', 'मोड परिवर्तन भयो', `कार्यान्वयन मोड: ${newMode.toUpperCase()}`);
  };

  const handleSetTranslitEnabled = (updater: boolean | ((prev: boolean) => boolean)) => {
    setTranslitEnabled((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSLIT, String(next));
      } catch {}
      return next;
    });
  };

  const handleSetActiveSidebarTab = (updater: ActiveSidebarTab | ((prev: ActiveSidebarTab) => ActiveSidebarTab)) => {
    setActiveSidebarTab((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_TAB, next || 'null');
      } catch {}
      return next;
    });
  };

  const handleSetIsAiOpen = (updater: boolean | ((prev: boolean) => boolean)) => {
    setIsAiOpen((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEYS.AI_OPEN, String(next));
      } catch {}
      return next;
    });
  };

  const handleSetIsTerminalOpen = (updater: boolean | ((prev: boolean) => boolean)) => {
    setIsTerminalOpen((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEYS.TERMINAL_OPEN, String(next));
      } catch {}
      return next;
    });
  };

  const openFiles = files.filter((f) => openTabIds.includes(f.id));
  const activeFile = files.find((f) => f.id === activeFileId) || openFiles[0] || files[0] || null;

  const handlePrompt = (promptText: string): Promise<string> => {
    return new Promise((resolve) => {
      setPromptRequest({
        id: String(Date.now()),
        prompt: promptText,
        resolve: (val: string) => {
          setPromptRequest(null);
          resolve(val);
        }
      });
    });
  };

  const handleRun = async () => {
    if (!activeFile || isRunning) return;
    setIsRunning(true);
    handleSetIsTerminalOpen(true);
    setResult(null);

    try {
      const res = await engine.runCode(activeFile.content, mode, handlePrompt);
      setResult(res);
      if (res.exitCode === 0) {
        showToast('success', 'प्रोग्राम सफलतापूर्वक चल्यो', `कार्यान्वयन समय: ${res.durationMs}ms`);
      } else {
        showToast('error', 'प्रोग्राम त्रुटि', 'कन्सोल आउटपुटमा त्रुटि विवरण हेर्नुहोस्।');
      }
    } catch (err: any) {
      setResult({
        stdout: [],
        stderr: err?.message || 'अज्ञात त्रुटि भयो।',
        exitCode: 1,
        durationMs: 0,
        mode
      });
      showToast('error', 'कार्यान्वयन असफल', err?.message || 'अज्ञात त्रुटि।');
    } finally {
      setIsRunning(false);
    }
  };

  const handleManualSave = () => {
    saveFilesToStorage(files);
    showToast('success', 'फाइल सुरक्षित गरियो', `"${activeFile?.name || 'फाइल'}" सफलतापूर्वक सुरक्षित गरियो।`);
  };

  // Keyboard Shortcuts (Ctrl+Enter to run, F2 for translit, Ctrl+B for Sidebar, Ctrl+S for save)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleSetTranslitEnabled((prev) => {
          const next = !prev;
          showToast('info', next ? 'नेपाली टाइप मोड सक्षम गरियो' : 'English Type Mode Enabled', 'F2 थिचेर मोड बदल्न सक्नुहुन्छ');
          return next;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleSetActiveSidebarTab((prev) => (prev ? null : 'files'));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFile, mode, isRunning, showToast]);

    const handleAddFile = () => {
    const newId = String(Date.now());
    const ext = translitEnabled ? '.नेपाली' : '.nep';
    const newFileName = `कार्यक्रम_${files.length + 1}${ext}`;
    const newFile: CodeFile = {
      id: newId,
      name: newFileName,
      content: '// नयाँ नेपाली फाइल\nभनौँ("नमस्ते")।\n'
    };
    const nextFiles = [...files, newFile];
    const nextOpen = [...openTabIds, newId];
    setFiles(nextFiles);
    setOpenTabIds(nextOpen);
    handleSetActiveFileId(newId);
    saveFilesToStorage(nextFiles);
    saveOpenTabsToStorage(nextOpen);
    showToast('success', translitEnabled ? 'नयाँ फाइल सिर्जना गरियो' : 'New File Created', `"${newFileName}" ${translitEnabled ? 'थपियो।' : 'added.'}`);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) {
      showToast('warning', translitEnabled ? 'फाइल मेटाउन मिल्दैन' : 'Cannot Delete File', translitEnabled ? 'परियोजनामा कम्तिमा एउटा फाइल हुनैपर्छ।' : 'Workspace must have at least one file.');
      return;
    }
    const targetFile = files.find((f) => f.id === id);
    if (!targetFile) return;

    const i18nModals = getI18n(translitEnabled).modals;
    setConfirmDialog({
      isOpen: true,
      title: i18nModals.deleteTitle,
      message: i18nModals.deleteMessage(targetFile.name),
      confirmLabel: i18nModals.deleteConfirm,
      cancelLabel: i18nModals.deleteCancel,
      variant: 'danger',
      onConfirm: () => {
        const nextFiles = files.filter((f) => f.id !== id);
        const nextOpen = openTabIds.filter((tabId) => tabId !== id);
        setFiles(nextFiles);
        setOpenTabIds(nextOpen);
        saveFilesToStorage(nextFiles);
        saveOpenTabsToStorage(nextOpen);

        if (activeFileId === id) {
          if (nextOpen.length > 0) {
            handleSetActiveFileId(nextOpen[0]);
          } else if (nextFiles.length > 0) {
            handleSetActiveFileId(nextFiles[0].id);
            setOpenTabIds([nextFiles[0].id]);
            saveOpenTabsToStorage([nextFiles[0].id]);
          } else {
            handleSetActiveFileId('');
          }
        }
        showToast('info', translitEnabled ? 'फाइल मेटाइयो' : 'File Deleted', `"${targetFile.name}" ${translitEnabled ? 'हटाइयो।' : 'deleted.'}`);
      }
    });
  };

  const handleCloseTab = (id: string) => {
    const closedIdx = openTabIds.indexOf(id);
    const nextOpen = openTabIds.filter((tabId) => tabId !== id);
    setOpenTabIds(nextOpen);
    saveOpenTabsToStorage(nextOpen);

    if (activeFileId === id) {
      if (nextOpen.length > 0) {
        const nextIdx = Math.min(closedIdx, nextOpen.length - 1);
        handleSetActiveFileId(nextOpen[nextIdx]);
      } else {
        handleSetActiveFileId('');
      }
    }
  };

  const handleCloseOthers = (id: string) => {
    const nextOpen = [id];
    setOpenTabIds(nextOpen);
    handleSetActiveFileId(id);
    saveOpenTabsToStorage(nextOpen);
  };

  const handleResetWorkspace = () => {
    const i18nModals = getI18n(translitEnabled).modals;
    setConfirmDialog({
      isOpen: true,
      title: i18nModals.resetTitle,
      message: i18nModals.resetMessage,
      confirmLabel: i18nModals.resetConfirm,
      cancelLabel: i18nModals.resetCancel,
      variant: 'danger',
      onConfirm: () => {
        const defaultFiles: CodeFile[] = [{ id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }];
        setFiles(defaultFiles);
        setOpenTabIds(['1']);
        handleSetActiveFileId('1');
        saveFilesToStorage(defaultFiles);
        saveOpenTabsToStorage(['1']);
        showToast('info', translitEnabled ? 'कार्यक्षेत्र रिसेट भयो' : 'Workspace Reset', translitEnabled ? 'फाइलहरू पूर्वनिर्धारित अवस्थामा फर्किए।' : 'Files restored to default.');
      }
    });
  };

  const handleRenameFile = (id: string, newName: string) => {
    const validatedName = ensureNepaliExtension(newName);
    const nextFiles = files.map((f) => (f.id === id ? { ...f, name: validatedName } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
    showToast('success', 'नाम परिवर्तन भयो', `फाइलको नयाँ नाम: "${validatedName}"`);
  };

  const handleUpdateContent = (id: string, newContent: string) => {
    setIsSaved(false);
    const nextFiles = files.map((f) => (f.id === id ? { ...f, content: newContent } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
  };

  const handleSelectExample = (ex: RecipeItem) => {
    const ext = translitEnabled ? '.नेपाली' : '.nep';
    const exampleFileName = `${ex.id}${ext}`;
    const existingFile = files.find((f) => f.name === exampleFileName);
    if (existingFile) {
      if (!openTabIds.includes(existingFile.id)) {
        const nextOpen = [...openTabIds, existingFile.id];
        setOpenTabIds(nextOpen);
        saveOpenTabsToStorage(nextOpen);
      }
      handleSetActiveFileId(existingFile.id);
      showToast('info', translitEnabled ? 'उदाहरण खोलियो' : 'Example Opened', `"${exampleFileName}" ${translitEnabled ? 'पहिल्यै खुला छ।' : 'is already open.'}`);
      return;
    }

    const newId = String(Date.now());
    const newFile: CodeFile = {
      id: newId,
      name: exampleFileName,
      content: ex.code,
    };
    const nextFiles = [...files, newFile];
    const nextOpen = [...openTabIds, newId];
    setFiles(nextFiles);
    setOpenTabIds(nextOpen);
    handleSetActiveFileId(newId);
    saveFilesToStorage(nextFiles);
    saveOpenTabsToStorage(nextOpen);
    showToast('success', translitEnabled ? 'उदाहरण लोड भयो' : 'Example Loaded', `"${ex.nepaliTitle}" (${exampleFileName})`);
  };

  const handleInsertCode = (snippet: string) => {
    if (!activeFile) return;
    const updated = activeFile.content + '\n\n' + snippet;
    handleUpdateContent(activeFile.id, updated);
    showToast('info', translitEnabled ? 'कोड घुसाइयो' : 'Code Inserted', translitEnabled ? 'स्निपेट सक्रिय सम्पादकमा थपियो।' : 'Snippet inserted into editor.');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060911] text-slate-100 selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <Navbar
        onRun={handleRun}
        isRunning={isRunning}
        mode={mode}
        onModeChange={handleSetMode}
        translitEnabled={translitEnabled}
        onToggleTranslit={() => {
          handleSetTranslitEnabled((prev) => {
            const next = !prev;
            showToast('info', next ? 'नेपाली टाइप मोड' : 'English Type Mode', 'F2 थिचेर टगल गर्नुहोस्');
            return next;
          });
        }}
        onToggleSidebar={() => handleSetActiveSidebarTab((prev) => (prev ? null : 'files'))}
        isSidebarOpen={!!activeSidebarTab}
        onToggleAi={() => handleSetIsAiOpen((prev) => !prev)}
        onToggleInspector={() => handleSetIsTerminalOpen((prev) => !prev)}
        onOpenShare={() => setIsShareOpen(true)}
        isAiOpen={isAiOpen}
        isInspectorOpen={isTerminalOpen}
      />

      {/* Main IDE Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          translitEnabled={translitEnabled}
          onSelectTab={handleSetActiveSidebarTab}
          isAiOpen={isAiOpen}
          onToggleAi={() => handleSetIsAiOpen((prev) => !prev)}
          isInspectorOpen={isTerminalOpen}
          onToggleInspector={() => handleSetIsTerminalOpen((prev) => !prev)}
          onRun={handleRun}
          isRunning={isRunning}
          mode={mode}
          onModeChange={handleSetMode}
        />

        {/* Center/Right Layout: Top Panes (Sidebar + Editor + AI) + Full-Width Bottom Terminal Dock */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#060911]">
          {/* Upper Workspace: Sidebars & Editor */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            {/* Collapsible Left Sidebar (Files, Examples, Cheatsheet) */}
            {activeSidebarTab && (
              <Sidebar
                activeTab={activeSidebarTab}
                translitEnabled={translitEnabled}
                onClose={() => handleSetActiveSidebarTab(null)}
                files={files}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onCloseTab={handleCloseTab}
                onSelectExample={handleSelectExample}
                onInsertCode={handleInsertCode}
                onResetWorkspace={handleResetWorkspace}
              />
            )}

            {/* Center Editor */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#060911]">
              <Editor
                files={openFiles}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
                onUpdateContent={handleUpdateContent}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onCloseTab={handleCloseTab}
                onCloseOthers={handleCloseOthers}
                translitEnabled={translitEnabled}
                onRun={handleRun}
                onSave={handleManualSave}
                isSaved={isSaved}
                onToggleTranslit={() => handleSetTranslitEnabled((prev) => !prev)}
                onOpenAi={() => handleSetIsAiOpen(true)}
                onOpenExplorer={() => handleSetActiveSidebarTab('files')}
              />
            </main>

            {/* Right Drawer: AI Assistant */}
            <AiAssistant
              isOpen={isAiOpen}
              translitEnabled={translitEnabled}
              onClose={() => handleSetIsAiOpen(false)}
              currentCode={activeFile?.content || ''}
              onInsertCode={handleInsertCode}
            />
          </div>

          {/* Bottom Dock: Full-Width Collapsible Terminal & Inspector */}
          <Terminal
            isOpen={isTerminalOpen}
            translitEnabled={translitEnabled}
            onClose={() => handleSetIsTerminalOpen(false)}
            result={result}
            isRunning={isRunning}
            onClear={() => {
              setResult(null);
              showToast('info', 'कन्सोल सफा गरियो', 'सबै आउटपुट हटाइयो।');
            }}
            code={activeFile?.content || ''}
          />
        </div>
      </div>

      {/* Interactive Input Dialog Modal for in-program input() */}
      <InputModal request={promptRequest} />

      {/* Custom Confirmation Modal for Destructive Actions */}
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {/* App-Level Toast Notifications Stack */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Share Code Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        code={activeFile?.content || ''}
        fileName={activeFile?.name || 'main.nep'}
      />
    </div>
  );
}
