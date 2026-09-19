export const KEYWORDS: Record<string, string> = {
  rakha: "राखौँ", kaam: "काम", yadi: "यदि", bhaye: "भए", natra: "नत्र",
  bhayesamma: "भएसम्म", pathau: "पठाउँ", bhana: "भनौँ", sahi: "सहि",
  galat: "गलत", kehichaina: "केहीछैन", aayat: "आयात", ra: "र", wa: "वा", hoina: "होइन",
  lambai: "लम्बाइ", akshar: "अक्षर", sanket: "संकेत", thapnuhos: "थप्नुहोस्",
  aaja: "आज", miti_banaunuhos: "मिति_बनाउनुहोस्", miti_padhnuhos: "मिति_पढ्नुहोस्",
  din_farak: "दिन_फरक", umer: "उमेर", haptako_din: "हप्ताको_दिन", input: "इनपुट",
  os_lekhnuhos: "ओएस_लेख्नुहोस्", os_padhnuhos: "ओएस_पढ्नुहोस्", os_suchi: "ओएस_सूची",
  naya_prakriya: "नयाँ_प्रक्रिया", prakriya_suchi: "प्रक्रिया_सूची",
  naya_channel: "नयाँ_च्यानल", channel_pathaunuhos: "च्यानल_पठाउनुहोस्",
  channel_paunuhos: "च्यानल_पाउनुहोस्", database_chalaunuhos: "डाटाबेस_चलाउनुहोस्",
  database_sodhnuhos: "डाटाबेस_सोध्नुहोस्", python_chalaunuhos: "पाइथन_चलाउनुहोस्",
  rust_chalaunuhos: "रस्ट_चलाउनुहोस्", go_chalaunuhos: "गो_चलाउनुहोस्",
  js_chalaunuhos: "जेएस_चलाउनुहोस्", ts_chalaunuhos: "टिएस_चलाउनुहोस्",
  cache_rakhnuhos: "क्यास_राख्नुहोस्", cache_launuhos: "क्यास_ल्याउनुहोस्",
  cache_hataunuhos: "क्यास_हटाउनुहोस्", ai_sodhnuhos: "एआई_सोध्नुहोस्",
  sahayak_sodhnuhos: "सहायक_सोध्नुहोस्", ai_sunnuhos: "एआई_सुन्नुहोस्",
  ai_bolnuhos: "एआई_बोल्नुहोस्", aadesh_chalaunuhos: "आदेश_चलाउनुहोस्",
  agent_chalaunuhos: "एजेन्ट_चलाउनुहोस्",
};

const HALANT = "्";
const CONSONANTS: [string, string][] = [
  ["chh", "छ"], ["ksh", "क्ष"], ["kh", "ख"], ["gh", "घ"], ["ng", "ङ"], ["ch", "च"],
  ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
  ["k", "क"], ["g", "ग"], ["j", "ज"], ["t", "त"], ["d", "द"], ["n", "न"],
  ["p", "प"], ["b", "ब"], ["m", "म"], ["y", "य"], ["r", "र"], ["l", "ल"],
  ["w", "व"], ["v", "व"], ["s", "स"], ["h", "ह"],
];

const INDEPENDENT_VOWELS: [string, string][] = [
  ["aa", "आ"], ["ii", "ई"], ["uu", "ऊ"], ["ai", "ऐ"], ["au", "औ"],
  ["a", "अ"], ["i", "इ"], ["u", "उ"], ["e", "ए"], ["o", "ओ"],
];

const DEPENDENT_MATRAS: [string, string][] = [
  ["aa", "ा"], ["ii", "ी"], ["uu", "ू"], ["ai", "ै"], ["au", "ौ"],
  ["a", ""], ["i", "ि"], ["u", "ु"], ["e", "े"], ["o", "ो"],
];

const DIGITS: Record<string, string> = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
};

export function transliterateWord(w: string): string {
  if (KEYWORDS[w]) return KEYWORDS[w];
  let res = "";
  let i = 0;
  let lastWasConsonant = false;

  while (i < w.length) {
    if (w[i] >= "0" && w[i] <= "9") {
      res += DIGITS[w[i]];
      i++;
      lastWasConsonant = false;
      continue;
    }
    if (lastWasConsonant) {
      let matched = false;
      for (const [rom, matra] of DEPENDENT_MATRAS) {
        if (w.startsWith(rom, i)) {
          if (res.endsWith(HALANT)) {
            res = res.slice(0, -1);
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
      if (w.startsWith(rom, i)) {
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
      if (w.startsWith(rom, i)) {
        res += nep;
        i += rom.length;
        matchedVowel = true;
        lastWasConsonant = false;
        break;
      }
    }
    if (matchedVowel) continue;
    res += w[i];
    i++;
    lastWasConsonant = false;
  }
  return res;
}

export function transliterateText(text: string): string {
  return text.replace(/[a-zA-Z0-9_]+/g, (match) => transliterateWord(match));
}
