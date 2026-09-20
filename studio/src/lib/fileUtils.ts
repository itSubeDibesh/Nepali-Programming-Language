// Nepali file extension & naming helpers supporting .nep, .nepali, .नेपाली, .नेप
import { transliterateWord } from './translit';
import { toNepaliDigits } from './numbers';

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

/**
 * Handles live Devanagari transliteration inside a rename text input
 */
export function handleRenameInputKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  translitEnabled: boolean,
  setValue: React.Dispatch<React.SetStateAction<string>>
) {
  if (!translitEnabled) return;

  const target = e.currentTarget;
  if (!target) return;

  // Convert numbers directly to Nepali digits in Nepali mode
  if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    const nepDigit = toNepaliDigits(e.key);
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const val = target.value;
    const newVal = val.substring(0, start) + nepDigit + val.substring(end);
    setValue(newVal);
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + nepDigit.length;
    }, 0);
    return;
  }

  // Word trigger on space or separator
  if (e.key === ' ' || e.key === '_' || e.key === '-' || e.key === '.') {
    const pos = target.selectionStart || 0;
    const text = target.value;

    let wordStart = pos - 1;
    while (wordStart >= 0 && /[a-zA-Z0-9]/.test(text[wordStart])) {
      wordStart--;
    }
    wordStart++;

    if (wordStart < pos) {
      const rawWord = text.substring(wordStart, pos);
      const nepaliWord = transliterateWord(rawWord);
      if (nepaliWord !== rawWord) {
        e.preventDefault();
        const sep = e.key;
        const newText = text.substring(0, wordStart) + nepaliWord + sep + text.substring(pos);
        setValue(newText);
        const newCursorPos = wordStart + nepaliWord.length + sep.length;
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = newCursorPos;
        }, 0);
      }
    }
  }
}
