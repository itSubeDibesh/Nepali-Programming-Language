// Nepali Programming Language Code Formatter & Auto-Indenter

export function formatNepaliCode(code: string): string {
  if (!code) return '';
  const lines = code.split('\n');
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

    // Format operators and spacing around Nepali punctuation if needed
    const currentIndent = indentStr.repeat(indentLevel);
    result.push(currentIndent + line);

    // Increase indent if line ends with opening brace
    if (line.endsWith('{') || line.endsWith('[')) {
      indentLevel++;
    }
  }

  return result.join('\n');
}
