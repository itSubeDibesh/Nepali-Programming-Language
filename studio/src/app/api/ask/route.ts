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
    const { q } = await req.json();
    if (!q || typeof q !== 'string') {
      return NextResponse.json({ error: 'प्रश्न खाली छ (Question is empty)' }, { status: 400 });
    }

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

      if (cliBin) {
        child = spawn(cliBin, ['ask', q], {
          cwd: projectRoot,
          env: spawnEnv,
        });
      } else {
        child = spawn(
          'cargo',
          ['run', '--quiet', '--manifest-path', path.join(projectRoot, 'crates/nepali-core/Cargo.toml'), '--', 'ask', q],
          {
            cwd: projectRoot,
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

      // AI queries might consult large offline index or call local LLM (timeout 900s)
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(
          NextResponse.json({
            error: 'AI जवाफ समय सकियो (AI response timed out)',
          }, { status: 504 })
        );
      }, 900000);

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve(
          NextResponse.json({
            error: `AI इन्जिन चलाउन सकिएन: ${err.message}`,
          }, { status: 500 })
        );
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(NextResponse.json({ text: stdout }));
        } else {
          resolve(
            NextResponse.json({
              error: stderr || stdout || 'AI जवाफ प्राप्त हुन सकेन (Failed to get AI response)',
            }, { status: 500 })
          );
        }
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
