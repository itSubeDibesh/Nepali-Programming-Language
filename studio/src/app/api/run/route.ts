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
    path.resolve(process.cwd(), '../../MacOS/nepali'),
    path.resolve(process.cwd(), '../MacOS/nepali'),
    path.resolve(process.cwd(), '../bin/nepali'),
    path.resolve(process.cwd(), 'nepali'),
    path.resolve(process.cwd(), '../crates/nepali-core/target/release/nepali-core-cli'),
    path.resolve(process.cwd(), '../crates/nepali-core/target/debug/nepali-core-cli'),
    path.resolve(process.cwd(), 'crates/nepali-core/target/release/nepali-core-cli'),
    path.resolve(process.cwd(), 'crates/nepali-core/target/debug/nepali-core-cli'),
    path.join(os.homedir(), '.cargo/bin/nepali'),
    path.join(os.homedir(), '.local/bin/nepali'),
    '/usr/local/bin/nepali',
    '/opt/homebrew/bin/nepali',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { code, mode, inputs } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'कोड खाली छ (Code is empty)' }, { status: 400 });
    }

    // Determine if request is from localhost / local daemon
    const hostHeader = req.headers.get('host') || '';
    const isLocalhost = hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1');
    const isHostedDeployment = process.env.VERCEL === '1' || process.env.HOSTED_STUDIO === 'true' || !isLocalhost;

    // In hosted/cloud deployment, enforce strict sandbox mode (never expose raw host filesystem)
    const effectiveMode = isHostedDeployment ? 'sandbox' : (mode === 'os' ? 'os' : 'sandbox');

    // Create unique, isolated ephemeral scratch directory per execution
    const sessionDir = path.join(os.tmpdir(), `nepali_sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}`);
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
      process.env.PATH || ''
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
      const spawnCwd = isHostedDeployment ? sessionDir : projectRoot;

      if (cliBin) {
        child = spawn(cliBin, ['--mode', effectiveMode, scriptFile], {
          cwd: spawnCwd,
          env: spawnEnv,
        });
      } else {
        child = spawn(
          'cargo',
          ['run', '--quiet', '--manifest-path', path.join(projectRoot, 'crates/nepali-core/Cargo.toml'), '--', '--mode', effectiveMode, scriptFile],
          {
            cwd: spawnCwd,
            env: spawnEnv,
          }
        );
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // If interactive inputs were provided, write them to stdin
      if (Array.isArray(inputs) && inputs.length > 0 && child.stdin) {
        child.stdin.write(inputs.join('\n') + '\n');
      }
      if (child.stdin) {
        child.stdin.end();
      }

      // Safety timeout after 15 seconds
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
        resolve(
          NextResponse.json({
            output: stdout,
            error: stderr ? `${stderr}\nसमय सकियो (Execution timed out after 15s)` : 'समय सकियो (Execution timed out after 15s)',
            exitCode: 124,
            mode: effectiveMode,
          })
        );
      }, 15000);

      child.on('error', (err) => {
        clearTimeout(timer);
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
        resolve(
          NextResponse.json({
            output: stdout,
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
            output: stdout,
            error: stderr || undefined,
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
