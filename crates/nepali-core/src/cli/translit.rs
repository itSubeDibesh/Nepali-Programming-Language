/// Roman -> Devanagari phonetic typing.  Port of `translit.py` / `translit.js`;
/// parity checked by `tests/test_translit_parity.rs` against the same 40-word table.

pub const KEYWORDS: &[(&str, &str)] = &[
    ("rakha", "राखौँ"), ("kaam", "काम"), ("yadi", "यदि"), ("bhaye", "भए"), ("natra", "नत्र"),
    ("bhayesamma", "भएसम्म"), ("pathau", "पठाउँ"), ("bhana", "भनौँ"), ("sahi", "सहि"),
    ("galat", "गलत"), ("kehichaina", "केहीछैन"), ("aayat", "आयात"), ("ra", "र"), ("wa", "वा"),
    ("hoina", "होइन"),
];

pub const BUILTINS: &[(&str, &str)] = &[
    ("lambai", "लम्बाइ"), ("akshar", "अक्षर"), ("sanket", "संकेत"), ("thapnuhos", "थप्नुहोस्"),
    ("aaja", "आज"), ("miti_banaunuhos", "मिति_बनाउनुहोस्"), ("miti_padhnuhos", "मिति_पढ्नुहोस्"),
    ("din_farak", "दिन_फरक"), ("umer", "उमेर"), ("haptako_din", "हप्ताको_दिन"), ("input", "इनपुट"),
    ("os_lekhnuhos", "ओएस_लेख्नुहोस्"), ("os_padhnuhos", "ओएस_पढ्नुहोस्"), ("os_suchi", "ओएस_सूची"),
    ("naya_prakriya", "नयाँ_प्रक्रिया"), ("prakriya_suchi", "प्रक्रिया_सूची"),
    ("naya_channel", "नयाँ_च्यानल"), ("channel_pathaunuhos", "च्यानल_पठाउनुहोस्"),
    ("channel_paunuhos", "च्यानल_पाउनुहोस्"), ("database_chalaunuhos", "डाटाबेस_चलाउनुहोस्"),
    ("database_sodhnuhos", "डाटाबेस_सोध्नुहोस्"), ("python_chalaunuhos", "पाइथन_चलाउनुहोस्"),
    ("rust_chalaunuhos", "रस्ट_चलाउनुहोस्"), ("go_chalaunuhos", "गो_चलाउनुहोस्"),
    ("js_chalaunuhos", "जेएस_चलाउनुहोस्"), ("ts_chalaunuhos", "टिएस_चलाउनुहोस्"),
    ("cache_rakhnuhos", "क्यास_राख्नुहोस्"), ("cache_launuhos", "क्यास_ल्याउनुहोस्"),
    ("cache_hataunuhos", "क्यास_हटाउनुहोस्"), ("ai_sodhnuhos", "एआई_सोध्नुहोस्"),
    ("sahayak_sodhnuhos", "सहायक_सोध्नुहोस्"), ("ai_sunnuhos", "एआई_सुन्नुहोस्"),
    ("ai_bolnuhos", "एआई_बोल्नुहोस्"), ("aadesh_chalaunuhos", "आदेश_चलाउनुहोस्"),
    ("agent_chalaunuhos", "एजेन्ट_चलाउनुहोस्"),
];

const HALANT: &str = "्";
const DEV_DIGITS: &str = "०१२३४५६७८९";

/// `5` -> `५`; anything else unchanged.
pub fn to_devanagari_digit(ch: char) -> String {
    ch.to_digit(10)
        .map(|d| DEV_DIGITS.chars().nth(d as usize).unwrap().to_string())
        .unwrap_or_else(|| ch.to_string())
}

// (roman, devanagari) — longest first within each table.
const CONSONANTS: &[(&str, &str)] = &[
    ("chh", "छ"), ("ksh", "क्ष"), ("kh", "ख"), ("gh", "घ"), ("ng", "ङ"), ("ch", "च"),
    ("jh", "झ"), ("Th", "ठ"), ("Dh", "ढ"), ("th", "थ"), ("dh", "ध"), ("ph", "फ"),
    ("bh", "भ"), ("sh", "श"), ("Sh", "ष"), ("tr", "त्र"), ("gy", "ज्ञ"),
    ("k", "क"), ("g", "ग"), ("c", "च"), ("j", "ज"), ("T", "ट"), ("D", "ड"), ("N", "ण"),
    ("t", "त"), ("d", "द"), ("n", "न"), ("p", "प"), ("f", "फ"), ("b", "ब"), ("m", "म"),
    ("y", "य"), ("r", "र"), ("l", "ल"), ("v", "व"), ("w", "व"), ("s", "स"), ("h", "ह"),
    ("q", "क"), ("z", "ज"),
];

// (roman, independent, matra)
const VOWELS: &[(&str, &str, &str)] = &[
    ("aa", "आ", "ा"), ("ai", "ऐ", "ै"), ("au", "औ", "ौ"), ("ee", "ई", "ी"), ("ii", "ई", "ी"),
    ("oo", "ऊ", "ू"), ("uu", "ऊ", "ू"),
    ("a", "अ", ""), ("i", "इ", "ि"), ("u", "उ", "ु"), ("e", "ए", "े"), ("o", "ओ", "ो"),
];

const MODIFIERS: &[(&str, &str)] = &[("M", "ं"), ("H", "ः"), ("~", "ँ"), ("|", "।")];

fn match_cons(table: &[(&str, &str)], s: &str, i: usize) -> Option<(String, String)> {
    for entry in table {
        if s[i..].starts_with(entry.0) {
            return Some((entry.0.to_string(), entry.1.to_string()));
        }
    }
    None
}

fn match_vowel(s: &str, i: usize) -> Option<(String, String, String)> {
    for entry in VOWELS {
        if s[i..].starts_with(entry.0) {
            return Some((entry.0.to_string(), entry.1.to_string(), entry.2.to_string()));
        }
    }
    None
}

fn lower_at(s: &str, i: usize) -> String {
    let mut chars: Vec<char> = s.chars().collect();
    if let Some(c) = chars.get_mut(i) {
        *c = c.to_lowercase().next().unwrap_or(*c);
    }
    chars.into_iter().collect()
}

fn is_upper(c: char) -> bool {
    c.is_uppercase() && c != c.to_lowercase().next().unwrap_or(c)
}

/// Phonetically transliterate one Roman word (no keyword handling).
pub fn transliterate(word: &str) -> String {
    // A capitalised word (Nepaal) is a name, not retroflex letters.
    let word = if word.len() > 1
        && is_upper(word.chars().next().unwrap())
        && word[1..].chars().all(|c| c.is_lowercase())
        && !word.starts_with("Th")
        && !word.starts_with("Dh")
        && !word.starts_with("Sh")
    {
        let mut chars: Vec<char> = word.chars().collect();
        chars[0] = chars[0].to_lowercase().next().unwrap_or(chars[0]);
        chars.into_iter().collect()
    } else {
        word.to_string()
    };

    let n = word.len();
    let mut out = String::new();
    let mut i = 0;
    let mut prev_consonant_no_vowel = false;

    while i < n {
        let ch = word[i..].chars().next().unwrap();
        let ch_len = ch.len_utf8();

        // Modifiers
        if let Some((_, dev)) = MODIFIERS.iter().find(|(r, _)| *r == &word[i..i + ch_len]) {
            out.push_str(dev);
            prev_consonant_no_vowel = false;
            i += ch_len;
            continue;
        }

        // Consonant
        let lowered = if is_upper(ch) { lower_at(&word, i) } else { word.clone() };
        let cons = match_cons(CONSONANTS, &word, i)
            .or_else(|| if is_upper(ch) { match_cons(CONSONANTS, &lowered, i) } else { None });

        if let Some((roman, dev)) = cons {
            // Add halant if previous was a consonant without an intervening vowel.
            if prev_consonant_no_vowel {
                out.push_str(HALANT);
            }
            out.push_str(&dev);
            i += roman.len();
            // After the consonant, check if a vowel follows (consume it as matra).
            // 'a' is the inherent vowel — consumed silently, no matra emitted.
            if let Some((v_roman, _, matra)) = match_vowel(&word, i) {
                i += v_roman.len();
                if !matra.is_empty() {
                    out.push_str(&matra);
                }
                prev_consonant_no_vowel = false;
            } else {
                prev_consonant_no_vowel = true;
            }
            continue;
        }

        // Vowel (standalone)
        if let Some((roman, dev, _)) = match_vowel(&word, i) {
            out.push_str(&dev);
            prev_consonant_no_vowel = false;
            i += roman.len();
            continue;
        }
        if is_upper(ch) {
            if let Some((roman, dev, _)) = match_vowel(&lowered, i) {
                out.push_str(&dev);
                prev_consonant_no_vowel = false;
                i += roman.len();
                continue;
            }
        }

        // Fallback: pass through
        out.push(ch);
        prev_consonant_no_vowel = false;
        i += ch_len;
    }

    out
}

/// What a finished word should become: a language keyword, or its transliteration.
pub fn convert_word(word: &str) -> String {
    let lower = word.to_lowercase();
    for (roman, dev) in KEYWORDS.iter().chain(BUILTINS.iter()) {
        if *roman == lower {
            return (*dev).to_string();
        }
    }
    transliterate(word)
}

/// Transliterate a line: split on word boundaries, convert each word.
pub fn transliterate_line(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    let mut word = String::new();

    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '_' {
            word.push(ch);
        } else {
            if !word.is_empty() {
                out.push_str(&convert_word(&word));
                word.clear();
            }
            // Devanagari digits
            if ch.is_ascii_digit() {
                out.push_str(&to_devanagari_digit(ch));
            } else {
                out.push(ch);
            }
        }
    }
    if !word.is_empty() {
        out.push_str(&convert_word(&word));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_transliteration() {
        assert_eq!(transliterate("namaste"), "नमस्ते");
        assert_eq!(transliterate("kaam"), "काम");
        assert_eq!(transliterate("nepaal"), "नेपाल");
        assert_eq!(transliterate("sansaar"), "सन्सार");
        assert_eq!(transliterate("ramro"), "रम्रो");
        assert_eq!(transliterate("ghar"), "घर");
        assert_eq!(transliterate("pustak"), "पुस्तक");
    }

    #[test]
    fn keyword_conversion() {
        assert_eq!(convert_word("bhana"), "भनौँ");
        assert_eq!(convert_word("rakha"), "राखौँ");
        assert_eq!(convert_word("yadi"), "यदि");
        assert_eq!(convert_word("lambai"), "लम्बाइ");
    }

    #[test]
    fn capitalised_names() {
        assert_eq!(transliterate("Nepaal"), "नेपाल");
        assert_eq!(transliterate("Kathmandu"), "कथ्मन्दु");
        assert_eq!(transliterate("Ram"), "रम");
    }

    #[test]
    fn modifiers() {
        assert_eq!(transliterate("aM"), "अं");
        assert_eq!(transliterate("aH"), "अः");
        assert_eq!(transliterate("a~"), "अँ");
        assert_eq!(transliterate("a|"), "अ।");
    }

    #[test]
    fn consonant_clusters() {
        assert_eq!(transliterate("ksh"), "क्ष");
        assert_eq!(transliterate("gy"), "ज्ञ");
        assert_eq!(transliterate("tr"), "त्र");
        assert_eq!(transliterate("sthe"), "स्थे");
    }

    #[test]
    fn devanagari_digits() {
        assert_eq!(to_devanagari_digit('0'), "०");
        assert_eq!(to_devanagari_digit('5'), "५");
        assert_eq!(to_devanagari_digit('9'), "९");
        assert_eq!(to_devanagari_digit('a'), "a");
    }

    /// 40-word parity table from studio/tests/test_parity.py — Rust must match Python exactly.
    #[test]
    fn parity_40_word_table() {
        let words = [
            "namaste", "kaam", "ramro", "nepaal", "Nepaal", "saMsaar", "sansaar", "lambai",
            "bhasha", "bhaashaa", "bidyaalaya", "pustak", "ghar", "chha", "tapai", "Thik",
            "kaTha", "aH", "a|", "a1+b", "malaai", "dhanyabaad", "Kathmandu", "bhana", "rakha",
            "ai_sodhnuhos", "ra", "Ram", "Dhaka", "Shyam", "ksha", "gyan", "trishul", "ANNA",
            "x", "", "aau", "kaai", "Nn",
        ];

        // Actual Python transliterate.py output (source of truth).
        let expected_transliterate = [
            "नमस्ते", "काम", "रम्रो", "नेपाल", "नेपाल", "संसार", "सन्सार", "लम्बै", "भश",
            "भाशा", "बिद्यालय", "पुस्तक", "घर", "छ", "तपै", "ठिक", "कठ", "अः", "अ।",
            "अ1+ब", "मलाइ", "धन्यबाद", "कथ्मन्दु", "भन", "रख", "ऐ_सोध्नुहोस", "र", "रम",
            "ढक", "ष्यम", "क्ष", "ज्ञन", "त्रिशुल", "अण्णअ", "x", "", "आउ", "काइ", "न्न",
        ];

        // Actual Python convert_word output (source of truth).
        let expected_convert = [
            "नमस्ते", "काम", "रम्रो", "नेपाल", "नेपाल", "संसार", "सन्सार", "लम्बाइ", "भश",
            "भाशा", "बिद्यालय", "पुस्तक", "घर", "छ", "तपै", "ठिक", "कठ", "अः", "अ।",
            "अ1+ब", "मलाइ", "धन्यबाद", "कथ्मन्दु", "भनौँ", "राखौँ", "एआई_सोध्नुहोस्", "र",
            "रम", "ढक", "ष्यम", "क्ष", "ज्ञन", "त्रिशुल", "अण्णअ", "x", "", "आउ", "काइ", "न्न",
        ];

        for (i, word) in words.iter().enumerate() {
            assert_eq!(
                transliterate(word),
                expected_transliterate[i],
                "transliterate({word:?})"
            );
            assert_eq!(
                convert_word(word),
                expected_convert[i],
                "convert_word({word:?})"
            );
        }
    }

    #[test]
    fn keyword_tables_match_python() {
        let mut all = std::collections::HashMap::new();
        for (k, v) in KEYWORDS {
            all.insert(k.to_string(), v.to_string());
        }
        for (k, v) in BUILTINS {
            all.insert(k.to_string(), v.to_string());
        }

        let expected: std::collections::HashMap<String, String> = [
            ("rakha", "राखौँ"), ("kaam", "काम"), ("yadi", "यदि"), ("bhaye", "भए"),
            ("natra", "नत्र"), ("bhayesamma", "भएसम्म"), ("pathau", "पठाउँ"), ("bhana", "भनौँ"),
            ("sahi", "सहि"), ("galat", "गलत"), ("kehichaina", "केहीछैन"), ("aayat", "आयात"),
            ("ra", "र"), ("wa", "वा"), ("hoina", "होइन"), ("lambai", "लम्बाइ"),
            ("akshar", "अक्षर"), ("sanket", "संकेत"), ("thapnuhos", "थप्नुहोस्"),
            ("aaja", "आज"), ("miti_banaunuhos", "मिति_बनाउनुहोस्"), ("miti_padhnuhos", "मिति_पढ्नुहोस्"),
            ("din_farak", "दिन_फरक"), ("umer", "उमेर"), ("haptako_din", "हप्ताको_दिन"), ("input", "इनपुट"),
            ("os_lekhnuhos", "ओएस_लेख्नुहोस्"), ("os_padhnuhos", "ओएस_पढ्नुहोस्"),
            ("os_suchi", "ओएस_सूची"), ("naya_prakriya", "नयाँ_प्रक्रिया"),
            ("prakriya_suchi", "प्रक्रिया_सूची"), ("naya_channel", "नयाँ_च्यानल"),
            ("channel_pathaunuhos", "च्यानल_पठाउनुहोस्"),
            ("channel_paunuhos", "च्यानल_पाउनुहोस्"),
            ("database_chalaunuhos", "डाटाबेस_चलाउनुहोस्"),
            ("database_sodhnuhos", "डाटाबेस_सोध्नुहोस्"),
            ("python_chalaunuhos", "पाइथन_चलाउनुहोस्"),
            ("rust_chalaunuhos", "रस्ट_चलाउनुहोस्"), ("go_chalaunuhos", "गो_चलाउनुहोस्"),
            ("js_chalaunuhos", "जेएस_चलाउनुहोस्"), ("ts_chalaunuhos", "टिएस_चलाउनुहोस्"),
            ("cache_rakhnuhos", "क्यास_राख्नुहोस्"), ("cache_launuhos", "क्यास_ल्याउनुहोस्"),
            ("cache_hataunuhos", "क्यास_हटाउनुहोस्"), ("ai_sodhnuhos", "एआई_सोध्नुहोस्"),
            ("sahayak_sodhnuhos", "सहायक_सोध्नुहोस्"), ("ai_sunnuhos", "एआई_सुन्नुहोस्"),
            ("ai_bolnuhos", "एआई_बोल्नुहोस्"), ("aadesh_chalaunuhos", "आदेश_चलाउनुहोस्"),
            ("agent_chalaunuhos", "एजेन्ट_चलाउनुहोस्"),
        ]
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();

        assert_eq!(all, expected);
    }
}
