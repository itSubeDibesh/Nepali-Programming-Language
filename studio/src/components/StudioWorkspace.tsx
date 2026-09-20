'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { ActivityBar, ActiveSidebarTab } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { Terminal } from './Terminal';
import { AiAssistant } from './AiAssistant';
import { ShareModal } from './ShareModal';
import { DownloadModal } from './DownloadModal';
import { InputModal } from './InputModal';
import { AstInspector } from './AstInspector';
import { UpdateModal } from './UpdateModal';
import { ToastContainer, ToastMessage } from './Toast';
import { ConfirmModal, ConfirmDialogState } from './ConfirmModal';
import { ContextMenu } from './ContextMenu';
import { formatNepaliCode } from '../lib/formatter';
import { copyToClipboard, readFromClipboard } from '../lib/clipboard';
import { engine } from '../lib/engine';
import { checkForAppUpdates, UpdateInfo } from '../lib/updateChecker';
import { checkAiAvailability } from '../lib/aiChecker';
import { ExecutionResult, RunMode, PromptRequest, CodeFile, RecipeItem } from '../lib/types';
import { decodeCodeFromUrl } from '../lib/share';
import { ensureNepaliExtension } from '../lib/fileUtils';
import { toNepaliDigits } from '../lib/numbers';
import { getI18n } from '../lib/i18n';
import { getAvailableModes, isLocalEnvironment } from '../lib/env';
import { openRealDirectory, saveRealFile, deleteRealItem, LinkedDirectoryInfo } from '../lib/nativeFs';

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
  LAST_RESULT: 'nepali_studio_last_result_v1',
  LINKED_DIR: 'nepali_studio_linked_dir_v1',
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
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [{ id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }];
}

function getInitialOpenTabs(initialFiles: CodeFile[]): string[] {
  if (initialFiles.length === 0) return [];
  if (typeof window === 'undefined') {
    return initialFiles.map((f) => f.id);
  }
  try {
    const shared = decodeCodeFromUrl();
    if (shared) return ['shared'];
    const saved = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id) => initialFiles.some((f) => f.id === id));
        return valid;
      }
    }
  } catch {}
  return initialFiles.map((f) => f.id);
}

function getInitialActiveFileId(initialFiles: CodeFile[]): string {
  if (initialFiles.length === 0) return '';
  if (typeof window === 'undefined') return initialFiles[0]?.id || '1';
  try {
    const shared = decodeCodeFromUrl();
    if (shared) return 'shared';
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_ID);
    if (saved && initialFiles.some((f) => f.id === saved)) {
      return saved;
    }
  } catch {}
  return initialFiles[0]?.id || '';
}

function getInitialLinkedDir(): LinkedDirectoryInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LINKED_DIR);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function getInitialMode(): RunMode {
  const allowed = getAvailableModes();
  if (typeof window === 'undefined') return allowed[0] || 'sandbox';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE) as RunMode;
    if (saved && allowed.includes(saved)) {
      return saved;
    }
  } catch {}
  return allowed[0] || 'sandbox';
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


function getInitialResult(): ExecutionResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_RESULT);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return null;
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
  const [result, setResultState] = useState<ExecutionResult | null>(getInitialResult);

  const setResult = (res: ExecutionResult | null | ((prev: ExecutionResult | null) => ExecutionResult | null)) => {
    setResultState((prev) => {
      const next = typeof res === 'function' ? res(prev) : res;
      try {
        if (next) localStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(next));
        else localStorage.removeItem(STORAGE_KEYS.LAST_RESULT);
      } catch {}
      return next;
    });
  };
  const [linkedDirectory, setLinkedDirectory] = useState<LinkedDirectoryInfo | null>(getInitialLinkedDir);
  const [translitEnabled, setTranslitEnabled] = useState<boolean>(getInitialTranslit);
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);

  // Layout Drawers & Dock state
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>(getInitialSidebarTab);
  const [isAiAvailable, setIsAiAvailable] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(getInitialAiOpen);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(getInitialTerminalOpen);
  const [isAstInspectorOpen, setIsAstInspectorOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState<boolean>(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  const [globalContextMenu, setGlobalContextMenu] = useState<{ x: number; y: number } | null>(null);

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

  // Check AI accessibility on startup
  useEffect(() => {
    checkAiAvailability().then((avail) => {
      setIsAiAvailable(avail);
      if (!avail) {
        setIsAiOpen(false);
      }
    });
  }, []);

  const handleCheckUpdate = useCallback(async (notifyIfLatest = false) => {
    setIsCheckingUpdate(true);
    try {
      const info = await checkForAppUpdates();
      setUpdateInfo(info);
      if (info.hasUpdate) {
        showToast(
          'info',
          'नयाँ सफ्टवेयर अपडेट उपलब्ध छ',
          `Nepali Studio v${info.latestVersion} (${info.updateType}) डाउनलोडका लागि तयार छ।`
        );
      } else if (notifyIfLatest) {
        showToast('success', 'स्टुडियो अद्यावधिक छ', `v${info.currentVersion} हालको नवीनतम संस्करण हो।`);
      }
    } catch (e) {
      if (notifyIfLatest) {
        showToast('error', 'अपडेट जाँच असफल', 'इन्टरनेट जडान वा सर्भर जाँच गर्नुहोस्।');
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [showToast]);

  // Check for updates on startup
  useEffect(() => {
    handleCheckUpdate(false);
  }, [handleCheckUpdate]);

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

    const handleOpenDownload = () => setIsDownloadOpen(true);
    const handleOpenUpdate = () => setIsUpdateOpen(true);
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setGlobalContextMenu({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('open-download-modal', handleOpenDownload);
    window.addEventListener('open-update-modal', handleOpenUpdate);
    window.addEventListener('contextmenu', handleGlobalContextMenu);

    return () => {
      window.removeEventListener('open-download-modal', handleOpenDownload);
      window.removeEventListener('open-update-modal', handleOpenUpdate);
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
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
    const allowed = getAvailableModes();
    if (!allowed.includes(newMode)) return;
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

  const handleManualSave = async () => {
    saveFilesToStorage(files);
    if (linkedDirectory && activeFile) {
      const ok = await saveRealFile(activeFile.name, activeFile.content, linkedDirectory.rootPath);
      if (ok) {
        setIsSaved(true);
        showToast('success', translitEnabled ? 'डिस्कमा सुरक्षित गरियो' : 'Saved to Disk', `"${activeFile.name}" ${translitEnabled ? 'वास्तविक फाइलमा लेखियो।' : 'saved to disk file.'}`);
        return;
      }
    }
    showToast('success', translitEnabled ? 'फाइल सुरक्षित गरियो' : 'File Saved', `"${activeFile?.name || 'फाइल'}" ${translitEnabled ? 'सफलतापूर्वक सुरक्षित गरियो।' : 'saved.'}`);
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

  const handleAddFile = (folderPrefix?: string) => {
    const newId = String(Date.now());
    const ext = translitEnabled ? '.नेपाली' : '.nep';
    const baseName = `कार्यक्रम_${files.length + 1}${ext}`;
    const newFileName = folderPrefix ? `${folderPrefix}/${baseName}` : baseName;
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

  const handleAddFolder = (folderName: string) => {
    const cleanFolder = folderName.replace(/\/+$/, '').trim();
    if (!cleanFolder) return;
    const ext = translitEnabled ? '.नेपाली' : '.nep';
    const newFileName = `${cleanFolder}/main${ext}`;
    const newId = String(Date.now());
    const newFile: CodeFile = {
      id: newId,
      name: newFileName,
      content: `// ${cleanFolder} फोल्डर भित्रको मुख्य फाइल\nभनौँ("नमस्ते ${cleanFolder} बाट!");\n`
    };
    const nextFiles = [...files, newFile];
    const nextOpen = [...openTabIds, newId];
    setFiles(nextFiles);
    setOpenTabIds(nextOpen);
    handleSetActiveFileId(newId);
    saveFilesToStorage(nextFiles);
    saveOpenTabsToStorage(nextOpen);
    showToast('success', translitEnabled ? 'नयाँ फोल्डर सिर्जना गरियो' : 'New Folder Created', `"${cleanFolder}" (${newFileName})`);
  };

  const handleRenameFolder = (oldPath: string, newPath: string) => {
    const cleanOld = oldPath.replace(/\/+$/, '');
    const cleanNew = newPath.replace(/\/+$/, '');
    if (!cleanNew || cleanOld === cleanNew) return;

    const nextFiles = files.map((f) => {
      if (f.name.startsWith(cleanOld + '/')) {
        return {
          ...f,
          name: cleanNew + '/' + f.name.slice(cleanOld.length + 1)
        };
      }
      return f;
    });

    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
    showToast('success', 'फोल्डरको नाम बदलियो', `"${cleanOld}" → "${cleanNew}"`);
  };

  const handleMoveFile = (fileId: string, targetFolder: string | null) => {
    const targetFile = files.find((f) => f.id === fileId);
    if (!targetFile) return;

    const parts = targetFile.name.split('/').filter(Boolean);
    const baseName = parts[parts.length - 1];
    const cleanTarget = targetFolder ? targetFolder.replace(/\/+$/, '').trim() : '';

    let newFullName = cleanTarget ? `${cleanTarget}/${baseName}` : baseName;

    if (newFullName === targetFile.name) {
      showToast('info', 'फाइल त्यहीँ छ', `"${baseName}" पहिले नै यो स्थानमा छ।`);
      return;
    }

    let counter = 1;
    while (files.some((f) => f.id !== fileId && f.name === newFullName)) {
      const dotIdx = baseName.lastIndexOf('.');
      const rawName = dotIdx !== -1 ? baseName.substring(0, dotIdx) : baseName;
      const ext = dotIdx !== -1 ? baseName.substring(dotIdx) : '';
      const altBase = `${rawName}_${counter}${ext}`;
      newFullName = cleanTarget ? `${cleanTarget}/${altBase}` : altBase;
      counter++;
    }

    const nextFiles = files.map((f) => {
      if (f.id === fileId) {
        return {
          ...f,
          name: newFullName,
        };
      }
      return f;
    });

    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);

    const destLabel = cleanTarget ? `"${cleanTarget}/"` : 'मूल डाइरेक्टरी (Root)';
    showToast('success', translitEnabled ? 'फाइल सारियो' : 'File Moved', `"${baseName}" → ${destLabel}`);
  };

  const handleOpenRealFolder = async () => {
    try {
      const result = await openRealDirectory();
      if (!result) return;
      setLinkedDirectory(result.info);
      setFiles(result.files);
      const tabIds = result.files.map((f) => f.id);
      setOpenTabIds(tabIds);
      if (result.files.length > 0) {
        handleSetActiveFileId(result.files[0].id);
      } else {
        handleSetActiveFileId('');
      }
      saveFilesToStorage(result.files);
      saveOpenTabsToStorage(tabIds);
      try {
        localStorage.setItem(STORAGE_KEYS.LINKED_DIR, JSON.stringify(result.info));
      } catch {}
      showToast('success', translitEnabled ? 'डाइरेक्टरी लिङ्क गरियो' : 'Directory Linked', `"${result.info.rootName}" (${toNepaliDigits(result.files.length)} ${translitEnabled ? 'फाइलहरू' : 'files'})`);
    } catch (err: any) {
      showToast('error', 'डाइरेक्टरी खोल्न सकिएन', err?.message || 'अज्ञात त्रुटि');
    }
  };

  const handleUnlinkFolder = () => {
    setLinkedDirectory(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.LINKED_DIR);
    } catch {}
    showToast('info', translitEnabled ? 'फोल्डर विच्छेद भयो' : 'Folder Unlinked', translitEnabled ? 'कार्यक्षेत्र स्थानीय मोडमा फर्कियो।' : 'Workspace returned to local mode.');
  };

  const handleSyncFolder = async () => {
    if (!linkedDirectory) return;
    try {
      const result = await openRealDirectory(linkedDirectory.rootPath);
      if (result) {
        setFiles(result.files);
        saveFilesToStorage(result.files);
        showToast('success', translitEnabled ? 'पुनः सिङ्क गरियो' : 'Folder Synced', `${toNepaliDigits(result.files.length)} ${translitEnabled ? 'फाइलहरू सिङ्क भए।' : 'files synced.'}`);
      }
    } catch (e: any) {
      showToast('error', 'सिङ्क असफल', e?.message || 'त्रुटि');
    }
  };

  const handleDeleteFolder = (folderPath: string) => {
    const cleanPath = folderPath.replace(/\/+$/, '');
    const targetFiles = files.filter((f) => f.name.startsWith(cleanPath + '/'));
    if (targetFiles.length === 0) return;

    const i18nModals = getI18n(translitEnabled).modals;
    setConfirmDialog({
      isOpen: true,
      title: 'फोल्डर मेटाउनुहोस् (Delete Folder)',
      message: `के तपाईं "${cleanPath}" फोल्डर र यस भित्रका ${targetFiles.length} फाइलहरू मेटाउन चाहनुहुन्छ?`,
      confirmLabel: i18nModals.deleteConfirm,
      cancelLabel: i18nModals.deleteCancel,
      variant: 'danger',
      onConfirm: async () => {
        const targetIds = new Set(targetFiles.map((f) => f.id));
        const nextFiles = files.filter((f) => !targetIds.has(f.id));
        const nextOpen = openTabIds.filter((tabId) => !targetIds.has(tabId));
        setFiles(nextFiles);
        setOpenTabIds(nextOpen);
        saveFilesToStorage(nextFiles);
        saveOpenTabsToStorage(nextOpen);

        if (linkedDirectory) {
          for (const f of targetFiles) {
            await deleteRealItem(f.id);
          }
        }

        if (targetIds.has(activeFileId)) {
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
        showToast('info', translitEnabled ? 'फोल्डर मेटाइयो' : 'Folder Deleted', `"${cleanPath}" ${translitEnabled ? 'हटाइयो।' : 'deleted.'}`);
      }
    });
  };

  const handleDeleteFile = (id: string) => {
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
      onConfirm: async () => {
        const nextFiles = files.filter((f) => f.id !== id);
        const nextOpen = openTabIds.filter((tabId) => tabId !== id);
        setFiles(nextFiles);
        setOpenTabIds(nextOpen);
        saveFilesToStorage(nextFiles);
        saveOpenTabsToStorage(nextOpen);

        if (linkedDirectory) {
          await deleteRealItem(targetFile.id);
        }

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

  const handleCloseToRight = (id: string) => {
    const idx = openTabIds.indexOf(id);
    if (idx === -1) return;
    const nextOpen = openTabIds.slice(0, idx + 1);
    setOpenTabIds(nextOpen);
    saveOpenTabsToStorage(nextOpen);
    if (!nextOpen.includes(activeFileId)) {
      handleSetActiveFileId(id);
    }
  };

  const handleCloseAll = () => {
    setOpenTabIds([]);
    handleSetActiveFileId('');
    saveOpenTabsToStorage([]);
  };

  const handleResetWorkspace = () => {
    const i18nModals = getI18n(translitEnabled).modals;
    setConfirmDialog({
      isOpen: true,
      title: i18nModals.resetTitle,
      message: translitEnabled
        ? 'कार्यक्षेत्रलाई पूर्वनिर्धारित फाइलमा फर्काउने वा पूर्ण रूपमा खाली गर्ने?'
        : 'Restore default template files or clear workspace completely?',
      confirmLabel: translitEnabled ? 'पूर्वनिर्धारित लोड गर्नुहोस्' : 'Restore Default',
      cancelLabel: translitEnabled ? 'कार्यक्षेत्र खाली गर्नुहोस् (Clear)' : 'Clear Empty',
      variant: 'warning',
      onConfirm: () => {
        const defaultFiles: CodeFile[] = [{ id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }];
        setFiles(defaultFiles);
        setOpenTabIds(['1']);
        handleSetActiveFileId('1');
        saveFilesToStorage(defaultFiles);
        saveOpenTabsToStorage(['1']);
        showToast('info', translitEnabled ? 'कार्यक्षेत्र रिसेट भयो' : 'Workspace Reset', translitEnabled ? 'फाइलहरू पूर्वनिर्धारित अवस्थामा फर्किए।' : 'Files restored to default.');
      },
      onCancel: () => {
        setFiles([]);
        setOpenTabIds([]);
        handleSetActiveFileId('');
        saveFilesToStorage([]);
        saveOpenTabsToStorage([]);
        showToast('info', translitEnabled ? 'कार्यक्षेत्र खाली भयो' : 'Workspace Cleared', translitEnabled ? 'सबै फाइलहरू हटाइयो।' : 'All files cleared.');
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

    if (linkedDirectory) {
      const target = files.find((f) => f.id === id);
      if (target) {
        saveRealFile(target.name, newContent, linkedDirectory.rootPath).then((ok) => {
          if (ok) setIsSaved(true);
        });
      }
    }
  };

  const handleSelectExample = (ex: RecipeItem, saveToFolder = false) => {
    const ext = translitEnabled ? '.नेपाली' : '.nep';
    const folderPrefix = saveToFolder ? 'उदाहरण' : '';
    const rawFileName = `${ex.id}${ext}`;
    const exampleFileName = folderPrefix ? `${folderPrefix}/${rawFileName}` : rawFileName;

    const existingFile = files.find((f) => f.name === exampleFileName || f.name === rawFileName);
    if (existingFile) {
      if (!openTabIds.includes(existingFile.id)) {
        const nextOpen = [...openTabIds, existingFile.id];
        setOpenTabIds(nextOpen);
        saveOpenTabsToStorage(nextOpen);
      }
      handleSetActiveFileId(existingFile.id);
      showToast('info', translitEnabled ? 'उदाहरण खोलियो' : 'Example Opened', `"${existingFile.name}" ${translitEnabled ? 'पहिल्यै खुला छ।' : 'is already open.'}`);
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#060911] text-slate-100 selection:bg-emerald-500/30">
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
        isAiAvailable={isAiAvailable}
        isInspectorOpen={isTerminalOpen}
        onOpenDownload={() => setIsDownloadOpen(true)}
        onOpenUpdate={() => setIsUpdateOpen(true)}
        hasUpdate={Boolean(updateInfo?.hasUpdate)}
        onOpenRealFolder={handleOpenRealFolder}
        linkedDirectory={linkedDirectory}
        onUnlinkFolder={handleUnlinkFolder}
      />

      {/* Main IDE Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          translitEnabled={translitEnabled}
          onSelectTab={handleSetActiveSidebarTab}
          isAiOpen={isAiOpen}
          isAiAvailable={isAiAvailable}
          onToggleAi={() => handleSetIsAiOpen((prev) => !prev)}
          isInspectorOpen={isTerminalOpen}
          onToggleInspector={() => handleSetIsTerminalOpen((prev) => !prev)}
          isAstInspectorOpen={isAstInspectorOpen}
          onToggleAstInspector={() => setIsAstInspectorOpen((prev) => !prev)}
          onRun={handleRun}
          isRunning={isRunning}
          mode={mode}
          onModeChange={handleSetMode}
          onOpenDownload={() => setIsDownloadOpen(true)}
          onOpenUpdate={() => setIsUpdateOpen(true)}
          hasUpdate={Boolean(updateInfo?.hasUpdate)}
        />

        {/* Center/Right Layout: Top Panes (Sidebar + Editor + AI + Bytecode Inspector) + Full-Width Bottom Terminal Dock */}
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
                onAddFolder={handleAddFolder}
                onDeleteFile={handleDeleteFile}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onRenameFile={handleRenameFile}
                onMoveFile={handleMoveFile}
                onCloseTab={handleCloseTab}
                onSelectExample={handleSelectExample}
                onInsertCode={handleInsertCode}
                onResetWorkspace={handleResetWorkspace}
                onOpenDownload={() => setIsDownloadOpen(true)}
                onOpenUpdate={() => setIsUpdateOpen(true)}
                linkedDirectory={linkedDirectory}
                onOpenRealFolder={handleOpenRealFolder}
                onUnlinkFolder={handleUnlinkFolder}
                onSyncFolder={handleSyncFolder}
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
                onMoveFile={handleMoveFile}
                onCloseTab={handleCloseTab}
                onCloseOthers={handleCloseOthers}
                onCloseToRight={handleCloseToRight}
                onCloseAll={handleCloseAll}
                translitEnabled={translitEnabled}
                onRun={handleRun}
                onSave={handleManualSave}
                isSaved={isSaved}
                onToggleTranslit={() => handleSetTranslitEnabled((prev) => !prev)}
                onOpenAi={() => handleSetIsAiOpen(true)}
                isAiAvailable={isAiAvailable}
                onOpenExplorer={() => handleSetActiveSidebarTab('files')}
              />
            </main>

            {/* Right Drawer: AI Assistant with Auto-Adaptive Multi-File Context */}
            {isAiAvailable && (
              <AiAssistant
                isOpen={isAiOpen}
                translitEnabled={translitEnabled}
                onClose={() => handleSetIsAiOpen(false)}
                currentCode={activeFile?.content || ''}
                activeFileName={activeFile?.name || 'main.nep'}
                files={files}
                onInsertCode={handleInsertCode}
              />
            )}

            {/* Right Drawer: Real Bytecode Disassembly & AST Inspector */}
            <AstInspector
              isOpen={isAstInspectorOpen}
              onClose={() => setIsAstInspectorOpen(false)}
              code={activeFile?.content || ''}
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

      {/* Download Desktop App Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        translitEnabled={translitEnabled}
        updateInfo={updateInfo}
      />

      {/* Software Patch & Update Modal */}
      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdate}
        onRecheck={() => handleCheckUpdate(true)}
      />

      {/* Share Code Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        code={activeFile?.content || ''}
        fileName={activeFile?.name || 'main.nep'}
      />

      {/* Global Studio Context Menu */}
      {globalContextMenu && (
        <ContextMenu
          x={globalContextMenu.x}
          y={globalContextMenu.y}
          onClose={() => setGlobalContextMenu(null)}
          onRun={handleRun}
          onSave={handleManualSave}
          onFormat={() => {
            if (activeFile) {
              const formatted = formatNepaliCode(activeFile.content);
              handleUpdateContent(activeFile.id, formatted);
              showToast('success', 'ढाँचा मिल्यो', 'सक्रिय कोडको ढाँचा मिलाइयो।');
            }
          }}
          onCopy={async () => {
            if (!activeFile) return;
            const ta = document.querySelector('textarea');
            let textToCopy = activeFile.content;
            if (ta && ta.selectionStart !== ta.selectionEnd) {
              textToCopy = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            }
            const ok = await copyToClipboard(textToCopy);
            if (ok) {
              showToast('success', 'प्रतिलिपि भयो', 'चयन गरिएको कोड क्लिपबोर्डमा प्रतिलिपि गरियो।');
            }
          }}
          onCut={async () => {
            if (!activeFile) return;
            const ta = document.querySelector('textarea');
            if (ta && ta.selectionStart !== ta.selectionEnd) {
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const selected = ta.value.substring(start, end);
              await copyToClipboard(selected);
              const newVal = ta.value.substring(0, start) + ta.value.substring(end);
              handleUpdateContent(activeFile.id, newVal);
              setTimeout(() => {
                ta.focus();
                ta.selectionStart = ta.selectionEnd = start;
              }, 0);
              showToast('success', 'काटियो', 'चयन गरिएको कोड काटियो।');
            } else {
              await copyToClipboard(activeFile.content);
              handleUpdateContent(activeFile.id, '');
              showToast('success', 'काटियो', 'फाइलको सामग्री काटियो।');
            }
          }}
          onPaste={async () => {
            if (!activeFile) return;
            let text = await readFromClipboard();
            if (text === null || text === undefined) {
              text = window.prompt('यहाँ टाँस्नुहोस् (Paste code here):');
            }
            if (text) {
              const ta = document.querySelector('textarea');
              if (ta && ta.selectionStart !== undefined) {
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const val = activeFile.content;
                const safeStart = Math.min(start, val.length);
                const safeEnd = Math.min(end, val.length);
                const newVal = val.substring(0, safeStart) + text + val.substring(safeEnd);
                handleUpdateContent(activeFile.id, newVal);
                setTimeout(() => {
                  ta.focus();
                  ta.selectionStart = ta.selectionEnd = safeStart + text.length;
                }, 0);
              } else {
                handleUpdateContent(activeFile.id, activeFile.content ? `${activeFile.content}\n${text}` : text);
              }
              showToast('success', 'टाँसियो', 'क्लिपबोर्ड सामग्री सम्पादकमा थपियो।');
            }
          }}
          onSelectAll={() => {
            const ta = document.querySelector('textarea');
            if (ta) {
              ta.focus();
              ta.select();
            }
          }}
          onNewFile={() => handleAddFile()}
          onNewFolder={() => handleAddFolder('नयाँ_फोल्डर')}
          onAskAi={() => handleSetIsAiOpen(true)}
          onOpenAst={() => setIsAstInspectorOpen((prev) => !prev)}
          onOpenTerminal={() => handleSetIsTerminalOpen((prev) => !prev)}
          onToggleTranslit={() => handleSetTranslitEnabled((prev) => !prev)}
          onShare={() => setIsShareOpen(true)}
          onResetWorkspace={handleResetWorkspace}
          onDownloadApp={() => setIsDownloadOpen(true)}
          translitEnabled={translitEnabled}
          isAiAvailable={isAiAvailable}
        />
      )}
    </div>
  );
}
