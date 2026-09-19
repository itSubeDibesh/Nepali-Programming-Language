"""The browser Studio's JavaScript typing engine must behave exactly like the Python one
(which is checked against the language's real lexer). Skipped if node is not installed."""
import json
import os
import shutil
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "os-image", "overlay", "usr", "local", "lib", "nepali"))
import translit  # noqa: E402

WORDS = [
    "namaste", "kaam", "ramro", "nepaal", "Nepaal", "saMsaar", "sansaar", "lambai", "bhasha",
    "bhaashaa", "bidyaalaya", "pustak", "ghar", "chha", "tapai", "Thik", "kaTha", "aH", "a|",
    "a1+b", "malaai", "dhanyabaad", "Kathmandu", "bhana", "rakha", "ai_sodhnuhos", "ra", "Ram",
    "Dhaka", "Shyam", "ksha", "gyan", "trishul", "ANNA", "x", "", "aau", "kaai", "Nn",
]


@unittest.skipUnless(shutil.which("node"), "node not installed")
class Parity(unittest.TestCase):
    def test_js_matches_python(self):
        js = (
            "const t=require(process.argv[1]);"
            "const w=JSON.parse(process.argv[2]);"
            "console.log(JSON.stringify(w.map(x=>[t.transliterate(x),t.convertWord(x)])));"
        )
        out = subprocess.run(
            ["node", "-e", js, os.path.join(HERE, "..", "translit.js"), json.dumps(WORDS)],
            capture_output=True, text=True, check=True,
        ).stdout
        got = json.loads(out)
        for word, (tr, cw) in zip(WORDS, got):
            self.assertEqual(tr, translit.transliterate(word), f"transliterate({word!r})")
            self.assertEqual(cw, translit.convert_word(word), f"convert_word({word!r})")

    def test_keyword_tables_match(self):
        js = "console.log(JSON.stringify(require(process.argv[1]).KEYWORDS))"
        out = subprocess.run(["node", "-e", js, os.path.join(HERE, "..", "translit.js")],
                             capture_output=True, text=True, check=True).stdout
        self.assertEqual(json.loads(out), translit.ALL_KEYWORDS)


if __name__ == "__main__":
    unittest.main()
