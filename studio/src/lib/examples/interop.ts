import { RecipeItem } from '../types';

export const INTEROP_EXAMPLES: RecipeItem[] = [
  {
    id: 'go-interop',
    title: 'Go (Golang) Native Interoperability',
    nepaliTitle: 'गो (Golang) सँग प्रत्यक्ष सहकार्य (Go Interop)',
    category: 'interop',
    description: 'नेपाली प्रोग्रामिङबाटै Go भाषाको कोड, गो-रुटिन, र द्रुत गणना चलाउने।',
    code: `// २० — गो (Go / Golang) सँग प्रत्यक्ष सहकार्य
//
// नेपालीभित्रै Go भाषाको कम्पाइलर र इन्जिन जोडेर उच्च-गतिको कङ्करेन्सी
// र ब्याकइन्ड कार्यहरू गर्न सकिन्छ।

राखौँ गो_कोड = "
package main

import (
    \"fmt\"
    \"math\"
)

func SquareRoot(x float64) float64 {
    return math.Sqrt(x)
}

func main() {
    result := SquareRoot(65536)
    fmt.Printf(\"Go Output: Square root of 65536 is %.2f\\n\", result)
}
";

भनौँ("१. Go कोड कार्यान्वयन गरिँदैछ...");
राखौँ गो_नतिजा = गो_चलाउनुहोस्(गो_कोड);
भनौँ("Go बाट प्राप्त नतिजा:", गो_नतिजा);

// Go को प्रयोग गरी ठूलो सङ्ख्याको गणना
राखौँ गो_योग = गो_चलाउनुहोस्("
package main
import \"fmt\"

func main() {
    total := 0
    for i := 1; i <= 1000; i++ {
        total += i
    }
    fmt.Print(total)
}
");
भनौँ("१ देखि १००० को Go बाट जोडफल:", गो_योग);
`,
  },
  {
    id: 'rust-plugin-abi',
    title: 'Rust FFI & Plugin ABI',
    nepaliTitle: 'रुस्ट (Rust) प्लगइन र नेटिभ FFI (Rust ABI)',
    category: 'interop',
    description: 'nepali-plugin-abi प्रयोग गरी Rust का डाइनामिक प्लगइन (.so/.dylib) र सुरक्षित फङ्क्सनहरू आह्वान गर्ने।',
    code: `// रुस्ट (Rust) FFI र प्लगइन प्रणाली
//
// nepali-plugin-abi मार्फत Rust का डाइनामिक लाइब्ररीहरू शून्य ओभरहेडमा
// सिधै मेमोरीबाट कल गर्न सकिन्छ।

राखौँ रुस्ट_स्रोत = "
#[no_mangle]
pub extern \"C\" fn nepali_add(a: f64, b: f64) -> f64 {
    a + b
}

#[no_mangle]
pub extern \"C\" fn is_prime_fast(n: u64) -> bool {
    if n <= 1 { return false; }
    for d in 2..=((n as f64).sqrt() as u64) {
        if n % d == 0 { return false; }
    }
    true
}
";

भनौँ("१. Rust नेटिभ इन्जिन लोड गरिँदैछ...");
राखौँ रुस्ट_नतिजा = रुस्ट_चलाउनुहोस्(रुस्ट_स्रोत, "nepali_add", [१२५.५, ३७४.५]);
भनौँ("Rust FFI जोड नतिजा:", रुस्ट_नतिजा);

राखौँ अभाज्य_जाँच = रुस्ट_चलाउनुहोस्(रुस्ट_स्रोत, "is_prime_fast", [९८२४५१६५३]);
भनौँ("ठूलो सङ्ख्या अभाज्य जाँच (Rust):", अभाज्य_जाँच);
`,
  },
  {
    id: 'c-codegen-interop',
    title: 'C / C++ Native Codegen',
    nepaliTitle: 'सि (C) नेटिभ कोडजेन र लाइब्रेरी (C Codegen)',
    category: 'interop',
    description: 'nepali-codegen प्रयोग गरी नेपाली कोडलाई सी (C) मा रूपान्तरण गरी बाइनरी बनाउने।',
    code: `// सी (C) कोडजेन र नेटिभ इन्जिन (C Interop)
//
// nepali-codegen ले नेपाली AST लाई C runtime (runtime.c) मा ढाल्छ।

राखौँ सि_कोड = "
#include <stdio.h>
#include <math.h>

double hypotenuse(double a, double b) {
    return sqrt((a * a) + (b * b));
}

int main() {
    double h = hypotenuse(3.0, 4.0);
    printf(\"Hypotenuse: %.2f\\n\", h);
    return 0;
}
";

भनौँ("C इन्जिन मार्फत हाइपोटेनस गणना:");
राखौँ सि_नतिजा = सि_चलाउनुहोस्(सि_कोड);
भनौँ("C बाट प्राप्त मान:", सि_नतिजा);
`,
  },
  {
    id: 'python-interop',
    title: 'Python Native Interoperability',
    nepaliTitle: 'पाइथन (Python) सँग सहकार्य (CPython Interop)',
    category: 'interop',
    description: 'CPython इन्जिन प्रयोग गरी Python को म्याथ, सूची र लाइब्रेरीहरू चलाउने।',
    code: `// पाइथन (Python) सँग प्रत्यक्ष सहकार्य
//
// पाइथन_चलाउनुहोस्(कोड) ले CPython इन्जिनबाट सिधै नतिजा फर्काउँछ।

// १. सामान्य गणितीय हिसाब
भनौँ("१. Python बाट वर्गमूल:", पाइथन_चलाउनुहोस्("import math\nपरिणाम = math.sqrt(१४४)"));

// २. बहु-पंक्ति Python फङ्क्सन
राखौँ पाइथन_कोड = "
def वर्गहरूको_सूची(n):
    return [i * i for i in range(1, n + 1)]

परिणाम = वर्गहरूको_सूची(5)
";

भनौँ("२. Python फङ्क्सनको नतिजा:", पाइथन_चलाउनुहोस्(पाइथन_कोड));

// ३. Python बाट योग निकाली नेपाली चरमा प्रयोग
राखौँ योग = पाइथन_चलाउनुहोस्("परिणाम = sum(range(1, 101))");
भनौँ("३. १ देखि १०० को जोड:", योग, " → दोब्बर:", योग * २);
`,
  },
  {
    id: 'js-ts-interop',
    title: 'JavaScript & TypeScript Interop',
    nepaliTitle: 'जाभास्क्रिप्ट र टाइपस्क्रिप्ट (JS / TS QuickJS)',
    category: 'interop',
    description: 'QuickJS इन्जिनबाट JS म्यापिङ र TypeScript प्रकार इन्टरफेस चलाउने।',
    code: `// जाभास्क्रिप्ट र टाइपस्क्रिप्ट (JS / TS) सहकार्य

// १. QuickJS मार्फत म्याप र लम्बाइ
भनौँ("१. JS Map:", जेएस_चलाउनुहोस्("[1, 2, 3, 4].map(x => x * 10)"));
भनौँ("२. JS String:", जेएस_चलाउनुहोस्("'नमस्ते'.toUpperCase() + ' ' + 'संसार'"));

// २. TypeScript प्रकार (Types) र इन्टरफेस सहित
राखौँ टिएस_कोड = "
interface बिन्दु { x: number; y: number }
function दूरी(क: बिन्दु, ख: बिन्दु): number {
  const dx: number = क.x - ख.x;
  const dy: number = क.y - ख.y;
  return Math.sqrt(dx * dx + dy * dy);
}
दूरी({ x: 0, y: 0 }, { x: 3, y: 4 })
";

भनौँ("३. TypeScript बाट दूरी:", टिएस_चलाउनुहोस्(टिएस_कोड));
`,
  },
  {
    id: 'wasm-sandboxing',
    title: 'WebAssembly (WASM) Sandbox',
    nepaliTitle: 'वेब-एसेम्बली स्यान्डबक्स (WASM Sandbox)',
    category: 'interop',
    description: 'कुनै पनि ब्याकइन्ड बिना सिधै ब्राउजरको WASM मेमोरीमा कोड सुरक्षित चलाउने।',
    code: `// वेब-एसेम्बली (WASM) मोड
//
// nepali-wasm क्रेटले सम्पूर्ण इन्टरप्रेटरलाई WebAssembly मा
// कम्पाइल गरेर ब्राउजरमै शून्य-ल्याटेन्सी रनटाइम प्रदान गर्छ।

राखौँ नाम = "WASM रनटाइम";
भनौँ("नमस्ते,", नाम);
भनौँ("यो कोड सिधै ब्राउजरको WebAssembly स्यान्डबक्समा चलिरहेको छ!");

राखौँ गन्ती = १;
भएसम्म गन्ती <= ५ {
    भनौँ("WASM चक्र:", गन्ती, "→ वर्ग:", गन्ती * गन्ती);
    गन्ती = गन्ती + १;
}
`,
  },
];
