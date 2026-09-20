'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ActivityBar, ActiveSidebarTab } from '../components/ActivityBar';
import { Sidebar } from '../components/Sidebar';
import { Editor } from '../components/Editor';
import { Terminal } from '../components/Terminal';
import { AiAssistant } from '../components/AiAssistant';
import { ShareModal } from '../components/ShareModal';
import { InputModal } from '../components/InputModal';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { ConfirmModal, ConfirmDialogState } from '../components/ConfirmModal';
import { engine } from '../lib/engine';
import { ExecutionResult, RunMode, PromptRequest, CodeFile, RecipeItem } from '../lib/types';
import { decodeCodeFromUrl } from '../lib/share';

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
  ACTIVE_FILE_ID: 'nepali_studio_active_file_id_v1',
  MODE: 'nepali_studio_mode_v1',
  TRANSLIT: 'nepali_studio_translit_v1',
  SIDEBAR_TAB: 'nepali_studio_sidebar_v1',
  AI_OPEN: 'nepali_studio_ai_open_v1',
  TERMINAL_OPEN: 'nepali_studio_terminal_open_v1',
};

export default function StudioPage() {
  const [files, setFiles] = useState<CodeFile[]>([
    { id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<RunMode>('os');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [translitEnabled, setTranslitEnabled] = useState<boolean>(true);
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);

  // Layout Drawers & Dock state
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('files');
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // App-level Toast Notifications & Confirm Dialogs
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: String(Date.now() + Math.random()),
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all persisted states on mount (or shared URL code)
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
      return;
    }

    try {
      // 1. Restore Files
      const savedFilesRaw = localStorage.getItem(STORAGE_KEYS.FILES);
      let loadedFiles: CodeFile[] = [];
      if (savedFilesRaw) {
        const parsed = JSON.parse(savedFilesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedFiles = parsed;
          setFiles(parsed);
        }
      }

      // 2. Restore Active File ID
      const savedActiveFileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_ID);
      if (savedActiveFileId) {
        const targetList = loadedFiles.length > 0 ? loadedFiles : files;
        if (targetList.some((f) => f.id === savedActiveFileId)) {
          setActiveFileId(savedActiveFileId);
        } else if (targetList.length > 0) {
          setActiveFileId(targetList[0].id);
        }
      }

      // 3. Restore Run Mode
      const savedMode = localStorage.getItem(STORAGE_KEYS.MODE) as RunMode;
      if (savedMode && ['os', 'wasm', 'sandbox'].includes(savedMode)) {
        setMode(savedMode);
      }

      // 4. Restore Transliteration State
      const savedTranslit = localStorage.getItem(STORAGE_KEYS.TRANSLIT);
      if (savedTranslit !== null) {
        setTranslitEnabled(savedTranslit === 'true');
      }

      // 5. Restore Sidebar Active Tab
      const savedSidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_TAB);
      if (savedSidebar !== null) {
        if (savedSidebar === 'null' || savedSidebar === '') {
          setActiveSidebarTab(null);
        } else if (['files', 'examples', 'cheatsheet'].includes(savedSidebar)) {
          setActiveSidebarTab(savedSidebar as ActiveSidebarTab);
        }
      }

      // 6. Restore AI Drawer Open State
      const savedAiOpen = localStorage.getItem(STORAGE_KEYS.AI_OPEN);
      if (savedAiOpen !== null) {
        setIsAiOpen(savedAiOpen === 'true');
      }

      // 7. Restore Terminal Open State
      const savedTerminalOpen = localStorage.getItem(STORAGE_KEYS.TERMINAL_OPEN);
      if (savedTerminalOpen !== null) {
        setIsTerminalOpen(savedTerminalOpen === 'true');
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  const saveFilesToStorage = (updatedFiles: CodeFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(updatedFiles));
      setIsSaved(true);
    } catch {
      // Ignore
    }
  };

  const handleSetActiveFileId = (id: string) => {
    setActiveFileId(id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE_ID, id);
    } catch {}
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

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

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
  }, [activeFile, mode, isRunning]);

  const handleManualSave = () => {
    saveFilesToStorage(files);
    showToast('success', 'फाइल सुरक्षित गरियो', `"${activeFile?.name || 'फाइल'}" सफलतापूर्वक सुरक्षित गरियो।`);
  };

  const handleAddFile = () => {
    const newId = String(Date.now());
    const newFileName = `file_${files.length + 1}.nep`;
    const newFile: CodeFile = {
      id: newId,
      name: newFileName,
      content: '// नयाँ नेपाली फाइल\nभनौँ("नमस्ते")।\n'
    };
    const nextFiles = [...files, newFile];
    setFiles(nextFiles);
    handleSetActiveFileId(newId);
    saveFilesToStorage(nextFiles);
    showToast('success', 'नयाँ फाइल सिर्जना गरियो', `"${newFileName}" फाइल थपियो।`);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) {
      showToast('warning', 'फाइल मेटाउन मिल्दैन', 'परियोजनामा कम्तिमा एउटा फाइल हुनैपर्छ।');
      return;
    }
    const targetFile = files.find((f) => f.id === id);
    if (!targetFile) return;

    // Custom non-native confirmation modal
    setConfirmDialog({
      isOpen: true,
      title: 'फाइल मेटाउनुहोस् (Delete File)',
      message: `के तपाईं "${targetFile.name}" फाइल निश्चित रूपमा मेटाउन चाहनुहुन्छ? यो प्रक्रिया उल्टाउन सकिँदैन।`,
      confirmLabel: 'मेटाउनुहोस् (Delete)',
      cancelLabel: 'रद्द गर्नुहोस् (Cancel)',
      variant: 'danger',
      onConfirm: () => {
        const nextFiles = files.filter((f) => f.id !== id);
        setFiles(nextFiles);
        if (activeFileId === id) {
          handleSetActiveFileId(nextFiles[0].id);
        }
        saveFilesToStorage(nextFiles);
        showToast('info', 'फाइल मेटाइयो', `"${targetFile.name}" हटाइयो।`);
      }
    });
  };

  const handleRenameFile = (id: string, newName: string) => {
    const nextFiles = files.map((f) => (f.id === id ? { ...f, name: newName } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
    showToast('success', 'नाम परिवर्तन भयो', `फाइलको नयाँ नाम: "${newName}"`);
  };

  const handleUpdateContent = (id: string, newContent: string) => {
    setIsSaved(false);
    const nextFiles = files.map((f) => (f.id === id ? { ...f, content: newContent } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
  };

  const handleSelectExample = (ex: RecipeItem) => {
    const newId = String(Date.now());
    const newFileName = `${ex.id}.nep`;
    const newFile: CodeFile = {
      id: newId,
      name: newFileName,
      content: ex.code
    };
    const nextFiles = [...files, newFile];
    setFiles(nextFiles);
    handleSetActiveFileId(newId);
    saveFilesToStorage(nextFiles);
    showToast('success', 'उदाहरण लोड भयो', `"${ex.nepaliTitle}" नयाँ फाइलमा लोड गरियो।`);
  };

  const handleInsertCode = (snippet: string) => {
    if (!activeFile) return;
    const updated = activeFile.content + '\n\n' + snippet;
    handleUpdateContent(activeFile.id, updated);
    showToast('info', 'कोड घुसाइयो', 'स्निपेट सक्रिय सम्पादकमा थपियो।');
  };

  const handleResetWorkspace = () => {
    // Custom non-native confirmation modal
    setConfirmDialog({
      isOpen: true,
      title: 'कार्यक्षेत्र रिसेट गर्नुहोस् (Reset Workspace)',
      message: 'के तपाईं सबै सिर्जना गरिएका फाइलहरू हटाएर पूर्वनिर्धारित कोडमा रिसेट गर्न चाहनुहुन्छ? यो प्रक्रिया उल्टाउन सकिँदैन।',
      confirmLabel: 'हो, रिसेट गर्नुहोस् (Reset All)',
      cancelLabel: 'रद्द गर्नुहोस् (Cancel)',
      variant: 'danger',
      onConfirm: () => {
        const resetFiles: CodeFile[] = [
          { id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }
        ];
        setFiles(resetFiles);
        handleSetActiveFileId('1');
        saveFilesToStorage(resetFiles);
        try {
          localStorage.removeItem(STORAGE_KEYS.FILES);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_FILE_ID);
        } catch {}
        showToast('warning', 'कार्यक्षेत्र रिसेट भयो', 'सबै फाइलहरू पूर्वनिर्धारित अवस्थामा फर्काइयो।');
      }
    });
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
                onClose={() => handleSetActiveSidebarTab(null)}
                files={files}
                activeFileId={activeFileId}
                onSelectFile={handleSetActiveFileId}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onSelectExample={handleSelectExample}
                onInsertCode={handleInsertCode}
                onResetWorkspace={handleResetWorkspace}
              />
            )}

            {/* Center Editor */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#060911]">
              <Editor
                files={files}
                activeFileId={activeFileId}
                onSelectFile={handleSetActiveFileId}
                onUpdateContent={handleUpdateContent}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                translitEnabled={translitEnabled}
                onRun={handleRun}
                onSave={handleManualSave}
                isSaved={isSaved}
                onToggleTranslit={() => handleSetTranslitEnabled((prev) => !prev)}
                onOpenAi={() => handleSetIsAiOpen(true)}
              />
            </main>

            {/* Right Drawer: AI Assistant */}
            <AiAssistant
              isOpen={isAiOpen}
              onClose={() => handleSetIsAiOpen(false)}
              currentCode={activeFile?.content || ''}
              onInsertCode={handleInsertCode}
            />
          </div>

          {/* Bottom Dock: Full-Width Collapsible Terminal & Inspector (Not clogged by sidebars) */}
          <Terminal
            isOpen={isTerminalOpen}
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
