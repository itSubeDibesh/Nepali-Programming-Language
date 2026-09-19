export type RunMode = 'wasm' | 'os' | 'sandbox';

export interface CodeFile {
  id: string;
  name: string;
  content: string;
  isMain?: boolean;
}

export interface ExecutionResult {
  stdout: string[];
  stderr?: string;
  exitCode: number;
  durationMs: number;
  mode: RunMode;
}

export interface PromptRequest {
  id: string;
  prompt: string;
  resolve: (answer: string) => void;
}

export interface RecipeItem {
  id: string;
  title: string;
  nepaliTitle: string;
  category: 'basics' | 'dates' | 'input' | 'math' | 'loops' | 'arrays' | 'sqlite' | 'agent';
  description: string;
  code: string;
}

export interface AiMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  codeSnippet?: string;
  timestamp: string;
}
