export const KEYWORDS: Record<string, string> = {
  // Commands and keywords
  rakha: "राखौँ",
  rakhau: "राखौँ",
  rakhom: "राखौँ",
  kaam: "काम",
  yadi: "यदि",
  bhaye: "भए",
  natra: "नत्र",
  bhayesamma: "भएसम्म",
  pathau: "पठाउँ",
  pathaum: "पठाउँ",
  bhana: "भनौँ",
  bhanau: "भनौँ",
  bhanom: "भनौँ",
  sahi: "सहि",
  galat: "गलत",
  kehichaina: "केहीछैन",
  aayat: "आयात",
  ra: "र",
  wa: "वा",
  hoina: "होइन",
  lambai: "लम्बाइ",
  akshar: "अक्षर",
  sanket: "संकेत",
  thapnuhos: "थप्नुहोस्",
  aaja: "आज",
  miti_banaunuhos: "मिति_बनाउनुहोस्",
  miti_padhnuhos: "मिति_पढ्नुहोस्",
  din_farak: "दिन_फरक",
  umer: "उमेर",
  umera: "उमेर",
  haptako_din: "हप्ताको_दिन",
  input: "इनपुट",
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

const HALANT = "्";

const CONSONANTS: [string, string][] = [
  ["chh", "छ"],
  ["ksh", "क्ष"],
  ["gy", "ज्ञ"],
  ["tr", "त्र"],
  ["kh", "ख"],
  ["gh", "घ"],
  ["ng", "ङ"],
  ["ch", "च"],
  ["jh", "झ"],
  ["th", "थ"],
  ["dh", "ध"],
  ["ph", "फ"],
  ["bh", "भ"],
  ["sh", "श"],
  ["k", "क"],
  ["g", "ग"],
  ["j", "ज"],
  ["t", "त"],
  ["d", "द"],
  ["n", "न"],
  ["p", "प"],
  ["b", "ब"],
  ["m", "म"],
  ["y", "य"],
  ["r", "र"],
  ["l", "ल"],
  ["w", "व"],
  ["v", "व"],
  ["s", "स"],
  ["h", "ह"],
];

const INDEPENDENT_VOWELS: [string, string][] = [
  ["aa", "आ"],
  ["ii", "ई"],
  ["uu", "ऊ"],
  ["ai", "ऐ"],
  ["au", "औ"],
  ["ee", "ई"],
  ["oo", "ऊ"],
  ["a", "अ"],
  ["i", "इ"],
  ["u", "उ"],
  ["e", "ए"],
  ["o", "ओ"],
];

const DEPENDENT_MATRAS: [string, string][] = [
  ["aa", "ा"],
  ["ii", "ी"],
  ["uu", "ू"],
  ["ai", "ै"],
  ["au", "ौ"],
  ["ee", "ी"],
  ["oo", "ू"],
  ["a", ""],
  ["i", "ि"],
  ["u", "ु"],
  ["e", "े"],
  ["o", "ो"],
];

const DIGITS: Record<string, string> = {
  "0": "०",
  "1": "१",
  "2": "२",
  "3": "३",
  "4": "४",
  "5": "५",
  "6": "६",
  "7": "७",
  "8": "८",
  "9": "९",
};

export function transliterateWord(w: string): string {
  if (!w) return "";
  const lower = w.toLowerCase();
  if (KEYWORDS[lower]) return KEYWORDS[lower];

  let res = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < lower.length) {
    if (lower[i] >= "0" && lower[i] <= "9") {
      if (res.endsWith(HALANT)) {
        res = res.slice(0, -HALANT.length);
      }
      res += DIGITS[lower[i]] || lower[i];
      i++;
      lastWasConsonant = false;
      continue;
    }

    if (lastWasConsonant) {
      let matched = false;
      for (const [rom, matra] of DEPENDENT_MATRAS) {
        if (lower.startsWith(rom, i)) {
          if (res.endsWith(HALANT)) {
            res = res.slice(0, -HALANT.length);
          }
          res += matra;
          i += rom.length;
          matched = true;
          lastWasConsonant = false;
          break;
        }
      }
      if (matched) continue;
      lastWasConsonant = false;
    }

    let matchedConsonant = false;
    for (const [rom, nep] of CONSONANTS) {
      if (lower.startsWith(rom, i)) {
        res += nep + HALANT;
        i += rom.length;
        matchedConsonant = true;
        lastWasConsonant = true;
        break;
      }
    }
    if (matchedConsonant) continue;

    let matchedVowel = false;
    for (const [rom, nep] of INDEPENDENT_VOWELS) {
      if (lower.startsWith(rom, i)) {
        res += nep;
        i += rom.length;
        matchedVowel = true;
        lastWasConsonant = false;
        break;
      }
    }
    if (matchedVowel) continue;

    if (res.endsWith(HALANT)) {
      res = res.slice(0, -HALANT.length);
    }
    res += lower[i];
    i++;
    lastWasConsonant = false;
  }

  if (res.endsWith(HALANT)) {
    res = res.slice(0, -HALANT.length);
  }

  return res;
}

export function transliterateText(text: string): string {
  if (!text) return "";
  return text.replace(/[a-zA-Z0-9_]+/g, (match) => transliterateWord(match));
}
