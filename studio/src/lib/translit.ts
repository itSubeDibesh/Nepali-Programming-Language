// Roman -> Devanagari phonetic typing with full keyword dictionary and parity with core engine
export const KEYWORDS: Record<string, string> = {
  // Declarations & Variables
  mana: "माना",
  manau: "मानौँ",
  manom: "मानौँ",
  rakha: "राखौँ",
  rakhau: "राखौँ",
  rakhom: "राखौँ",
  kaam: "काम",
  karyabidhi: "कार्यविधि",
  kaaryabidhi: "कार्यविधि",

  // Control Flow
  yadi: "यदि",
  bhaye: "भए",
  natra: "नत्र",
  jabsamma: "जबसम्म",
  bhayesamma: "भएसम्म",
  pathau: "पठाउँ",
  pathaum: "पठाउँ",
  farka: "पठाउँ",
  farkaunuhos: "पठाउँ",
  bhana: "भनौँ",
  bhanau: "भनौँ",
  bhanom: "भनौँ",
  lekha: "लेख",
  lekh: "लेख",
  pratyek: "प्रत्येक",
  samrachana: "संरचना",
  shreni: "श्रेणी",
  awastha: "अवस्था",
  roka: "रोक",
  jaari: "जारी",

  // Values & Literals
  satya: "सत्य",
  sahi: "सत्य",
  asatya: "असत्य",
  galat: "असत्य",
  shunya: "शुन्य",
  khali: "खाली",
  kehichaina: "केहीछैन",
  chha: "छ",
  chhaina: "छैन",
  ho: "हो",

  // Logical operators
  aayat: "आयात",
  ra: "र",
  wa: "वा",
  hoina: "होइन",

  // Built-ins: Strings, Arrays, Math
  lambai: "लम्बाइ",
  akshar: "अक्षर",
  sanket: "संकेत",
  thap: "थप",
  thapnuhos: "थप्नुहोस्",
  hatau: "हटाउ",
  hataunuhos: "हटाउनुहोस्",
  jod: "जोड",
  ghatau: "घटाउ",
  gunan: "गुणन",
  bhag: "भाग",
  pratishat: "प्रतिशत",
  ghatank: "घातांक",
  bargamul: "वर्गमूल",
  barga_mool: "वर्गमूल",
  purnanka: "पूर्णांक",
  dashamlav: "दशमलव",
  shabda: "शब्द",
  sankhya: "संख्या",
  talika: "तालिका",
  suchi: "सूची",
  dhancha: "ढाँचा",
  prakar: "प्रकार",

  // Date & Time
  aaja: "आज",
  miti_banaunuhos: "मिति_बनाउनुहोस्",
  miti_padhnuhos: "मिति_पढ्नुहोस्",
  din_farak: "दिन_फरक",
  umer: "उमेर",
  umera: "उमेर",
  haptako_din: "हप्ताको_दिन",

  // I/O & System
  input: "इनपुट",
  inaput: "इनपुट",
  inapt: "इनपुट",
  input_sodhnuhos: "इनपुट",
  os_lekhnuhos: "ओएस_लेख्नुहोस्",
  os_padhnuhos: "ओएस_पढ्नुहोस्",
  os_suchi: "ओएस_सूची",
  naya_prakriya: "नयाँ_प्रक्रिया",
  prakriya_suchi: "प्रक्रिया_सूची",
  naya_channel: "नयाँ_च्यानल",
  channel_pathaunuhos: "च्यानल_पठाउनुहोस्",
  channel_paunuhos: "च्यानल_पाउनुहोस्",
  database_chalaunuhos: "डाटाबेस_चलाउनुहोस्",
  database_sodhnuhos: "डाटाबेस_सोध्नुहोस्",
  python_chalaunuhos: "पाइथन_चलाउनुहोस्",
  rust_chalaunuhos: "रस्ट_चलाउनुहोस्",
  go_chalaunuhos: "गो_चलाउनुहोस्",
  js_chalaunuhos: "जेएस_चलाउनुहोस्",
  ts_chalaunuhos: "टिएस_चलाउनुहोस्",
  cache_rakhnuhos: "क्यास_राख्नुहोस्",
  cache_launuhos: "क्यास_ल्याउनुहोस्",
  cache_hataunuhos: "क्यास_हटाउनुहोस्",
  ai_sodhnuhos: "एआई_सोध्नुहोस्",
  sahayak_sodhnuhos: "सहायक_सोध्नुहोस्",
  ai_sunnuhos: "एआई_सुन्नुहोस्",
  ai_bolnuhos: "एआई_बोल्नुहोस्",
  aadesh_chalaunuhos: "आदेश_चलाउनुहोस्",
  agent_chalaunuhos: "एजेन्ट_चलाउनुहोस्",

  // Common Nepali words and names
  nepal: "नेपाल",
  nepali: "नेपाली",
  namaskar: "नमस्कार",
  namaste: "नमस्ते",
  dhanyabad: "धन्यवाद",
  dhanyabaad: "धन्यवाद",
  swagatam: "स्वागतम्",
  tapainko: "तपाईंको",
  tapain: "तपाईं",
  tapai: "तपाईं",
  hajur: "हजुर",
  hajurko: "हजुरको",
  subhanama: "शुभनाम",
  subhanam: "शुभनाम",
  subhanaam: "शुभनाम",
  naam: "नाम",
  nam: "नाम",
  mero: "मेरो",
  mero_naam: "मेरो_नाम",
  barsa: "वर्ष",
  barsha: "वर्ष",
  barsako: "वर्षको",
  barshako: "वर्षको",
  hunubhayecha: "हुनुभएछ",
  hunubhayeko: "हुनुभएको",
  dibesh: "दिबेश",
  divesh: "दिवेश",
  subedi: "सुवेदी",
  ram: "राम",
  raam: "राम",
  shyam: "श्याम",
  shyaam: "श्याम",
  hari: "हरि",
  gita: "गीता",
  geeta: "गीता",
  sita: "सीता",
  seeta: "सीता",
  kathmandu: "काठमाडौँ",
  pokhara: "पोखरा",
  lalitpur: "ललितपुर",
  bhaktapur: "भक्तपुर",
};

export const HALANT = "्";

export const CONSONANTS: [string, string][] = [
  ["chh", "छ"],
  ["ksh", "क्ष"],
  ["gy", "ज्ञ"],
  ["tr", "त्र"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["ng", "ङ"],
  ["ch", "च"],
  ["jh", "झ"],
  ["Th", "ठ"],
  ["Dh", "ढ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["sh", "श"],
  ["Sh", "ष"],
  ["k", "क"],
  ["g", "ग"],
  ["c", "च"],
  ["j", "ज"],
  ["T", "ट"],
  ["D", "ड"],
  ["N", "ण"],
  ["t", "त"],
  ["d", "द"],
  ["n", "न"],
  ["p", "प"],
  ["f", "फ"],
  ["b", "ब"],
  ["m", "म"],
  ["y", "य"],
  ["r", "र"],
  ["l", "ल"],
  ["w", "व"],
  ["v", "व"],
  ["s", "स"],
  ["h", "ह"],
  ["q", "क"],
  ["z", "ज"],
];

export const VOWELS: [string, string, string][] = [
  ["aa", "आ", "ा"],
  ["ai", "ऐ", "ै"],
  ["au", "औ", "ौ"],
  ["ee", "ई", "ी"],
  ["ii", "ई", "ी"],
  ["oo", "ऊ", "ू"],
  ["uu", "ऊ", "ू"],
  ["a", "अ", ""],
  ["i", "इ", "ि"],
  ["u", "उ", "ु"],
  ["e", "ए", "े"],
  ["o", "ओ", "ो"],
];

export const MODIFIERS: Record<string, string> = {
  M: "ं",
  H: "ः",
  "~": "ँ",
  "|": "।",
};

const DEV_DIGITS = "०१२३४५६७८९";

export function toDevanagariDigit(ch: string): string {
  return /^[0-9]$/.test(ch) ? DEV_DIGITS[parseInt(ch, 10)] || ch : ch;
}

function matchEntry<T extends [string, ...any[]]>(table: T[], s: string, i: number): T | null {
  for (const e of table) {
    if (s.startsWith(e[0], i)) return e;
  }
  return null;
}

function lowerAt(s: string, i: number): string {
  return s.slice(0, i) + s[i].toLowerCase() + s.slice(i + 1);
}

const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();

export function transliterate(word: string): string {
  if (!word) return "";
  const rest = word.slice(1);
  if (
    word.length > 1 &&
    isUpper(word[0]) &&
    rest === rest.toLowerCase() &&
    rest !== rest.toUpperCase() &&
    !/^(Th|Dh|Sh)/.test(word)
  ) {
    word = word[0].toLowerCase() + rest;
  }

  const out: string[] = [];
  let i = 0;
  const n = word.length;

  while (i < n) {
    const ch = word[i];
    if (ch in MODIFIERS) {
      out.push(MODIFIERS[ch]);
      i += 1;
      continue;
    }

    let cons = matchEntry(CONSONANTS, word, i);
    if (!cons && isUpper(ch)) {
      cons = matchEntry(CONSONANTS, lowerAt(word, i), i);
    }

    if (cons) {
      out.push(cons[1]);
      i += cons[0].length;
      const vow = matchEntry(VOWELS, word, i);
      if (vow) {
        out.push(vow[2]);
        i += vow[0].length;
      } else if (
        i < n &&
        (matchEntry(CONSONANTS, word, i) || (isUpper(word[i]) && matchEntry(CONSONANTS, lowerAt(word, i), i)))
      ) {
        out.push(HALANT);
      }
      continue;
    }

    let vow = matchEntry(VOWELS, word, i);
    if (!vow && isUpper(ch)) {
      vow = matchEntry(VOWELS, lowerAt(word, i), i);
    }
    if (vow) {
      out.push(vow[1]);
      i += vow[0].length;
      continue;
    }

    if (/^[0-9]$/.test(ch)) {
      out.push(toDevanagariDigit(ch));
      i += 1;
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join("");
}

export function convertWord(word: string): string {
  if (!word) return "";
  const lower = word.toLowerCase();
  const kw = KEYWORDS[lower];
  if (kw !== undefined) return kw;
  return transliterate(word);
}

export const transliterateWord = convertWord;

export function transliterateText(text: string): string {
  if (!text) return "";
  return text.replace(/[a-zA-Z0-9_]+/g, (match) => convertWord(match));
}
