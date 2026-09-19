'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Editor } from '../components/Editor';
import { Terminal } from '../components/Terminal';
import { InputModal } from '../components/InputModal';
import { AiAssistant } from '../components/AiAssistant';
import { ExamplesDrawer } from '../components/ExamplesDrawer';
import { AstInspector } from '../components/AstInspector';
import { CodeFile, ExecutionResult, PromptRequest, RecipeItem, RunMode } from '../lib/types';
import { EXAMPLES } from '../lib/examples';
import { engine } from '../lib/engine';

const DEFAULT_CODE = `// नेपाली प्रोग्रामिङ भाषा स्टुडियोमा स्वागत छ!
// F2 दबाएर सिधै रोमनबाट नेपालीमा टाइप गर्नुहोस्। (उदा. rakha -> राखौँ)

राखौँ आजको = आज()।
भनौँ("नमस्ते नेपाल! 🇳🇵")।
भनौँ("आजको मिति:", आजको)।
भनौँ("आजको बार:", हप्ताको_दिन(आजको))।

// दिनको फरक पत्ता लगाउने
राखौँ नयाँ_वर्ष = "2026-01-01"।
भनौँ("नयाँ वर्षदेखिको दिन फरक:", दिन_फरक(आजको, नयाँ_वर्ष), "दिन")।
`;

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

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

  // Global shortcut listeners (F2: Transliteration toggle, ⌘+Enter: Run)
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
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFile?.content, mode]);

  const handleRun = async () => {
    if (!activeFile || isRunning) return;
    setIsRunning(true);
    setResult(null);

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
      content: '// नयाँ नेपाली स्क्रिप्ट\nभनौँ("सुरुवात!")।\n'
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) {
      const remaining = files.filter((f) => f.id !== id);
      setActiveFileId(remaining[0].id);
    }
  };

  const handleUpdateContent = (id: string, newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, content: newContent } : f))
    );
  };

  const handleSelectExample = (ex: RecipeItem) => {
    const newId = String(Date.now());
    const newFile: CodeFile = {
      id: newId,
      name: `${ex.id}.nep`,
      content: ex.code
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
    setIsExamplesOpen(false);
  };

  const handleInsertAiCode = (snippet: string) => {
    if (!activeFile) return;
    const updated = activeFile.content + '\n\n' + snippet;
    handleUpdateContent(activeFile.id, updated);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      {/* Top Navigation */}
      <Navbar
        onRun={handleRun}
        isRunning={isRunning}
        mode={mode}
        onModeChange={setMode}
        translitEnabled={translitEnabled}
        onToggleTranslit={() => setTranslitEnabled((prev) => !prev)}
        onToggleExamples={() => setIsExamplesOpen((prev) => !prev)}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isAiOpen={isAiOpen}
        isExamplesOpen={isExamplesOpen}
        isInspectorOpen={isInspectorOpen}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Examples Drawer */}
        <ExamplesDrawer
          isOpen={isExamplesOpen}
          onClose={() => setIsExamplesOpen(false)}
          onSelectExample={handleSelectExample}
        />

        {/* Center: Editor and Terminal Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 h-3/5 md:h-full flex flex-col">
            <Editor
              files={files}
              activeFileId={activeFileId}
              onSelectFile={setActiveFileId}
              onUpdateContent={handleUpdateContent}
              onAddFile={handleAddFile}
              onDeleteFile={handleDeleteFile}
              translitEnabled={translitEnabled}
              onRun={handleRun}
            />
          </div>

          {/* Terminal Output */}
          <div className="h-2/5 md:h-full md:w-2/5 md:min-w-[340px] flex flex-col border-t md:border-t-0 md:border-l border-slate-800">
            <Terminal
              result={result}
              isRunning={isRunning}
              onClear={() => setResult(null)}
            />
          </div>
        </div>

        {/* Right Side: AI Assistant */}
        <AiAssistant
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          onInsertCode={handleInsertAiCode}
          currentCode={activeFile?.content || ''}
        />

        {/* Right Side: AST / Bytecode Inspector */}
        <AstInspector
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          code={activeFile?.content || ''}
        />
      </main>

      {/* Interactive Input Prompt Modal */}
      <InputModal request={promptReq} />
    </div>
  );
}
