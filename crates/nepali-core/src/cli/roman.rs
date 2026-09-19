//! Roman display for terminals that cannot draw Devanagari.
//!
//! A plain Linux console (`TERM=linux`), a non-UTF-8 locale, or an SSH session into a
//! machine without Indic fonts shows Devanagari as boxes. In those cases the shell
//! prints readable Roman letters instead (`नमस्ते` -> `namaste`), using the same
//! scheme the Studio editor accepts as input, so what you read is what you can type.
//! Language keywords map to their real typed forms (`राखौँ` -> `rakha`).
//!
//! Mode: `NEPALI_SCRIPT=roman|devanagari|auto` (default auto: Roman when `TERM` is
//! `linux`/`dumb` or the locale is not UTF-8). `--roman` / `--devanagari` override.

use std::borrow::Cow;
use std::env;
use std::sync::OnceLock;

const KEYWORDS: &[(&str, &str)] = &[
    ("राखौँ", "rakha"), ("काम", "kaam"), ("यदि", "yadi"), ("भए", "bhaye"), ("नत्र", "natra"),
    ("भएसम्म", "bhayesamma"), ("पठाउँ", "pathau"), ("भनौँ", "bhana"), ("सहि", "sahi"),
    ("गलत", "galat"), ("केहीछैन", "kehichaina"), ("आयात", "aayat"), ("र", "ra"), ("वा", "wa"),
    ("होइन", "hoina"),
];

fn consonant(c: char) -> Option<&'static str> {
    Some(match c {
        'क' => "k", 'ख' => "kh", 'ग' => "g", 'घ' => "gh", 'ङ' => "ng", 'च' => "ch", 'छ' => "chh",
        'ज' => "j", 'झ' => "jh", 'ञ' => "ny", 'ट' => "T", 'ठ' => "Th", 'ड' => "D", 'ढ' => "Dh",
        'ण' => "N", 'त' => "t", 'थ' => "th", 'द' => "d", 'ध' => "dh", 'न' => "n", 'प' => "p",
        'फ' => "ph", 'ब' => "b", 'भ' => "bh", 'म' => "m", 'य' => "y", 'र' => "r", 'ल' => "l",
        'ळ' => "l", 'व' => "w", 'श' => "sh", 'ष' => "Sh", 'स' => "s", 'ह' => "h",
        _ => return None,
    })
}

fn independent_vowel(c: char) -> Option<&'static str> {
    Some(match c {
        'अ' => "a", 'आ' => "aa", 'इ' => "i", 'ई' => "ee", 'उ' => "u", 'ऊ' => "oo", 'ऋ' => "ri",
        'ए' => "e", 'ऐ' => "ai", 'ओ' => "o", 'औ' => "au",
        _ => return None,
    })
}

fn matra(c: char) -> Option<&'static str> {
    Some(match c {
        'ा' => "aa", 'ि' => "i", 'ी' => "ee", 'ु' => "u", 'ू' => "oo", 'ृ' => "ri", 'े' => "e",
        'ै' => "ai", 'ो' => "o", 'ौ' => "au",
        _ => return None,
    })
}

const VIRAMA: char = '\u{094D}';

/// A character that continues a Devanagari word (letters, vowel signs, virama, nasal signs).
fn is_word_char(c: char) -> bool {
    ('\u{0900}'..='\u{0963}').contains(&c)
}

fn word_to_roman(word: &str) -> String {
    if let Some((_, roman)) = KEYWORDS.iter().find(|(d, _)| *d == word) {
        return (*roman).to_string();
    }
    for (roman, canonical) in nepali_core::lexer::ROMAN_BUILTIN_ALIASES {
        if *canonical == word {
            return (*roman).to_string();
        }
    }
    let chars: Vec<char> = word.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c == 'क' && chars.get(i + 1) == Some(&VIRAMA) && chars.get(i + 2) == Some(&'ष') {
            out.push_str("ksh");
            i += 3;
            let (o, n) = after_consonant(&chars, i);
            out.push_str(&o);
            i = n;
            continue;
        }
        if c == 'ज' && chars.get(i + 1) == Some(&VIRAMA) && chars.get(i + 2) == Some(&'ञ') {
            out.push_str("gy");
            i += 3;
            let (o, n) = after_consonant(&chars, i);
            out.push_str(&o);
            i = n;
            continue;
        }
        if let Some(base) = consonant(c) {
            out.push_str(base);
            i += 1;
            let (o, n) = after_consonant(&chars, i);
            out.push_str(&o);
            i = n;
        } else if let Some(v) = independent_vowel(c) {
            out.push_str(v);
            i += 1;
        } else if c == 'ं' || c == 'ँ' {
            out.push('n');
            i += 1;
        } else if c == 'ः' {
            out.push('h');
            i += 1;
        } else if c == VIRAMA || c == '\u{200D}' || c == '\u{200C}' {
            i += 1;
        } else {
            out.push(c);
            i += 1;
        }
    }
    out
}

/// What follows a consonant: a vowel sign, a virama (no vowel), or the inherent `a`
/// (dropped at the end of a word, as Nepali does: नेपाल = nepaal, not nepaala).
fn after_consonant(chars: &[char], i: usize) -> (String, usize) {
    match chars.get(i) {
        Some(&m) if matra(m).is_some() => (matra(m).unwrap().to_string(), i + 1),
        Some(&VIRAMA) => (String::new(), i + 1),
        Some(&n) if is_word_char(n) => ("a".to_string(), i),
        _ => (String::new(), i),
    }
}

/// Converts every Devanagari word in `s` to Roman; everything else is untouched.
pub fn to_roman(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut word = String::new();
    let flush = |word: &mut String, out: &mut String| {
        if !word.is_empty() {
            out.push_str(&word_to_roman(word));
            word.clear();
        }
    };
    for c in s.chars() {
        if is_word_char(c) || c == '\u{200D}' || c == '\u{200C}' {
            word.push(c);
            continue;
        }
        flush(&mut word, &mut out);
        match c {
            '।' => out.push('|'),
            '॥' => out.push_str("||"),
            '०'..='९' => out.push(char::from_digit(c as u32 - '०' as u32, 10).unwrap()),
            _ => out.push(c),
        }
    }
    flush(&mut word, &mut out);
    out
}

pub fn roman_mode() -> bool {
    static MODE: OnceLock<bool> = OnceLock::new();
    *MODE.get_or_init(|| match env::var("NEPALI_SCRIPT").ok().as_deref() {
        Some("roman") => true,
        Some("devanagari") => false,
        _ => {
            let term = env::var("TERM").unwrap_or_default();
            if term == "linux" || term == "dumb" {
                return true;
            }
            let locale = ["LC_ALL", "LC_CTYPE", "LANG"]
                .iter()
                .find_map(|k| env::var(k).ok().filter(|v| !v.is_empty()))
                .unwrap_or_default()
                .to_lowercase();
            !locale.is_empty() && !locale.contains("utf-8") && !locale.contains("utf8")
        }
    })
}

/// Text as it should be shown: unchanged normally, Roman on terminals without Devanagari.
pub fn show(s: &str) -> Cow<'_, str> {
    if roman_mode() {
        Cow::Owned(to_roman(s))
    } else {
        Cow::Borrowed(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn common_words_read_naturally() {
        for (dev, roman) in [
            ("नमस्ते", "namaste"), ("नेपाल", "nepaal"), ("काम", "kaam"), ("कहाँ", "kahaan"),
            ("संसार", "sansaar"), ("रम्रो", "ramro"), ("क्षमा", "kshamaa"), ("ज्ञान", "gyaan"),
            ("फिबो", "phibo"), ("ठिक", "Thik"), ("घर", "ghar"), ("पुस्तक", "pustak"),
        ] {
            assert_eq!(to_roman(dev), roman, "{dev}");
        }
    }

    #[test]
    fn language_keywords_use_their_typed_forms() {
        assert_eq!(to_roman("राखौँ x = ५।"), "rakha x = 5|");
        assert_eq!(to_roman("भनौँ(\"नमस्ते\", x)।"), "bhana(\"namaste\", x)|");
        assert_eq!(to_roman("यदि र वा होइन"), "yadi ra wa hoina");
        assert_eq!(to_roman("लम्बाइ(सूची)"), "lambai(soochee)");
    }

    #[test]
    fn non_devanagari_text_is_untouched() {
        assert_eq!(to_roman("hello, world 42 — ok"), "hello, world 42 — ok");
    }

    #[test]
    fn every_keyword_reads_back_as_the_same_token() {
        // The Roman form printed for a keyword must be one the lexer really accepts.
        for (dev, roman) in KEYWORDS {
            let a = nepali_core::Lexer::new(dev).tokenize()[0].token_type.clone();
            let b = nepali_core::Lexer::new(roman).tokenize()[0].token_type.clone();
            assert_eq!(a, b, "{dev} vs {roman}");
        }
    }
}
