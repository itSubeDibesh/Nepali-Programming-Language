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

/**
 * Resolves whether a real local GGUF model + tokenizer are actually present
 * on disk. Mirrors the Rust side's discovery (host_ai.rs): env vars first,
 * then ~/.nepali-ai, ~/.cache, and system paths. When this returns null the
 * native model cannot run at all, so the route skips the CLI spawn entirely
 * and goes straight to the baked-in engine - no more pointless 3s timeouts.
 */
function resolveLocalModel(): { model: string; tokenizer: string } | null {
  const exists = (p?: string) => !!p && p.length > 0 && fs.existsSync(p);
  const envModel = process.env.NEPALI_AI_MODEL_PATH;
  const envTok = process.env.NEPALI_AI_TOKENIZER_PATH;
  if (exists(envModel) && exists(envTok)) return { model: envModel!, tokenizer: envTok! };

  const home = os.homedir();
  const candidates: Array<[string, string]> = [
    [path.join(home, '.nepali-ai', 'llm-large', 'model.gguf'), path.join(home, '.nepali-ai', 'llm-large', 'tokenizer.json')],
    [path.join(home, '.nepali-ai', 'llm-small', 'model.gguf'), path.join(home, '.nepali-ai', 'llm-small', 'tokenizer.json')],
    [path.join(home, '.nepali-ai', 'llm', 'model.gguf'), path.join(home, '.nepali-ai', 'llm', 'tokenizer.json')],
    [path.join(home, '.cache', 'nepali', 'model.gguf'), path.join(home, '.cache', 'nepali', 'tokenizer.json')],
    ['/usr/local/share/nepali-ai/llm/model.gguf', '/usr/local/share/nepali-ai/llm/tokenizer.json'],
    ['/opt/homebrew/share/nepali-ai/llm/model.gguf', '/opt/homebrew/share/nepali-ai/llm/tokenizer.json'],
  ];
  for (const [m, t] of candidates) {
    if (fs.existsSync(m) && fs.existsSync(t)) return { model: m, tokenizer: t };
  }
  return null;
}

/** Real model load + CPU inference takes 20-60s+ for a 1.5B GGUF - wait properly. */
const NATIVE_AI_TIMEOUT_MS = 180_000;

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

    // 1. Real local Rust CLI (nepali ask) - ONLY when a real GGUF model +
    //    tokenizer are actually configured on disk. Without weights the CLI
    //    can never answer, so skip it and fall back honestly instead of
    //    burning a timeout. With weights, give it a real timeout so the
    //    model genuinely finishes loading and answering.
    const cliBin = findNepaliBinary();
    const localModel = resolveLocalModel();
    if (cliBin && localModel) {
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
        }, NATIVE_AI_TIMEOUT_MS);

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
          engine: 'नेपाली नेटिभ एआई (स्थानीय Qwen GGUF मोडेल)',
        });
      }
      // Native model failed at runtime (corrupt/unsupported weights, OOM,
      // etc.) - fall through to the baked-in engine rather than erroring out.
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
