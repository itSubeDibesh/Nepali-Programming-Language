import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "overlay", "usr", "local", "lib", "nepali"))
import translit  # noqa: E402

LEXER = os.path.join(HERE, "..", "..", "crates", "nepali-core", "src", "lexer.rs")


class Transliteration(unittest.TestCase):
    def test_common_words(self):
        cases = {
            "namaste": "नमस्ते", "kaam": "काम", "ramro": "रम्रो", "nepaal": "नेपाल",
            "Nepaal": "नेपाल", "saMsaar": "संसार", "sansaar": "सन्सार", "lambai": "लम्बै",
            "bhasha": "भश", "bhaashaa": "भाशा", "bidyaalaya": "बिद्यालय", "pustak": "पुस्तक",
            "ghar": "घर", "chha": "छ", "tapai": "तपै", "Thik": "ठिक", "dhanyabaad": "धन्यबाद",
        }
        for roman, expected in cases.items():
            self.assertEqual(translit.transliterate(roman), expected, roman)

    def test_retroflex_capitals_and_modifiers(self):
        self.assertEqual(translit.transliterate("Thik"), "ठिक")
        self.assertEqual(translit.transliterate("kaTha"), "कठ")
        self.assertEqual(translit.transliterate("aH"), "अः")
        self.assertEqual(translit.transliterate("a|"), "अ।")

    def test_keywords_become_canonical_devanagari(self):
        for roman, dev in {"bhana": "भनौँ", "rakha": "राखौँ", "kaam": "काम", "yadi": "यदि",
                           "natra": "नत्र", "bhayesamma": "भएसम्म", "pathau": "पठाउँ",
                           "lambai": "लम्बाइ", "ai_sodhnuhos": "एआई_सोध्नुहोस्"}.items():
            self.assertEqual(translit.convert_word(roman), dev)
        # Ordinary Nepali words that happen to be keywords are the right words.
        self.assertEqual(translit.convert_word("ra"), "र")

    def test_non_keywords_are_transliterated(self):
        self.assertEqual(translit.convert_word("namaste"), "नमस्ते")

    def test_digits_and_symbols_pass_through(self):
        self.assertEqual(translit.transliterate("a1+b"), "अ1+ब")

    def test_typed_keywords_are_real_language_keywords(self):
        """Every romanized keyword/builtin here is one the lexer really accepts,
        and maps to the same Devanagari - so the table cannot drift."""
        src = open(LEXER, encoding="utf-8").read()
        aliases = dict(re.findall(r'\("([a-z_]+)", "([^"]+)"\)', src))
        self.assertEqual(aliases, translit.BUILTINS)
        # keywords: "राखौँ" | "rakha" => (TokenType::Let ...
        pairs = {}
        for alts, roman in re.findall(r'((?:"[^"]+" \| )+)"([a-z]+)" => \(TokenType', src):
            pairs[roman] = re.findall(r'"([^"]+)"', alts)[0]
        for roman, dev in translit.KEYWORDS.items():
            self.assertEqual(pairs.get(roman), dev, roman)


if __name__ == "__main__":
    unittest.main()
