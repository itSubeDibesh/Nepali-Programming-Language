import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

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
    const debugBin = path.join(projectRoot, 'crates/nepali-core/target/debug/nepali-core-cli');
    const releaseBin = path.join(projectRoot, 'crates/nepali-core/target/release/nepali-core-cli');
    const cliBin = fs.existsSync(releaseBin) ? releaseBin : fs.existsSync(debugBin) ? debugBin : null;

    return new Promise<NextResponse>((resolve) => {
      let child;
      const spawnCwd = isHostedDeployment ? sessionDir : projectRoot;

      if (cliBin) {
        child = spawn(cliBin, ['--mode', effectiveMode, scriptFile], {
          cwd: spawnCwd,
          env: {
            ...process.env,
            PYO3_USE_ABI3_FORWARD_COMPATIBILITY: '1',
            NEPALI_SCRIPT: 'devanagari',
            NEPALI_DIGITS: 'devanagari',
          },
        });
      } else {
        child = spawn(
          'cargo',
          ['run', '--quiet', '--manifest-path', path.join(projectRoot, 'crates/nepali-core/Cargo.toml'), '--', '--mode', effectiveMode, scriptFile],
          {
            cwd: spawnCwd,
            env: {
              ...process.env,
              PYO3_USE_ABI3_FORWARD_COMPATIBILITY: '1',
              NEPALI_SCRIPT: 'devanagari',
              NEPALI_DIGITS: 'devanagari',
            },
          }
        );
      }

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // If interactive inputs were provided, write them to stdin
      if (Array.isArray(inputs) && inputs.length > 0) {
        child.stdin.write(inputs.join('\n') + '\n');
      }
      child.stdin.end();

      const timer = setTimeout(() => {
        child.kill();
        // Clean up ephemeral sandbox
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (_) {}

        resolve(
          NextResponse.json({
            stdout: stdout ? stdout.split('\n').filter(Boolean) : [],
            stderr: 'समय समाप्त भयो (Execution timed out after 15 seconds)',
            exitCode: 124,
          })
        );
      }, 15000);

      child.on('close', (code) => {
        clearTimeout(timer);
        // Clean up ephemeral sandbox
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (_) {}

        resolve(
          NextResponse.json({
            stdout: stdout ? stdout.split('\n').filter((l) => l.trim().length > 0) : [],
            stderr: stderr && stderr.trim().length > 0 ? stderr.trim() : undefined,
            exitCode: code || 0,
          })
        );
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        // Clean up ephemeral sandbox
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (_) {}

        resolve(
          NextResponse.json({
            stdout: [],
            stderr: err.message || String(err),
            exitCode: 1,
          })
        );
      });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
