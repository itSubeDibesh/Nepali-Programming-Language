'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ActivityBar, ActiveSidebarTab } from '../components/ActivityBar';
import { Sidebar } from '../components/Sidebar';
import { Editor } from '../components/Editor';
import { Terminal } from '../components/Terminal';
import { InputModal } from '../components/InputModal';
import { ShareModal } from '../components/ShareModal';
import { AiAssistant } from '../components/AiAssistant';
import { AstInspector } from '../components/AstInspector';
import { CodeFile, ExecutionResult, PromptRequest, RecipeItem, RunMode } from '../lib/types';
import { EXAMPLES } from '../lib/examples';
import { engine } from '../lib/engine';
import { decodeCodeFromUrl } from '../lib/share';

const DEFAULT_CODE = `// नेपाली प्रोग्रामिङ भाषा स्टुडियोमा स्वागत छ!
// F2 दबाएर सिधै रोमनबाट नेपालीमा टाइप गर्नुहोस्। (उदा. aaja() -> आज())

राखौँ आजको = आज()।
भनौँ("नमस्ते नेपाल! 🇳🇵")।
भनौँ("आजको मिति:", आजको)।
भनौँ("हप्ताको बार:", हप्ताको_दिन(आजको))।

// दिनको फरक र उमेर गणना
राखौँ जन्मदिन = "2000-05-14"।
राखौँ वर्ष = उमेर(जन्मदिन);
भनौँ("उमेर:", वर्ष, "वर्ष");

राखौँ नयाँ_वर्ष = "2026-01-01"।
भनौँ("नयाँ वर्षदेखिको दिन फरक:", दिन_फरक(आजको, नयाँ_वर्ष), "दिन")।
`;

const LOCAL_STORAGE_KEY = 'nepali_studio_files_v2';

export default function StudioPage() {
  const [files, setFiles] = useState<CodeFile[]>([
    { id: '1', name: 'main.nep', content: DEFAULT_CODE, isMain: true }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [mode, setMode] = useState<RunMode>('wasm');
  const [translitEnabled, setTranslitEnabled] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);

  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('files');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // 1. Load shared code from URL hash or localStorage on mount
  useEffect(() => {
    try {
      const shared = decodeCodeFromUrl();
      if (shared) {
        const sharedFile: CodeFile = {
          id: 'shared-' + Date.now(),
          name: shared.name,
          content: shared.code,
          isMain: true,
        };
        setFiles([sharedFile]);
        setActiveFileId(sharedFile.id);
        return;
      }

      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFiles(parsed);
          setActiveFileId(parsed[0].id);
        }
      }
    } catch (_) {}
  }, []);

  // 2. Auto-save to localStorage on content/file changes
  const saveFilesToStorage = (updatedFiles: CodeFile[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedFiles));
      setIsSaved(true);
    } catch (_) {}
  };

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // 3. Global shortcut listeners (F2: Transliteration toggle, ⌘+Enter: Run, ⌘+S: Save, ⌘+J: Toggle Terminal)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setTranslitEnabled((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === '`')) {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFile?.content, mode, files]);

  const handleManualSave = () => {
    saveFilesToStorage(files);
  };

  const handleRun = async () => {
    if (!activeFile || isRunning) return;
    setIsRunning(true);
    setResult(null);
    setIsTerminalOpen(true); // Open bottom terminal on run automatically!

    const promptHandler = (promptText: string): Promise<string> => {
      return new Promise((resolve) => {
        setPromptReq({
          id: String(Date.now()),
          prompt: promptText,
          resolve: (ans: string) => {
            setPromptReq(null);
            resolve(ans);
          }
        });
      });
    };

    try {
      const execResult = await engine.runCode(activeFile.content, mode, promptHandler);
      setResult(execResult);
    } catch (e: any) {
      setResult({
        stdout: [],
        stderr: e.message || String(e),
        exitCode: 1,
        durationMs: 0,
        mode
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddFile = () => {
    const newId = String(Date.now());
    const count = files.length + 1;
    const newFile: CodeFile = {
      id: newId,
      name: `script${count}.nep`,
      content: '// नयाँ नेपाली लिपि\nलेख्नुहोस्("नमस्ते!");\n'
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
        onToggleExamples={() =>
          setActiveSidebarTab((prev) => (prev === 'examples' ? null : 'examples'))
        }
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        onOpenShare={() => setIsShareOpen(true)}
        isAiOpen={isAiOpen}
        isExamplesOpen={activeSidebarTab === 'examples'}
        isInspectorOpen={isInspectorOpen}
      />

      {/* Main IDE Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Activity Bar */}
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={(tab) => {
            if (tab === 'ai') {
              setIsAiOpen(true);
            } else if (tab === 'inspector') {
              setIsInspectorOpen(true);
            } else {
              setActiveSidebarTab(tab);
            }
          }}
          onRun={handleRun}
          isRunning={isRunning}
          mode={mode}
          onModeChange={setMode}
        />

        {/* Collapsible Sidebar (Files, Examples, Cheatsheet) */}
        {activeSidebarTab && activeSidebarTab !== 'ai' && activeSidebarTab !== 'inspector' && (
          <Sidebar
            activeTab={activeSidebarTab}
            onClose={() => setActiveSidebarTab(null)}
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onSelectExample={handleSelectExample}
            onInsertCode={handleInsertCode}
            onResetWorkspace={handleResetWorkspace}
          />
        )}

        {/* Center: Full-width Editor with Bottom Collapsible Terminal Dock */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#060911]">
          {/* Main Editor Pane (Full Width) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
          </div>

          {/* Bottom Dock: Collapsible Terminal & Tools */}
          <Terminal
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            result={result}
            isRunning={isRunning}
            onClear={() => setResult(null)}
            code={activeFile?.content || ''}
          />
        </main>

        {/* Right Drawer: AI Assistant */}
        <AiAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          onInsertCode={handleInsertCode}
          currentCode={activeFile?.content || ''}
        />

        {/* Right Drawer: AST & Bytecode Inspector */}
        <AstInspector
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          code={activeFile?.content || ''}
        />
      </div>

      {/* Interactive Input Prompt Modal */}
      <InputModal request={promptReq} />

      {/* Share Program Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        code={activeFile?.content || ''}
        fileName={activeFile?.name || 'main.nep'}
      />
    </div>
  );
}
