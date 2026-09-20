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

const STORAGE_KEY = 'nepali_studio_files_v1';

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
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Load shared code or local storage files on mount
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
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFiles(parsed);
          setActiveFileId(parsed[0].id);
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  const saveFilesToStorage = (updatedFiles: CodeFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
      setIsSaved(true);
    } catch {
      // Ignore
    }
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
    setIsTerminalOpen(true);
    setResult(null);

    try {
      const res = await engine.runCode(activeFile.content, mode, handlePrompt);
      setResult(res);
    } catch (err: any) {
      setResult({
        stdout: [],
        stderr: err?.message || 'अज्ञात त्रुटि भयो।',
        exitCode: 1,
        durationMs: 0,
        mode
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+Enter to run, F2 for translit, Ctrl+B for Sidebar)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setTranslitEnabled((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveSidebarTab((prev) => (prev ? null : 'files'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFile, mode, isRunning]);

  const handleManualSave = () => {
    saveFilesToStorage(files);
  };

  const handleAddFile = () => {
    const newId = String(Date.now());
    const newFile: CodeFile = {
      id: newId,
      name: `file_${files.length + 1}.nep`,
      content: '// नयाँ नेपाली फाइल\nभनौँ("नमस्ते")।\n'
    };
    const nextFiles = [...files, newFile];
    setFiles(nextFiles);
    setActiveFileId(newId);
    saveFilesToStorage(nextFiles);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    if (activeFileId === id) {
      setActiveFileId(nextFiles[0].id);
    }
    saveFilesToStorage(nextFiles);
  };

  const handleRenameFile = (id: string, newName: string) => {
    const nextFiles = files.map((f) => (f.id === id ? { ...f, name: newName } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
  };

  const handleUpdateContent = (id: string, newContent: string) => {
    setIsSaved(false);
    const nextFiles = files.map((f) => (f.id === id ? { ...f, content: newContent } : f));
    setFiles(nextFiles);
    saveFilesToStorage(nextFiles);
  };

  const handleSelectExample = (ex: RecipeItem) => {
    const newId = String(Date.now());
    const newFile: CodeFile = {
      id: newId,
      name: `${ex.id}.nep`,
      content: ex.code
    };
    const nextFiles = [...files, newFile];
    setFiles(nextFiles);
    setActiveFileId(newId);
    saveFilesToStorage(nextFiles);
  };

  const handleInsertCode = (snippet: string) => {
    if (!activeFile) return;
    const updated = activeFile.content + '\n\n' + snippet;
    handleUpdateContent(activeFile.id, updated);
  };

  const handleResetWorkspace = () => {
    if (confirm('के तपाईं सबै फाइलहरू पूर्वनिर्धारितमा रिसेट गर्न चाहनुहुन्छ? (Reset workspace?)')) {
      const resetFiles: CodeFile[] = [
        { id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }
      ];
      setFiles(resetFiles);
      setActiveFileId('1');
      saveFilesToStorage(resetFiles);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060911] text-slate-100 selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <Navbar
        onRun={handleRun}
        isRunning={isRunning}
        mode={mode}
        onModeChange={setMode}
        translitEnabled={translitEnabled}
        onToggleTranslit={() => setTranslitEnabled((prev) => !prev)}
        onToggleSidebar={() => setActiveSidebarTab((prev) => (prev ? null : 'files'))}
        isSidebarOpen={!!activeSidebarTab}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        onToggleInspector={() => setIsTerminalOpen((prev) => !prev)}
        onOpenShare={() => setIsShareOpen(true)}
        isAiOpen={isAiOpen}
        isInspectorOpen={isTerminalOpen}
      />

      {/* Main IDE Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={setActiveSidebarTab}
          isAiOpen={isAiOpen}
          onToggleAi={() => setIsAiOpen((prev) => !prev)}
          isInspectorOpen={isTerminalOpen}
          onToggleInspector={() => setIsTerminalOpen((prev) => !prev)}
          onRun={handleRun}
          isRunning={isRunning}
          mode={mode}
          onModeChange={setMode}
        />

        {/* Center/Right Layout: Top Panes (Sidebar + Editor + AI) + Full-Width Bottom Terminal Dock */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#060911]">
          {/* Upper Workspace: Sidebars & Editor */}
          <div className="flex-1 flex overflow-hidden min-h-0 relative">
            {/* Collapsible Left Sidebar (Files, Examples, Cheatsheet) */}
            {activeSidebarTab && (
              <Sidebar
                activeTab={activeSidebarTab}
                onClose={() => setActiveSidebarTab(null)}
                files={files}
                activeFileId={activeFileId}
                onSelectFile={setActiveFileId}
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
                onSelectFile={setActiveFileId}
                onUpdateContent={handleUpdateContent}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                translitEnabled={translitEnabled}
                onRun={handleRun}
                onSave={handleManualSave}
                isSaved={isSaved}
              />
            </main>

            {/* Right Drawer: AI Assistant */}
            <AiAssistant
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              currentCode={activeFile?.content || ''}
              onInsertCode={handleInsertCode}
            />
          </div>

          {/* Bottom Dock: Full-Width Collapsible Terminal & Inspector (Not clogged by sidebars) */}
          <Terminal
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            result={result}
            isRunning={isRunning}
            onClear={() => setResult(null)}
            code={activeFile?.content || ''}
          />
        </div>
      </div>

      {/* Interactive Input Dialog Modal for in-program input() */}
      <InputModal request={promptRequest} />

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
