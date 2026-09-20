// Devanagari & Nepali Language Syntax Tokenizer for Studio Editor

export const VAR_KEYWORDS = new Set([
  "राखौँ", "राखौं", "राखौ", "rakha", "rakhau", "rakhaun", "rakhom", "man"
]);

export const FN_KEYWORDS = new Set([
  "काम", "kaam",
  "पठाउँ", "पठाउं", "पठाउ", "पठाऔँ", "pathau", "pathaun", "pathaum",
  "फर्कनुहोस्", "pharkanuhos", "fn"
]);

export const CONTROL_KEYWORDS = new Set([
  "यदि", "yadi",
  "अथवा", "athawa", "athwa", "natra", "नत्र",
  "भने", "bhane", "bhaye", "भए",
  "जबसम्म", "jabasamma",
  "भएसम्म", "bhayesamma",
  "आयात", "aayat",
  "र", "ra",
  "वा", "wa",
  "होइन", "hoina"
]);

export const BUILTINS = new Set([
  "भनौँ", "भनौं", "भनौ", "bhana", "bhanau", "bhanom", "bhanaun",
  "लेख्नुहोस्", "lekhnuhos", "छाप्नुहोस्", "chhapnuhos",
  "आज", "aaja",
  "मिति_बनाउनुहोस्", "miti_banaunuhos",
  "मिति_पढ्नुहोस्", "miti_padhnuhos",
  "दिन_फरक", "din_farak", "din_pharak",
  "उमेर", "umer", "umera",
  "हप्ताको_दिन", "haptako_din",
  "इनपुट", "input", "inapt",
  "लम्बाइ", "lambai",
  "अक्षर", "akshar",
  "संकेत", "sanket",
  "थप्नुहोस्", "thapnuhos",
  "ओएस_लेख्नुहोस्", "os_lekhnuhos",
  "ओएस_पढ्नुहोस्", "os_padhnuhos",
  "ओएस_सूची", "os_soochee", "os_suchi",
  "नयाँ_प्रक्रिया", "naya_prakriya",
  "प्रक्रिया_सूची", "prakriya_suchi",
  "नयाँ_च्यानल", "naya_channel",
  "च्यानल_पठाउनुहोस्", "channel_pathaunuhos",
  "च्यानल_पाउनुहोस्", "channel_paunuhos",
  "डाटाबेस_चलाउनुहोस्", "database_chalaunuhos",
  "डाटाबेस_सोध्नुहोस्", "database_sodhnuhos",
  "पाइथन_चलाउनुहोस्", "python_chalaunuhos",
  "रस्ट_चलाउनुहोस्", "rust_chalaunuhos",
  "गो_चलाउनुहोस्", "go_chalaunuhos",
  "जेएस_चलाउनुहोस्", "js_chalaunuhos",
  "टिएस_चलाउनुहोस्", "ts_chalaunuhos",
  "क्यास_राख्नुहोस्", "cache_rakhnuhos",
  "क्यास_ल्याउनुहोस्", "cache_launuhos",
  "क्यास_हटाउनुहोस्", "cache_hataunuhos",
  "एआई_सोध्नुहोस्", "ai_sodhnuhos",
  "सहायक_सोध्नुहोस्", "sahayak_sodhnuhos",
  "एआई_सुन्नुहोस्", "ai_sunnuhos",
  "एआई_बोल्नुहोस्", "ai_bolnuhos",
  "आदेश_चलाउनुहोस्", "aadesh_chalaunuhos",
  "एजेन्ट_चलाउनुहोस्", "agent_chalaunuhos"
]);

export const LITERALS = new Set([
  "सहि", "sahi", "साँच्चै", "saanchchai", "saachchai",
  "गलत", "galat", "झूट", "jhoot", "jhut",
  "केहीछैन", "kehichaina", "शून्य", "shoonya", "shunya"
]);

export function highlightNepaliCode(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  let lastWasVarDecl = false;

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
      out += '<span class="text-slate-500 italic">' + escapeHtml(code.substring(start, i)) + '</span>';
      lastWasVarDecl = false;
      continue;
    }

    // 2. Multi line comment: /* ... */
    if (code[i] === "/" && code[i + 1] === "*") {
      let start = i;
      i += 2;
      while (i < n && !(code[i - 1] === "*" && code[i] === "/")) i++;
      if (i < n) i++;
      out += '<span class="text-slate-500 italic">' + escapeHtml(code.substring(start, i)) + '</span>';
      lastWasVarDecl = false;
      continue;
    }

    // 3. String literals: "..." or '...'
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let start = i;
      i++;
      while (i < n && code[i] !== quote) {
        if (code[i] === "\\" && i + 1 < n) i += 2;
        else i++;
      }
      if (i < n) i++;
      out += '<span class="text-lime-300 font-normal">' + escapeHtml(code.substring(start, i)) + '</span>';
      lastWasVarDecl = false;
      continue;
    }

    // 4. Numbers (ASCII 0-9 and Devanagari ०-९)
    if (/[0-9०-९]/.test(code[i])) {
      let start = i;
      while (i < n && /[0-9०-९\.]/.test(code[i])) i++;
      out += '<span class="text-orange-400 font-semibold">' + escapeHtml(code.substring(start, i)) + '</span>';
      lastWasVarDecl = false;
      continue;
    }

    // 5. Devanagari or ASCII Identifier / Keyword / Builtin / Function
    if (/[a-zA-Z_\u0900-\u097F]/.test(code[i])) {
      let start = i;
      while (i < n && /[a-zA-Z0-9_\u0900-\u097F]/.test(code[i])) i++;
      const word = code.substring(start, i);

      // Check if immediately followed by opening parenthesis (function call)
      let peek = i;
      while (peek < n && (code[peek] === " " || code[peek] === "\t")) peek++;
      const isFunctionCall = peek < n && code[peek] === "(";

      if (VAR_KEYWORDS.has(word)) {
        out += '<span class="text-cyan-400 font-bold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = true;
      } else if (FN_KEYWORDS.has(word)) {
        out += '<span class="text-emerald-400 font-bold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else if (CONTROL_KEYWORDS.has(word)) {
        out += '<span class="text-fuchsia-400 font-bold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else if (BUILTINS.has(word)) {
        out += '<span class="text-sky-400 font-semibold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else if (LITERALS.has(word)) {
        out += '<span class="text-rose-400 font-semibold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else if (isFunctionCall) {
        out += '<span class="text-amber-300 font-semibold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else if (lastWasVarDecl) {
        out += '<span class="text-teal-200 font-semibold font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      } else {
        out += '<span class="text-slate-100 font-devanagari">' + escapeHtml(word) + '</span>';
        lastWasVarDecl = false;
      }
      continue;
    }

    // 6. Operators & Punctuation
    const char = code[i];
    if (char === "।" || char === "॥") {
      out += '<span class="text-rose-400 font-bold">' + escapeHtml(char) + '</span>';
      lastWasVarDecl = false;
    } else if (/[\+\-\*/=<>!&|]/.test(char)) {
      out += '<span class="text-indigo-300 font-bold">' + escapeHtml(char) + '</span>';
    } else if (/[\(\)\[\]\{\};,]/.test(char)) {
      out += '<span class="text-slate-400">' + escapeHtml(char) + '</span>';
      if (char !== " ") lastWasVarDecl = false;
    } else {
      out += escapeHtml(char);
    }
    i++;
  }

  return out;
}
