import { ExecutionResult, RunMode } from './types';
import { fromNepaliDigits, toNepaliDigits } from './numbers';

export class NepaliEngine {
  private wasmModule: any = null;
  private isWasmReady = false;

  async initWasm(): Promise<boolean> {
    if (this.isWasmReady) return true;
    try {
      if (typeof window !== 'undefined') {
        const wasm = await import('../../../studio/wasm-pkg/nepali_wasm.js');
        if (wasm && wasm.default) {
          await wasm.default();
          this.wasmModule = wasm;
          this.isWasmReady = true;
          return true;
        }
      }
    } catch (e) {
      // WASM package optional in pure server mode
    }
    return false;
  }

  // Extract prompts from code, dynamically expanding loops (भएसम्म / while)
  extractPrompts(code: string): string[] {
    const prompts: string[] = [];

    function getSnippetPrompts(snippet: string): string[] {
      const list: string[] = [];
      let m;
      const r = /(?:इनपुट|inपुट|input)\s*\(\s*([^)]*)\s*\)/g;
      while ((m = r.exec(snippet)) !== null) {
        const rawArg = m[1].trim();
        if (!rawArg) {
          list.push('इनपुट दिनुहोस् (Enter input):');
        } else {
          const strMatch = rawArg.match(/^(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)')$/);
          if (strMatch) {
            list.push(strMatch[1] || strMatch[2] || 'इनपुट दिनुहोस् (Enter input):');
          } else {
            list.push(`${rawArg}:`);
          }
        }
      }
      return list;
    }

    function findInitialValue(varName: string, beforeText: string): number | null {
      const r = new RegExp(`(?:राखौँ|मानौँ|let|var)?\\s*${varName}\\s*=\\s*([०-९0-9]+)`, 'g');
      let m;
      let lastVal: number | null = null;
      while ((m = r.exec(beforeText)) !== null) {
        lastVal = parseInt(fromNepaliDigits(m[1]), 10);
      }
      return lastVal;
    }

    const loopKeywordRegex = /(?:भएसम्म|while)\s+([^{]+)\{/g;
    const loops: { start: number; end: number; condition: string; body: string }[] = [];
    let match;
    while ((match = loopKeywordRegex.exec(code)) !== null) {
      const condition = match[1].trim();
      const openBraceIndex = match.index + match[0].length - 1;
      let depth = 1;
      let i = openBraceIndex + 1;
      while (i < code.length && depth > 0) {
        if (code[i] === '{') depth++;
        else if (code[i] === '}') depth--;
        i++;
      }
      const closeBraceIndex = i - 1;
      const body = code.substring(openBraceIndex + 1, closeBraceIndex);
      loops.push({
        start: match.index,
        end: closeBraceIndex + 1,
        condition,
        body
      });
      loopKeywordRegex.lastIndex = closeBraceIndex + 1;
    }

    if (loops.length === 0) {
      return getSnippetPrompts(code);
    }

    let cursor = 0;
    for (const loop of loops) {
      // 1. Prompts before this loop
      const beforeText = code.substring(cursor, loop.start);
      prompts.push(...getSnippetPrompts(beforeText));

      // 2. Loop body prompts
      const bodyPrompts = getSnippetPrompts(loop.body);
      if (bodyPrompts.length > 0) {
        let iterations = 2; // fallback
        const condMatch = loop.condition.match(/([^\s<=>!]+)\s*(<=|<|>=|>|==)\s*([०-९0-9]+)/);
        if (condMatch) {
          const varName = condMatch[1].trim();
          const op = condMatch[2].trim();
          const limit = parseInt(fromNepaliDigits(condMatch[3]), 10);
          const initVal = findInitialValue(varName, code.substring(0, loop.start));
          const start = initVal !== null ? initVal : (op === '<=' || op === '<' ? (limit > 1 ? 1 : 0) : 0);

          if (op === '<=') {
            iterations = Math.max(1, limit - start + 1);
          } else if (op === '<') {
            iterations = Math.max(1, limit - start);
          } else {
            iterations = Math.max(1, limit);
          }
        }
        iterations = Math.min(Math.max(iterations, 1), 50);

        for (let i = 0; i < iterations; i++) {
          prompts.push(...bodyPrompts);
        }
      }
      cursor = loop.end;
    }

    // 3. Prompts after last loop
    const remainingText = code.substring(cursor);
    prompts.push(...getSnippetPrompts(remainingText));

    return prompts;
  }

  private parseStdout(raw: any): string[] {
    if (Array.isArray(raw)) {
      return raw.map(String);
    }
    if (typeof raw === 'string') {
      if (raw.length === 0) return [];
      const lines = raw.split('\n');
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      return lines;
    }
    return [];
  }

  async runCode(
    code: string,
    mode: RunMode = 'sandbox',
    onPrompt?: (promptText: string) => Promise<string>
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    // 1. Gather interactive inputs if the program contains इनपुट()
    const prompts = this.extractPrompts(code);
    const inputs: string[] = [];
    if (prompts.length > 0 && onPrompt) {
      for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        const promptLabel = prompts.length > 1 ? `${p} (${toNepaliDigits(i + 1)}/${toNepaliDigits(prompts.length)})` : p;
        const userInput = await onPrompt(promptLabel);
        inputs.push(userInput);
      }
    }

    // 2. Desktop Native Tauri / Wry IPC (if running inside standalone desktop app with native invoke)
    if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc)) {
      try {
        const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
        if (typeof tauriInvoke === 'function') {
          const res: any = await tauriInvoke('run_nepali_code', {
            code,
            mode,
            inputs
          });
          const durationMs = Math.round(performance.now() - startTime);
          return {
            stdout: this.parseStdout(res.stdout ?? res.output),
            stderr: res.stderr || (res.error ? String(res.error) : undefined),
            exitCode: res.exitCode ?? 0,
            durationMs,
            mode
          };
        }
      } catch (tauriErr: any) {
        console.warn('Native IPC fallback:', tauriErr);
      }
    }

    // 3. Mode 1: WASM Client Execution (if no host OS/DB calls needed)
    if (mode === 'wasm' && !code.includes('डाटाबेस') && !code.includes('ओएस_') && !code.includes('पाइथन_') && !code.includes('रस्ट_') && !code.includes('गो_') && !code.includes('क्यास_') && !code.includes('एआई_') && !code.includes('आदेश_')) {
      try {
        const ready = await this.initWasm();
        if (ready && this.wasmModule) {
          const raw = (prompts.length > 0 && typeof this.wasmModule.run_with_inputs === 'function')
            ? this.wasmModule.run_with_inputs(code, inputs)
            : (this.wasmModule.run ? this.wasmModule.run(code) : undefined);
          if (raw !== undefined) {
            const durationMs = Math.round(performance.now() - startTime);
            return {
              stdout: this.parseStdout(raw),
              exitCode: 0,
              durationMs,
              mode: 'wasm'
            };
          }
        }
      } catch (err: any) {
        // Fall back to server sandbox runner
      }
    }

    // 4. Mode 2: Server API Execution with Stdin Pipe
    try {
      const resp = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          mode: mode === 'wasm' ? 'sandbox' : mode,
          inputs
        })
      });

      const data = await resp.json();
      const durationMs = Math.round(performance.now() - startTime);

      const stdout = this.parseStdout(data.stdout !== undefined ? data.stdout : data.output);
      const stderr = data.stderr || (data.error ? String(data.error) : undefined);

      return {
        stdout,
        stderr,
        exitCode: data.exitCode ?? (stderr ? 1 : 0),
        durationMs,
        mode
      };
    } catch (apiErr: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        stdout: [],
        stderr: `कार्यान्वयन त्रुटि (Execution failed): ${apiErr.message || apiErr}`,
        exitCode: 1,
        durationMs,
        mode
      };
    }
  }

  async disassemble(code: string): Promise<string> {
    // 1. Try Native Desktop invoke if available
    if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc)) {
      try {
        const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
        if (typeof tauriInvoke === 'function') {
          const res = await tauriInvoke('disassemble_nepali_code', { code });
          if (res) return String(res);
        }
      } catch (e) {
        // Fallback to WASM
      }
    }

    // 2. WASM execution
    try {
      const ready = await this.initWasm();
      if (ready && this.wasmModule && this.wasmModule.disassemble) {
        return this.wasmModule.disassemble(code);
      }
    } catch (err: any) {
      return `बाइटकोड त्रुटि: ${err.message || err}`;
    }

    return '// बाइटकोड इन्जिन लोड हुन सकेन';
  }

  async astDump(code: string): Promise<string> {
    if (!code || !code.trim()) return '// कोड खाली छ (Code is empty)';

    // 1. Try Native Desktop invoke if available
    if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc)) {
      try {
        const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
        if (typeof tauriInvoke === 'function') {
          const res = await tauriInvoke('get_ast_dump', { code });
          if (res) return String(res);
        }
      } catch (e) {
        // Fallback to WASM
      }
    }

    // 2. WASM execution
    try {
      const ready = await this.initWasm();
      if (ready && this.wasmModule && this.wasmModule.ast_dump) {
        return this.wasmModule.ast_dump(code);
      }
    } catch (err: any) {
      return `AST त्रुटि: ${err.message || err}`;
    }

    return '// AST इन्स्पेक्टर उपलब्ध छैन';
  }

  async checkDiagnostics(code: string): Promise<string> {
    try {
      const ready = await this.initWasm();
      if (ready && this.wasmModule && this.wasmModule.check) {
        return this.wasmModule.check(code);
      }
    } catch (e) {
      // Ignored
    }
    return '';
  }
}

export const engine = new NepaliEngine();

