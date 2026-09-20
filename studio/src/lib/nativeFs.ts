/**
 * Native File System Bridge.
 * Links the Nepali Workspace to real physical directories on Desktop (via Tauri IPC)
 * and Web (via HTML5 File System Access API).
 */

import { CodeFile } from './types';

export interface LinkedDirectoryInfo {
  rootPath: string;
  rootName: string;
  isNativeDisk: boolean;
}

export interface NativeDirResult {
  info: LinkedDirectoryInfo;
  files: CodeFile[];
}

// In-memory handle cache for Web File System Access API
let webDirectoryHandle: any = null;
const webFileHandles = new Map<string, any>();

/**
 * Open a real directory from user's filesystem (Desktop Tauri or Web FileSystem API).
 */
export async function openRealDirectory(customPath?: string): Promise<NativeDirResult | null> {
  // 1. Desktop Tauri App Bridge
  if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
    try {
      const tauriInvoke =
        (window as any).__TAURI_INTERNALS__?.invoke ||
        (window as any).__TAURI__?.core?.invoke ||
        (window as any).__TAURI__?.invoke;

      if (typeof tauriInvoke === 'function') {
        const res: any = await tauriInvoke('open_native_directory', { path: customPath || null });
        if (res && res.rootPath) {
          const files: CodeFile[] = (res.files || []).map((f: any, idx: number) => ({
            id: f.fullPath || f.id || `file_${idx}`,
            name: f.name,
            content: f.content,
            isMain: f.name === 'main.nep' || idx === 0,
          }));

          return {
            info: {
              rootPath: res.rootPath,
              rootName: res.rootName,
              isNativeDisk: true,
            },
            files,
          };
        }
      }
    } catch (e: any) {
      if (e && typeof e === 'string' && e.includes('Cancelled')) {
        return null;
      }
      console.warn('Tauri open_native_directory error:', e);
    }
  }

  // 2. Web Modern Browser File System Access API (Chrome, Edge, etc.)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      if (!dirHandle) return null;

      webDirectoryHandle = dirHandle;
      webFileHandles.clear();

      const files: CodeFile[] = [];
      await scanWebDirectory(dirHandle, '', files);
      files.sort((a, b) => a.name.localeCompare(b.name));

      return {
        info: {
          rootPath: dirHandle.name,
          rootName: dirHandle.name,
          isNativeDisk: true,
        },
        files,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('Web showDirectoryPicker error:', err);
    }
  }

  return null;
}

async function scanWebDirectory(dirHandle: any, currentPath: string, files: CodeFile[]) {
  for await (const entry of dirHandle.values()) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.next' || entry.name === 'dist') {
      continue;
    }

    const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'file') {
      try {
        const file = await entry.getFile();
        if (file.size < 2 * 1024 * 1024) {
          const text = await file.text();
          webFileHandles.set(relPath, entry);
          files.push({
            id: relPath,
            name: relPath,
            content: text,
            isMain: relPath === 'main.nep',
          });
        }
      } catch {}
    } else if (entry.kind === 'directory') {
      await scanWebDirectory(entry, relPath, files);
    }
  }
}

/**
 * Save file content directly to real physical disk.
 */
export async function saveRealFile(
  fullPathOrRel: string,
  content: string,
  rootPath?: string
): Promise<boolean> {
  // 1. Desktop Tauri App Bridge
  if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
    try {
      const tauriInvoke =
        (window as any).__TAURI_INTERNALS__?.invoke ||
        (window as any).__TAURI__?.core?.invoke ||
        (window as any).__TAURI__?.invoke;

      if (typeof tauriInvoke === 'function') {
        const targetPath = fullPathOrRel.startsWith('/') || fullPathOrRel.includes(':\\')
          ? fullPathOrRel
          : `${rootPath}/${fullPathOrRel}`;

        await tauriInvoke('save_native_file', { fullPath: targetPath, content });
        return true;
      }
    } catch (e) {
      console.warn('Tauri save_native_file error:', e);
      return false;
    }
  }

  // 2. Web File System Access API
  if (webDirectoryHandle) {
    try {
      let handle = webFileHandles.get(fullPathOrRel);
      if (!handle) {
        // Resolve nested path
        const parts = fullPathOrRel.split('/').filter(Boolean);
        let currDir = webDirectoryHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          currDir = await currDir.getDirectoryHandle(parts[i], { create: true });
        }
        handle = await currDir.getFileHandle(parts[parts.length - 1], { create: true });
        webFileHandles.set(fullPathOrRel, handle);
      }

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.warn('Web File System save error:', err);
      return false;
    }
  }

  return false;
}

/**
 * Delete item from real disk.
 */
export async function deleteRealItem(fullPath: string): Promise<boolean> {
  if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
    try {
      const tauriInvoke =
        (window as any).__TAURI_INTERNALS__?.invoke ||
        (window as any).__TAURI__?.core?.invoke ||
        (window as any).__TAURI__?.invoke;

      if (typeof tauriInvoke === 'function') {
        await tauriInvoke('delete_native_item', { fullPath });
        return true;
      }
    } catch {}
  }
  return false;
}
