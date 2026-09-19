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
      console.warn('WASM initialization failed, falling back to server API:', e);
    }
    return false;
  }

  async runCode(
    code: string,
    mode: RunMode = 'wasm',
    onPrompt?: (promptText: string) => Promise<string>
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    // Mode 1: WASM Client Execution
    if (mode === 'wasm') {
      try {
        const ready = await this.initWasm();
        if (ready && this.wasmModule && this.wasmModule.run_nepali) {
          const raw = this.wasmModule.run_nepali(code);
          const durationMs = Math.round(performance.now() - startTime);
          
          if (raw && typeof raw === 'object') {
            return {
              stdout: raw.output || (raw.stdout ? raw.stdout.split('\n') : []),
              stderr: raw.error || raw.stderr,
              exitCode: raw.error ? 1 : 0,
              durationMs,
              mode: 'wasm'
            };
          }
          return {
            stdout: typeof raw === 'string' ? raw.split('\n') : [String(raw)],
            exitCode: 0,
            durationMs,
            mode: 'wasm'
          };
        }
      } catch (err: any) {
        console.warn('WASM execution error:', err);
      }
    }

    // Mode 2: Server API Execution (Local host runner)
    try {
      const resp = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode: mode === 'wasm' ? 'sandbox' : mode })
      });
      const data = await resp.json();
      const durationMs = Math.round(performance.now() - startTime);
      return {
        stdout: data.stdout || [],
        stderr: data.stderr || (data.error ? String(data.error) : undefined),
        exitCode: data.exitCode ?? (data.error ? 1 : 0),
        durationMs,
        mode
      };
    } catch (apiErr: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        stdout: [],
        stderr: `Execution failed: ${apiErr.message || apiErr}`,
        exitCode: 1,
        durationMs,
        mode
      };
    }
  }
}

export const engine = new NepaliEngine();
