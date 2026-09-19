import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { code, mode } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'कोड खाली छ (Code is empty)' }, { status: 400 });
    }

    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `nepali_script_${Date.now()}_${Math.random().toString(36).substring(7)}.nep`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    const projectRoot = path.resolve(process.cwd(), '..');
    const modeFlag = mode === 'os' ? '--mode os' : '--mode sandbox';

    return new Promise<NextResponse>((resolve) => {
      exec(
        `cargo run --quiet --manifest-path crates/nepali-core/Cargo.toml -- ${modeFlag} run "${tmpFile}"`,
        { cwd: projectRoot, timeout: 15000 },
        (error, stdout, stderr) => {
          try {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
          } catch (_) {}

          if (error) {
            return resolve(
              NextResponse.json({
                stdout: stdout ? stdout.split('\n').filter(Boolean) : [],
                stderr: stderr || error.message,
                exitCode: error.code || 1,
              })
            );
          }

          resolve(
            NextResponse.json({
              stdout: stdout ? stdout.split('\n').filter(Boolean) : [],
              stderr: stderr || undefined,
              exitCode: 0,
            })
          );
        }
      );
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
