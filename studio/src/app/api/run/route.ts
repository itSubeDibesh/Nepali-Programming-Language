import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function findNepaliBinary(): string | null {
  if (process.env.NEPALI_BIN && fs.existsSync(process.env.NEPALI_BIN)) {
    return process.env.NEPALI_BIN;
  }

  const candidates = [
    // Tauri bundle: binary lives next to the app bundle's Resources
    path.resolve(process.cwd(), '../../MacOS/nepali'),
    path.resolve(process.cwd(), '../MacOS/nepali'),
    // System installs
    '/usr/local/bin/nepali',
    '/usr/bin/nepali',
    '/opt/homebrew/bin/nepali',
    // Relative paths (local dev / standalone .app bundle)
    path.resolve(process.cwd(), '../bin/nepali'),
    path.resolve(process.cwd(), 'nepali'),
    // Cargo build output (local dev)
    path.resolve(process.cwd(), '../crates/nepali-core/target/release/nepali-core-cli'),
    path.resolve(process.cwd(), '../crates/nepali-core/target/debug/nepali-core-cli'),
    path.resolve(process.cwd(), 'crates/nepali-core/target/release/nepali-core-cli'),
    path.resolve(process.cwd(), 'crates/nepali-core/target/debug/nepali-core-cli'),
    path.join(os.homedir(), '.cargo/bin/nepali'),
    path.join(os.homedir(), '.local/bin/nepali'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return null;
}

// ─── Environment detection (server-side) ────────────────────────────────────

function isHostedWebStudio(): boolean {
  // Explicit override via env var (set in deploy/ecosystem.config.cjs and Docker)
  if (process.env.HOSTED_STUDIO === 'true') return true;
  if (process.env.NEXT_PUBLIC_WEB_STUDIO === 'true') return true;
  // Serverless platforms
  if (process.env.VERCEL === '1') return true;
  if (process.env.RAILWAY_ENVIRONMENT) return true;
  return false;
}

// ─── POST /api/run ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { code, mode, inputs } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'कोड खाली छ (Code is empty)' }, { status: 400 });
    }

    const hosted = isHostedWebStudio();

    // ── Web Studio: enforce sandbox, hard-reject OS mode requests ──────────
    if (hosted && mode === 'os') {
      return NextResponse.json(
        {
          stdout: [],
          error:
            'वेब स्टुडियोमा "os" मोड अनुमति छैन। (OS mode is not permitted in Web Studio. Download the Desktop App for full OS access.)',
          exitCode: 403,
          mode: 'sandbox',
        },
        { status: 200 } // Return 200 so the UI shows the message gracefully
      );
    }

    // Effective mode: hosted always → sandbox; local → respect request
    const effectiveMode = hosted ? 'sandbox' : mode === 'os' ? 'os' : 'sandbox';

    // ── Create ephemeral scratch sandbox ───────────────────────────────────
    const sessionDir = path.join(
      os.tmpdir(),
      `nepali_sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`
    );
    fs.mkdirSync(sessionDir, { recursive: true });

    const scriptFile = path.join(sessionDir, 'main.nep');
    fs.writeFileSync(scriptFile, code, 'utf8');

    const projectRoot = path.resolve(process.cwd(), '..');
    const cliBin = findNepaliBinary();

    const envPath = [
      path.join(os.homedir(), '.cargo/bin'),
      path.join(os.homedir(), '.local/bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      process.env.PATH || '',
    ].join(':');

    const spawnEnv = {
      ...process.env,
      PATH: envPath,
      PYO3_USE_ABI3_FORWARD_COMPATIBILITY: '1',
      NEPALI_SCRIPT: 'devanagari',
      NEPALI_DIGITS: 'devanagari',
    };

    return new Promise<NextResponse>((resolve) => {
      let child;
      const spawnCwd = hosted ? sessionDir : projectRoot;

      if (cliBin) {
        child = spawn(cliBin, ['--mode', effectiveMode, scriptFile], {
          cwd: spawnCwd,
          env: spawnEnv,
        });
      } else {
        child = spawn(
          'cargo',
          [
            'run',
            '--quiet',
            '--manifest-path',
            path.join(projectRoot, 'crates/nepali-core/Cargo.toml'),
            '--',
            '--mode',
            effectiveMode,
            scriptFile,
          ],
          { cwd: spawnCwd, env: spawnEnv }
        );
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      // Feed interactive stdin inputs
      if (Array.isArray(inputs) && inputs.length > 0 && child.stdin) {
        child.stdin.write(inputs.join('\n') + '\n');
      }
      if (child.stdin) child.stdin.end();

      // Safety timeout: 15 s
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
        resolve(
          NextResponse.json({
            stdout: parseStdout(stdout),
            error: 'समय सकियो (Execution timed out after 15s)',
            exitCode: 124,
            mode: effectiveMode,
          })
        );
      }, 15_000);

      child.on('error', (err) => {
        clearTimeout(timer);
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
        resolve(
          NextResponse.json({
            stdout: parseStdout(stdout),
            error: `इन्जिन चलाउन सकिएन (Failed to spawn engine): ${err.message}`,
            exitCode: 1,
            mode: effectiveMode,
          })
        );
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
        resolve(
          NextResponse.json({
            stdout: parseStdout(stdout),
            stderr: stderr || undefined,
            exitCode: code ?? 0,
            mode: effectiveMode,
          })
        );
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `सर्भरमा त्रुटि (Internal Server Error): ${message}` },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseStdout(raw: string): string[] {
  if (!raw || raw.length === 0) return [];
  const lines = raw.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
