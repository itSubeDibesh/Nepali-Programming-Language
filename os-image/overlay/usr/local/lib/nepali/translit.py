"""Roman -> Devanagari phonetic typing for the Nepali Studio editor.

Type `namaste`, get नमस्ते. A word that is exactly one of the language's own
romanized keywords or builtin names (`bhana`, `kaam`, `lambai`, ...) becomes the
canonical Devanagari keyword instead, so a whole program can be typed on an
English keyboard. Pure functions, no GTK - unit-tested in tests/.

Rules (deliberately simple and predictable, not a dictionary):
  consonants  k kh g gh ng ch chh j jh T Th D Dh N t th d dh n p ph b bh m y r l
              v w s sh Sh h  ksh->क्ष  tr->त्र  gy->ज्ञ   (capital T D N = retroflex)
  vowels      a aa i ee ii u oo uu e ai o au   (after a consonant: matras; 'a' is
              the consonant's inherent vowel)
  consonant + consonant  ->  halant between them (s+t+e = स्ते)
  M = ं   H = ः   ~ = ँ   | = ।
"""

# Keep in sync with lexer.rs (tests/test_translit.py checks this against the source).
KEYWORDS = {
    "rakha": "राखौँ", "kaam": "काम", "yadi": "यदि", "bhaye": "भए", "natra": "नत्र",
    "bhayesamma": "भएसम्म", "pathau": "पठाउँ", "bhana": "भनौँ", "sahi": "सहि",
    "galat": "गलत", "kehichaina": "केहीछैन", "aayat": "आयात", "ra": "र", "wa": "वा",
    "hoina": "होइन",
}
BUILTINS = {
    "lambai": "लम्बाइ", "akshar": "अक्षर", "sanket": "संकेत", "thapnuhos": "थप्नुहोस्",
    "os_lekhnuhos": "ओएस_लेख्नुहोस्", "os_padhnuhos": "ओएस_पढ्नुहोस्", "os_suchi": "ओएस_सूची",
    "naya_prakriya": "नयाँ_प्रक्रिया", "prakriya_suchi": "प्रक्रिया_सूची",
    "naya_channel": "नयाँ_च्यानल", "channel_pathaunuhos": "च्यानल_पठाउनुहोस्",
    "channel_paunuhos": "च्यानल_पाउनुहोस्", "database_chalaunuhos": "डाटाबेस_चलाउनुहोस्",
    "database_sodhnuhos": "डाटाबेस_सोध्नुहोस्", "python_chalaunuhos": "पाइथन_चलाउनुहोस्",
    "rust_chalaunuhos": "रस्ट_चलाउनुहोस्", "go_chalaunuhos": "गो_चलाउनुहोस्",
    "js_chalaunuhos": "जेएस_चलाउनुहोस्", "ts_chalaunuhos": "टिएस_चलाउनुहोस्",
    "cache_rakhnuhos": "क्यास_राख्नुहोस्", "cache_launuhos": "क्यास_ल्याउनुहोस्",
    "cache_hataunuhos": "क्यास_हटाउनुहोस्", "ai_sodhnuhos": "एआई_सोध्नुहोस्",
    "sahayak_sodhnuhos": "सहायक_सोध्नुहोस्", "ai_sunnuhos": "एआई_सुन्नुहोस्",
    "ai_bolnuhos": "एआई_बोल्नुहोस्", "aadesh_chalaunuhos": "आदेश_चलाउनुहोस्",
    "agent_chalaunuhos": "एजेन्ट_चलाउनुहोस्",
}
ALL_KEYWORDS = {**KEYWORDS, **BUILTINS}

HALANT = "्"

# longest first within each table
CONSONANTS = [
    ("chh", "छ"), ("ksh", "क्ष"), ("kh", "ख"), ("gh", "घ"), ("ng", "ङ"), ("ch", "च"),
    ("jh", "झ"), ("Th", "ठ"), ("Dh", "ढ"), ("th", "थ"), ("dh", "ध"), ("ph", "फ"),
    ("bh", "भ"), ("sh", "श"), ("Sh", "ष"), ("tr", "त्र"), ("gy", "ज्ञ"),
    ("k", "क"), ("g", "ग"), ("c", "च"), ("j", "ज"), ("T", "ट"), ("D", "ड"), ("N", "ण"),
    ("t", "त"), ("d", "द"), ("n", "न"), ("p", "प"), ("f", "फ"), ("b", "ब"), ("m", "म"),
    ("y", "य"), ("r", "र"), ("l", "ल"), ("v", "व"), ("w", "व"), ("s", "स"), ("h", "ह"),
    ("q", "क"), ("z", "ज"),
]
# (roman, independent form, matra form or "" for the inherent vowel)
VOWELS = [
    ("aa", "आ", "ा"), ("ai", "ऐ", "ै"), ("au", "औ", "ौ"), ("ee", "ई", "ी"), ("ii", "ई", "ी"),
    ("oo", "ऊ", "ू"), ("uu", "ऊ", "ू"),
    ("a", "अ", ""), ("i", "इ", "ि"), ("u", "उ", "ु"), ("e", "ए", "े"), ("o", "ओ", "ो"),
]
MODIFIERS = {"M": "ं", "H": "ः", "~": "ँ", "|": "।"}


def _match(table, s, i):
    for entry in table:
        if s.startswith(entry[0], i):
            return entry
    return None


def transliterate(word):
    """Phonetic transliteration of one Roman word (no keyword handling)."""
    # A Capitalised word (Nepaal) is a name, not retroflex letters.
    if (len(word) > 1 and word[0].isupper() and word[1:].islower()
            and not word.startswith(("Th", "Dh", "Sh"))):
        word = word[0].lower() + word[1:]
    out = []
    i = 0
    n = len(word)
    while i < n:
        ch = word[i]
        if ch in MODIFIERS:
            out.append(MODIFIERS[ch])
            i += 1
            continue
        cons = _match(CONSONANTS, word, i)
        if cons is None and word[i].isupper():
            lowered = word[:i] + word[i].lower() + word[i + 1:]
            cons = _match(CONSONANTS, lowered, i)
        if cons is not None:
            out.append(cons[1])
            i += len(cons[0])
            vow = _match(VOWELS, word, i)
            if vow is not None:
                out.append(vow[2])
                i += len(vow[0])
            elif i < n and (_match(CONSONANTS, word, i) is not None
                            or (word[i].isupper() and _match(CONSONANTS, word[:i] + word[i].lower() + word[i + 1:], i) is not None)):
                out.append(HALANT)
            continue
        vow = _match(VOWELS, word, i)
        if vow is None and word[i].isupper():
            vow = _match(VOWELS, word[:i] + word[i].lower() + word[i + 1:], i)
        if vow is not None:
            out.append(vow[1])
            i += len(vow[0])
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def convert_word(word):
    """What a finished word should become: a language keyword, or its transliteration."""
    kw = ALL_KEYWORDS.get(word.lower())
    if kw is not None:
        return kw
    return transliterate(word)
