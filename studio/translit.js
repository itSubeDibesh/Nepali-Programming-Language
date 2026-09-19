// Roman -> Devanagari phonetic typing. A port of os-image/overlay/usr/local/lib/nepali/translit.py
// (studio/tests/test_parity.py checks the two give identical results).
const KEYWORDS = {
  rakha: "राखौँ", kaam: "काम", yadi: "यदि", bhaye: "भए", natra: "नत्र",
  bhayesamma: "भएसम्म", pathau: "पठाउँ", bhana: "भनौँ", sahi: "सहि",
  galat: "गलत", kehichaina: "केहीछैन", aayat: "आयात", ra: "र", wa: "वा", hoina: "होइन",
  lambai: "लम्बाइ", akshar: "अक्षर", sanket: "संकेत", thapnuhos: "थप्नुहोस्",
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
const CONSONANTS = [
  ["chh", "छ"], ["ksh", "क्ष"], ["kh", "ख"], ["gh", "घ"], ["ng", "ङ"], ["ch", "च"],
  ["jh", "झ"], ["Th", "ठ"], ["Dh", "ढ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"],
  ["bh", "भ"], ["sh", "श"], ["Sh", "ष"], ["tr", "त्र"], ["gy", "ज्ञ"],
  ["k", "क"], ["g", "ग"], ["c", "च"], ["j", "ज"], ["T", "ट"], ["D", "ड"], ["N", "ण"],
  ["t", "त"], ["d", "द"], ["n", "न"], ["p", "प"], ["f", "फ"], ["b", "ब"], ["m", "म"],
  ["y", "य"], ["r", "र"], ["l", "ल"], ["v", "व"], ["w", "व"], ["s", "स"], ["h", "ह"],
  ["q", "क"], ["z", "ज"],
];
const VOWELS = [
  ["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["ii", "ई", "ी"],
  ["oo", "ऊ", "ू"], ["uu", "ऊ", "ू"],
  ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"],
];
const MODIFIERS = { M: "ं", H: "ः", "~": "ँ", "|": "।" };

function match(table, s, i) {
  for (const e of table) if (s.startsWith(e[0], i)) return e;
  return null;
}
function lowerAt(s, i) { return s.slice(0, i) + s[i].toLowerCase() + s.slice(i + 1); }
const isUpper = (c) => c !== c.toLowerCase() && c === c.toUpperCase();

function transliterate(word) {
  const rest = word.slice(1);
  if (word.length > 1 && isUpper(word[0]) && rest === rest.toLowerCase() && rest !== rest.toUpperCase()
      && !/^(Th|Dh|Sh)/.test(word)) {
    word = word[0].toLowerCase() + rest;
  }
  const out = [];
  let i = 0;
  const n = word.length;
  while (i < n) {
    const ch = word[i];
    if (ch in MODIFIERS) { out.push(MODIFIERS[ch]); i += 1; continue; }
    let cons = match(CONSONANTS, word, i);
    if (!cons && isUpper(ch)) cons = match(CONSONANTS, lowerAt(word, i), i);
    if (cons) {
      out.push(cons[1]);
      i += cons[0].length;
      const vow = match(VOWELS, word, i);
      if (vow) { out.push(vow[2]); i += vow[0].length; }
      else if (i < n && (match(CONSONANTS, word, i) || (isUpper(word[i]) && match(CONSONANTS, lowerAt(word, i), i)))) {
        out.push(HALANT);
      }
      continue;
    }
    let vow = match(VOWELS, word, i);
    if (!vow && isUpper(ch)) vow = match(VOWELS, lowerAt(word, i), i);
    if (vow) { out.push(vow[1]); i += vow[0].length; continue; }
    out.push(ch);
    i += 1;
  }
  return out.join("");
}

function convertWord(word) {
  const kw = KEYWORDS[word.toLowerCase()];
  return kw !== undefined ? kw : transliterate(word);
}

const DEV_DIGITS = "०१२३४५६७८९";
function toDevanagariDigit(ch) { return /^[0-9]$/.test(ch) ? DEV_DIGITS[+ch] : ch; }

const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";

// Phonetic typing for a <textarea> / <input>: Latin letters typed as a word show as
// Devanagari while typing; a finished word that is a language keyword becomes the keyword.
class PhoneticTyper {
  constructor(el) {
    this.el = el; this.enabled = false; this.word = ""; this.start = 0; this.shown = "";
    el.addEventListener("keydown", (e) => this.onKey(e));
    el.addEventListener("mousedown", () => this.reset());
    el.addEventListener("blur", () => this.reset());
  }
  reset() { this.word = ""; this.shown = ""; }
  replace(start, oldLen, text) { this.el.setRangeText(text, start, start + oldLen, "end"); }
  onKey(e) {
    if (!this.enabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey) { this.reset(); return; }
    const k = e.key;
    if (k.length === 1 && LETTERS.includes(k)) {
      e.preventDefault();
      if (!this.word) {
        if (this.el.selectionStart !== this.el.selectionEnd) this.el.setRangeText("", this.el.selectionStart, this.el.selectionEnd, "end");
        this.start = this.el.selectionStart; this.shown = "";
      }
      this.word += k;
      const text = convertWord(this.word);
      this.replace(this.start, this.shown.length, text);
      this.shown = text;
      return;
    }
    if (k === "Backspace" && this.word) {
      e.preventDefault();
      this.word = this.word.slice(0, -1);
      if (this.word) {
        const text = convertWord(this.word);
        this.replace(this.start, this.shown.length, text);
        this.shown = text;
      } else { this.replace(this.start, this.shown.length, ""); this.reset(); }
      return;
    }
    this.reset();
    if (/^[0-9]$/.test(k)) { e.preventDefault(); this.replace(this.el.selectionStart, this.el.selectionEnd - this.el.selectionStart, toDevanagariDigit(k)); return; }
    if (k === "|") { e.preventDefault(); this.replace(this.el.selectionStart, this.el.selectionEnd - this.el.selectionStart, "।"); }
  }
}

if (typeof module !== "undefined") module.exports = { transliterate, convertWord, toDevanagariDigit, KEYWORDS };
