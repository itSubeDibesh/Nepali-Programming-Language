// Nepali file extension helpers supporting .nep, .nepali, .नेपाली, .नेप

export const VALID_NEPALI_EXTENSIONS = ['.nep', '.nepali', '.नेपाली', '.नेप'] as const;

export function hasNepaliExtension(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.nep') ||
    lower.endsWith('.nepali') ||
    name.endsWith('.नेपाली') ||
    name.endsWith('.नेप')
  );
}

export function ensureNepaliExtension(name: string, defaultExt = '.nep'): string {
  if (!name || !name.trim()) return `main${defaultExt}`;
  const trimmed = name.trim();
  if (hasNepaliExtension(trimmed)) {
    return trimmed;
  }
  return `${trimmed}${defaultExt}`;
}

export function getFileExtension(name: string): string {
  if (!name) return '.nep';
  const lower = name.toLowerCase();
  if (lower.endsWith('.nepali')) return '.nepali';
  if (name.endsWith('.नेपाली')) return '.नेपाली';
  if (name.endsWith('.नेप')) return '.नेप';
  if (lower.endsWith('.nep')) return '.nep';
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex !== -1) {
    return name.slice(dotIndex);
  }
  return '.nep';
}

export function getFileExtensionBadgeColor(name: string): { bg: string; text: string; label: string } {
  const ext = getFileExtension(name);
  switch (ext) {
    case '.nepali':
      return { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', label: '.nepali' };
    case '.नेपाली':
      return { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', label: '.नेपाली' };
    case '.नेप':
      return { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', label: '.नेप' };
    case '.nep':
    default:
      return { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400', label: '.nep' };
  }
}
