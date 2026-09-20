import { ExecutionResult, RunMode } from './types';

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

  // Extract prompts from code like: इनपुट("नाम के हो?") or input('age?')
  extractPrompts(code: string): string[] {
    const prompts: string[] = [];
    const regex = /(?:इनपुट|input)\s*\(\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)')\s*\)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      prompts.push(match[1] || match[2] || 'इनपुट दिनुहोस् (Enter input):');
    }
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
      for (const promptText of prompts) {
        const userInput = await onPrompt(promptText);
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

    // 3. Mode 1: WASM Client Execution (if no input/OS calls needed)
    if (mode === 'wasm' && prompts.length === 0 && !code.includes('डाटाबेस') && !code.includes('ओएस_')) {
      try {
        const ready = await this.initWasm();
        if (ready && this.wasmModule && this.wasmModule.run) {
          const raw = this.wasmModule.run(code);
          const durationMs = Math.round(performance.now() - startTime);
          return {
            stdout: this.parseStdout(raw),
            exitCode: 0,
            durationMs,
            mode: 'wasm'
          };
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
}

export const engine = new NepaliEngine();
