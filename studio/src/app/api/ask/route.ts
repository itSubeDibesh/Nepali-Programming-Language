import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateAutonomousAiResponse } from '../../../lib/bakedInAiEngine';

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

export async function GET() {
  return NextResponse.json({
    available: true,
    engine: 'baked-in-ai',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question || body.q || '';
    const codeContext = body.codeContext || body.code || '';
    const activeFileName = body.activeFileName || body.fileName || '';
    const files = Array.isArray(body.files) ? body.files : [];

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'प्रश्न खाली छ (Question is empty)' }, { status: 400 });
    }

    // 1. Try Local Rust CLI (nepali ask) if available
    const cliBin = findNepaliBinary();
    if (cliBin) {
      const projectRoot = path.resolve(process.cwd(), '..');
      const envPath = [
        path.join(os.homedir(), '.cargo/bin'),
        path.join(os.homedir(), '.local/bin'),
        '/opt/homebrew/bin',
        '/usr/local/bin',
        process.env.PATH || '',
      ].join(':');

      const spawnEnv = {
        ...process.env,
        PATH: envPath,
        PYO3_USE_ABI3_FORWARD_COMPATIBILITY: '1',
        NEPALI_SCRIPT: 'devanagari',
        NEPALI_DIGITS: 'devanagari',
      };

      let prompt = question;
      if (codeContext && codeContext.trim()) {
        const fileLabel = activeFileName || 'active.nep';
        prompt = `फाइल \`${fileLabel}\`:\n\`\`\`nepali\n${codeContext.trim()}\n\`\`\`\n\nप्रश्न: ${question}`;
      }

      const cliResult = await new Promise<{ answer: string; codeSnippet?: string } | null>((resolve) => {
        const child = spawn(cliBin, ['ask', prompt], {
          cwd: projectRoot,
          env: spawnEnv,
        });

        let stdout = '';
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          resolve(null);
        }, 3000);

        child.stdout?.on('data', (d) => {
          stdout += d.toString();
        });

        child.on('error', () => {
          clearTimeout(timer);
          resolve(null);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          if (code === 0 && stdout.trim().length > 0) {
            const match = stdout.match(/```(?:nepali|nep)?\s*([\s\S]*?)```/i);
            const snippet = match ? match[1].trim() : undefined;
            resolve({
              answer: stdout.trim(),
              codeSnippet: snippet,
            });
          } else {
            resolve(null);
          }
        });
      });

      if (cliResult) {
        return NextResponse.json({
          answer: cliResult.answer,
          codeSnippet: cliResult.codeSnippet,
          engine: 'नेपाली नेटिभ एआई (Native AI)',
        });
      }
    }

    // 2. Pure Autonomous Baked-In AI Engine with Multi-File Context
    const aiResult = await generateAutonomousAiResponse(question, codeContext, activeFileName, files);
    return NextResponse.json(aiResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `एआई सेवामा समस्या: ${message}` },
      { status: 500 }
    );
  }
}
