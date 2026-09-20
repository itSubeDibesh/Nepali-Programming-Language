// Nepali Programming Language Code Formatter & Auto-Indenter
import { toNepaliDigits } from './numbers';

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function convertCodeDigitsToNepali(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;

  while (i < n) {
    // 1. Single-line comment: // ...
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < n && code[i] !== '\n') {
        out += code[i++];
      }
      continue;
    }

    // 2. Multi-line comment: /* ... */
    if (code[i] === '/' && code[i + 1] === '*') {
      out += code[i++];
      out += code[i++];
      while (i < n && !(code[i - 1] === '*' && code[i] === '/')) {
        out += code[i++];
      }
      if (i < n) out += code[i++];
      continue;
    }

    // 3. String literals: "..." or '...'
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      out += code[i++];
      while (i < n && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < n) {
          out += code[i++];
          out += code[i++];
        } else {
          out += code[i++];
        }
      }
      if (i < n) out += code[i++];
      continue;
    }

    // 4. Convert ASCII numbers to Devanagari numerals
    if (/[0-9]/.test(code[i])) {
      out += DEVANAGARI_DIGITS[parseInt(code[i], 10)];
      i++;
      continue;
    }

    out += code[i++];
  }

  return out;
}

export function formatNepaliCode(code: string, convertDigits = true): string {
  if (!code) return '';

  const processedCode = convertDigits ? convertCodeDigitsToNepali(code) : code;
  const lines = processedCode.split('\n');
  let indentLevel = 0;
  const indentStr = '  '; // 2 spaces
  const result: string[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      // Keep at most 1 empty line
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    // Decrease indent if line starts with closing brace
    if (line.startsWith('}') || line.startsWith(']')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Indent line
    const currentIndent = indentStr.repeat(indentLevel);
    result.push(currentIndent + line);

    // Increase indent if line ends with opening brace
    if (line.endsWith('{') || line.endsWith('[')) {
      indentLevel++;
    }
  }

  return result.join('\n');
}
