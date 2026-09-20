// Devanagari & Nepali Language Syntax Tokenizer for Studio Editor

const KEYWORDS = new Set([
  "राखौँ", "rakha", "rakhau", "rakhaun", "man",
  "यदि", "yadi",
  "अथवा", "athawa", "athwa",
  "भने", "bhane",
  "जबसम्म", "jabasamma",
  "काम", "kaam",
  "पठाउँ", "pathau", "pathaun",
  "फर्कनुहोस्", "pharkanuhos",
  "आयात", "aayat",
  "साँच्चै", "saanchchai", "saachchai",
  "झूट", "jhoot", "jhut",
  "शून्य", "shoonya", "shunya",
  "र", "ra",
  "वा", "wa",
  "होइन", "hoina",
  "लेख्नुहोस्", "lekhnuhos",
  "छाप्नुहोस्", "chhapnuhos",
  "भनौँ", "bhana", "bhanau", "bhanaun"
]);

const BUILTINS = new Set([
  "आज", "aaja",
  "मिति_बनाउनुहोस्", "miti_banaunuhos",
  "मिति_पढ्नुहोस्", "miti_padhnuhos",
  "दिन_फरक", "din_pharak",
  "उमेर", "umer",
  "हप्ताको_दिन", "haptako_din",
  "इनपुट", "input",
  "लम्बाइ", "lambai",
  "अक्षर", "akshar",
  "संकेत", "sanket",
  "थप्नुहोस्", "thapnuhos",
  "ओएस_लेख्नुहोस्", "os_lekhnuhos",
  "ओएस_पढ्नुहोस्", "os_padhnuhos",
  "ओएस_सूची", "os_soochee",
  "डाटाबेस_चलाउनुहोस्", "database_chalaunuhos",
  "डाटाबेस_सोध्नुहोस्", "database_sodhAction",
  "पाइथन_चलाउनुहोस्", "python_chalaunuhos",
  "रस्ट_चलाउनुहोस्", "rust_chalaunuhos",
  "जेएस_चलाउनुहोस्", "js_chalaunuhos",
  "एआई_सोध्नुहोस्", "ai_sodhAction",
  "सहायक_सोध्नुहोस्", "sahayak_sodhAction"
]);

export function highlightNepaliCode(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  while (i < n) {
    // 1. Single line comment: // ...
    if (code[i] === "/" && code[i + 1] === "/") {
      let start = i;
      while (i < n && code[i] !== "\n") i++;
      out += `<span class="text-slate-500 italic">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }

    // 2. Multi line comment: /* ... */
    if (code[i] === "/" && code[i + 1] === "*") {
      let start = i;
      i += 2;
      while (i < n && !(code[i - 1] === "*" && code[i] === "/")) i++;
      if (i < n) i++;
      out += `<span class="text-slate-500 italic">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }

    // 3. String literals: "..." or '...'
    if (code[i] === "\"" || code[i] === "'") {
      const quote = code[i];
      let start = i;
      i++;
      while (i < n && code[i] !== quote) {
        if (code[i] === "\\" && i + 1 < n) i += 2;
        else i++;
      }
      if (i < n) i++;
      out += `<span class="text-amber-300 font-medium">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }

    // 4. Numbers (ASCII 0-9 and Devanagari ०-९)
    if (/[0-9०-९]/.test(code[i])) {
      let start = i;
      while (i < n && /[0-9०-९\.]/.test(code[i])) i++;
      out += `<span class="text-orange-400 font-semibold">${escapeHtml(code.substring(start, i))}</span>`;
      continue;
    }

    // 5. Devanagari or ASCII Identifier / Keyword / Builtin
    if (/[a-zA-Z_\u0900-\u097F]/.test(code[i])) {
      let start = i;
      while (i < n && /[a-zA-Z0-9_\u0900-\u097F]/.test(code[i])) i++;
      const word = code.substring(start, i);

      if (KEYWORDS.has(word)) {
        out += `<span class="text-purple-400 font-bold font-devanagari">${escapeHtml(word)}</span>`;
      } else if (BUILTINS.has(word)) {
        out += `<span class="text-cyan-400 font-semibold font-devanagari">${escapeHtml(word)}</span>`;
      } else {
        out += `<span class="text-slate-200">${escapeHtml(word)}</span>`;
      }
      continue;
    }

    // 6. Operators & Punctuation
    const char = code[i];
    if (char === "।" || char === "॥") {
      out += `<span class="text-rose-400 font-bold">${escapeHtml(char)}</span>`;
    } else if (/[\+\-\*/=<>!&|]/.test(char)) {
      out += `<span class="text-emerald-400 font-bold">${escapeHtml(char)}</span>`;
    } else if (/[\(\)\[\]\{\};,]/.test(char)) {
      out += `<span class="text-slate-400">${escapeHtml(char)}</span>`;
    } else {
      out += escapeHtml(char);
    }
    i++;
  }

  return out;
}
