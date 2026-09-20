export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  size?: number;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  updateType: 'patch' | 'minor' | 'major' | null;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt?: string;
  assets?: ReleaseAsset[];
}

export const CURRENT_STUDIO_VERSION = '1.1.0';

/**
 * Parses semantic version string "1.2.3" -> [1, 2, 3]
 */
function parseSemver(v: string): [number, number, number] {
  const clean = v.trim().replace(/^v/, '');
  const parts = clean.split('.');
  const major = parseInt(parts[0] || '0', 10) || 0;
  const minor = parseInt(parts[1] || '0', 10) || 0;
  const patch = parseInt((parts[2] || '0').split('-')[0], 10) || 0;
  return [major, minor, patch];
}

/**
 * Compares two semver versions.
 * Returns 'major', 'minor', 'patch' if target > current, otherwise null.
 */
export function compareVersions(current: string, target: string): 'major' | 'minor' | 'patch' | null {
  const [cMaj, cMin, cPat] = parseSemver(current);
  const [tMaj, tMin, tPat] = parseSemver(target);

  if (tMaj > cMaj) return 'major';
  if (tMaj === cMaj && tMin > cMin) return 'minor';
  if (tMaj === cMaj && tMin === cMin && tPat > cPat) return 'patch';
  return null;
}

/**
 * Checks for updates using GitHub Releases API or Tauri Native IPC.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const currentVersion = CURRENT_STUDIO_VERSION;

  // 1. If running inside Tauri Desktop app
  if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc)) {
    try {
      const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
      if (typeof tauriInvoke === 'function') {
        const res: any = await tauriInvoke('check_for_updates', {});
        if (res && typeof res === 'object') {
          return {
            hasUpdate: Boolean(res.hasUpdate),
            updateType: res.updateType || null,
            currentVersion: res.currentVersion || currentVersion,
            latestVersion: res.latestVersion || currentVersion,
            releaseName: res.releaseName || `Nepali Studio v${res.latestVersion || currentVersion}`,
            releaseNotes: res.releaseNotes || 'नयाँ संस्करण उपलब्ध छ।',
            downloadUrl: res.downloadUrl || 'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases',
            publishedAt: res.publishedAt,
            assets: []
          };
        }
      }
    } catch (e) {
      console.warn('Tauri update check fallback:', e);
    }
  }

  // 2. Web / GitHub API check
  try {
    const res = await fetch('https://api.github.com/repos/itSubeDibesh/Nepali-Programming-Language/releases/latest', {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-cache'
    });

    if (res.ok) {
      const release = await res.json();
      const latestTag = (release.tag_name || release.name || '').replace(/^v/, '') || currentVersion;
      const updateType = compareVersions(currentVersion, latestTag);
      const assets: ReleaseAsset[] = Array.isArray(release.assets)
        ? release.assets.map((a: any) => ({
            name: a.name || '',
            downloadUrl: a.browser_download_url || '',
            size: a.size
          }))
        : [];

      return {
        hasUpdate: updateType !== null,
        updateType,
        currentVersion,
        latestVersion: latestTag,
        releaseName: release.name || `Nepali Studio v${latestTag}`,
        releaseNotes: release.body || 'बग फिक्सहरू, बाइटकोड सुधारहरू र कार्यसम्पादन वृद्धि समावेश छ।',
        downloadUrl: release.html_url || 'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases',
        publishedAt: release.published_at,
        assets
      };
    }
  } catch (err) {
    // Network or offline fallback
  }

  return {
    hasUpdate: false,
    updateType: null,
    currentVersion,
    latestVersion: currentVersion,
    releaseName: `Nepali Studio v${currentVersion}`,
    releaseNotes: 'तपाईंको स्टुडियो हालको नवीनतम संस्करण (v1.1.0) मा छ।',
    downloadUrl: 'https://github.com/itSubeDibesh/Nepali-Programming-Language/releases'
  };
}
