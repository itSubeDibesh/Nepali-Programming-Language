import { DOCS_CATALOG, DocItem } from './docs';
import { transliterateWord } from './translit';

export interface SuggestionItem {
  id: string;
  label: string;
  detail: string;
  category: 'keyword' | 'builtin' | 'function' | 'variable' | 'snippet' | 'literal';
  description: string;
  insertText: string;
  cursorOffset?: number; // relative cursor jump position inside insertText
}

export interface SuggestionResult {
  prefix: string;
  replaceStart: number;
  replaceEnd: number;
  items: SuggestionItem[];
}

export const SNIPPETS: SuggestionItem[] = [
  {
    id: 'snip-while',
    label: 'भएसम्म (लुप स्निपेट)',
    detail: 'भएसम्म सर्त { ... }',
    category: 'snippet',
    description: 'सर्त साँचो भएसम्म पुनरावृत्ति गर्ने लुप ब्लक।',
    insertText: 'भएसम्म सर्त {\n  \n}',
    cursorOffset: 8,
  },
  {
    id: 'snip-if-else',
    label: 'यदि-अथवा (सर्त स्निपेट)',
    detail: 'यदि (सर्त) भने { ... } अथवा { ... }',
    category: 'snippet',
    description: 'सर्त परीक्षण र वैकल्पिक शाखा ब्लक।',
    insertText: 'यदि (सर्त) भने {\n  \n} अथवा {\n  \n}',
    cursorOffset: 6,
  },
  {
    id: 'snip-fn',
    label: 'काम (फङ्क्सन स्निपेट)',
    detail: 'काम नाम(प्यारामिटर) { ... }',
    category: 'snippet',
    description: 'नयाँ कार्य (फङ्क्सन) परिभाषा र मान फिर्ता।',
    insertText: 'काम कार्य_नाम(क, ख) {\n  पठाउँ क + ख।\n}',
    cursorOffset: 4,
  },
  {
    id: 'snip-var',
    label: 'राखौँ (चर स्निपेट)',
    detail: 'राखौँ नाम = मान।',
    category: 'snippet',
    description: 'नयाँ चर घोषणा।',
    insertText: 'राखौँ नाम = "";',
    cursorOffset: 7,
  },
  {
    id: 'snip-input-loop',
    label: 'इनपुट लुप (अन्तर्क्रियात्मक स्निपेट)',
    detail: 'लुप चलाएर इनपुट लिने र एरेमा थप्ने',
    category: 'snippet',
    description: 'लुपबाट प्रयोगकर्ता इनपुट लिएर एरेमा संकलन गर्ने पूर्ण ढाँचा।',
    insertText: 'राखौँ गन्ती = १;\nराखौँ सूची = [];\n\nभएसम्म गन्ती <= ३ {\n  थप्नुहोस्(सूची, इनपुट("नाम: "));\n  गन्ती = गन्ती + १;\n}\n\nभनौँ("संकलित सूची:", सूची);',
  },
];

/**
 * Extracts user-defined variables and functions from the active code buffer.
 */
function extractUserDefinedSymbols(code: string): SuggestionItem[] {
  const items: SuggestionItem[] = [];
  const lines = code.split('\n');
  const seen = new Set<string>();

  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('//')) continue;

    // Functions: काम <name>(...)
    const fnMatch = l.match(/(?:काम|function|kaam|def|fn)\s+([a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*)\s*\((.*?)\)/);
    if (fnMatch) {
      const name = fnMatch[1];
      const params = fnMatch[2].trim();
      if (!seen.has(name)) {
        seen.add(name);
        items.push({
          id: `fn-${name}`,
          label: name,
          detail: `काम ${name}(${params})`,
          category: 'function',
          description: `प्रयोगकर्ता-परिभाषित कार्य (${params ? `प्यारामिटर: ${params}` : 'कुनै प्यारामिटर छैन'})`,
          insertText: `${name}()`,
          cursorOffset: name.length + 1,
        });
      }
    }

    // Variables: राखौँ <name> = ...
    const varMatch = l.match(/(?:राखौँ|राखौं|मानौँ|let|var|const)\s+([a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*)/);
    if (varMatch) {
      const name = varMatch[1];
      if (!seen.has(name)) {
        seen.add(name);
        items.push({
          id: `var-${name}`,
          label: name,
          detail: `राखौँ ${name}`,
          category: 'variable',
          description: 'सक्रिय फाइलमा घोषित चर (Local Variable)',
          insertText: name,
        });
      }
    }
  }

  return items;
}

/**
 * Returns IntelliSense auto-suggestions for the current cursor position in the code editor.
 */
export function getAutoSuggestions(
  code: string,
  cursorOffset: number,
  translitEnabled: boolean
): SuggestionResult | null {
  if (!code || cursorOffset < 0 || cursorOffset > code.length) return null;

  // Find the word boundary before the cursor
  const textBefore = code.slice(0, cursorOffset);
  const match = textBefore.match(/([a-zA-Z0-9_\u0900-\u097F]+)$/);

  if (!match) return null;

  const rawPrefix = match[1];
  const replaceStart = cursorOffset - rawPrefix.length;
  const replaceEnd = cursorOffset;

  if (rawPrefix.length < 1) return null;

  const lowerRaw = rawPrefix.toLowerCase();
  const devanagariTranslit = transliterateWord(rawPrefix);

  const matchedItems: SuggestionItem[] = [];
  const seenIds = new Set<string>();

  const addItem = (item: SuggestionItem) => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      matchedItems.push(item);
    }
  };

  // 1. Check DOCS catalog (Keywords, Builtins, Types)
  for (const doc of DOCS_CATALOG) {
    const nameMatch = doc.name.toLowerCase().startsWith(lowerRaw) || doc.devanagari.toLowerCase().startsWith(lowerRaw);
    const romanMatch = doc.romanAlias.toLowerCase().includes(lowerRaw);
    const aliasMatch = (doc.aliases || []).some((a) => a.toLowerCase().startsWith(lowerRaw) || a.toLowerCase().startsWith(devanagariTranslit));
    const translitMatch = doc.name.startsWith(devanagariTranslit) || doc.devanagari.startsWith(devanagariTranslit);

    if (nameMatch || romanMatch || aliasMatch || translitMatch) {
      const isFn = doc.signature.includes('(') && !doc.signature.startsWith('काम') && !doc.signature.startsWith('यदि') && !doc.signature.startsWith('भएसम्म');
      const insert = isFn ? `${doc.name}()` : doc.name;
      const cursorOff = isFn ? doc.name.length + 1 : undefined;

      addItem({
        id: `doc-${doc.name}`,
        label: doc.name,
        detail: doc.signature || doc.name,
        category: doc.category === 'keyword' ? 'keyword' : 'builtin',
        description: doc.description,
        insertText: insert,
        cursorOffset: cursorOff,
      });
    }
  }

  // 2. Check User-Defined functions and variables in active file
  const userSymbols = extractUserDefinedSymbols(code);
  for (const sym of userSymbols) {
    if (
      sym.label.toLowerCase().startsWith(lowerRaw) ||
      sym.label.startsWith(devanagariTranslit)
    ) {
      addItem(sym);
    }
  }

  // 3. Check Code Snippets
  for (const snip of SNIPPETS) {
    if (
      snip.label.toLowerCase().includes(lowerRaw) ||
      snip.insertText.toLowerCase().includes(lowerRaw) ||
      snip.label.includes(devanagariTranslit)
    ) {
      addItem(snip);
    }
  }

  if (matchedItems.length === 0) return null;

  return {
    prefix: rawPrefix,
    replaceStart,
    replaceEnd,
    items: matchedItems.slice(0, 10), // Top 10 matches
  };
}
