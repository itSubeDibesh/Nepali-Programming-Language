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

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `nepali_script_${Date.now()}_${Math.random().toString(36).substring(7)}.nep`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    const projectRoot = path.resolve(process.cwd(), '..');
    const modeFlag = mode === 'os' ? 'os' : 'sandbox';

    const debugBin = path.join(projectRoot, 'crates/nepali-core/target/debug/nepali-core-cli');
    const releaseBin = path.join(projectRoot, 'crates/nepali-core/target/release/nepali-core-cli');
    const cliBin = fs.existsSync(releaseBin) ? releaseBin : fs.existsSync(debugBin) ? debugBin : null;

    return new Promise<NextResponse>((resolve) => {
      let child;
      if (cliBin) {
        child = spawn(cliBin, ['--mode', modeFlag, tmpFile], {
          cwd: projectRoot,
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
          ['run', '--quiet', '--manifest-path', 'crates/nepali-core/Cargo.toml', '--', '--mode', modeFlag, tmpFile],
          {
            cwd: projectRoot,
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
        try {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
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
        try {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
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
