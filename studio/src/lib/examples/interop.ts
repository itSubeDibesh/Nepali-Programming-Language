import { RecipeItem } from '../types';

export const INTEROP_EXAMPLES: RecipeItem[] = [
  {
    id: 'go-interop',
    title: 'Go (Golang) Native Plugin Interoperability',
    nepaliTitle: 'गो (Golang) प्लगइन सहकार्य (Go Interop)',
    category: 'interop',
    description: 'nepali-plugin-abi C-ABI मार्फत गो (Go) का कम्पाइल गरिएका प्लगइनहरू (.so/.dylib) आह्वान गर्ने।',
    code: `// २० — गो (Go / Golang) सँग प्रत्यक्ष सहकार्य
//
// nepali-plugin-abi मार्फत Go c-shared प्लगइनहरू शून्य ओभरहेडमा
// कल गर्न सकिन्छ (गो_चलाउनुहोस्)।
// पहिले 'go build -buildmode=c-shared -o libgo.so' चलाउनुहोस्।

भनौँ("१. Go प्लगइन FFI इन्टरफेस तयार छ।");
भनौँ("२. ढाँचा: गो_चलाउनुहोस्(बाटो, फङ्क्सन, तर्क१, तर्क२)");
`,
  },
  {
    id: 'rust-plugin-abi',
    title: 'Rust FFI & Plugin ABI',
    nepaliTitle: 'रस्ट (Rust) प्लगइन र नेटिभ FFI (Rust ABI)',
    category: 'interop',
    description: 'nepali-plugin-abi प्रयोग गरी Rust का डाइनामिक प्लगइन (.so/.dylib) र सुरक्षित फङ्क्सनहरू आह्वान गर्ने।',
    code: `// रस्ट (Rust) FFI र प्लगइन प्रणाली
//
// nepali-plugin-abi मार्फत Rust का डाइनामिक लाइब्ररीहरू शून्य ओभरहेडमा
// सिधै मेमोरीबाट कल गर्न सकिन्छ (रस्ट_चलाउनुहोस्)।
// पहिले 'cargo build --release' मार्फत प्लगइन कम्पाइल गर्नुहोस्।

भनौँ("१. Rust नेटिभ इन्जिन प्लगइन FFI इन्टरफेस तयार छ।");
भनौँ("२. ढाँचा: रस्ट_चलाउनुहोस्(बाटो, फङ्क्सन, तर्क१, तर्क२)");
`,
  },
  {
    id: 'c-codegen-interop',
    title: 'External Command & C Compiler Runner',
    nepaliTitle: 'आदेश र सी (C) कम्पाइलर रनर (Command Runner)',
    category: 'interop',
    description: 'आदेश_चलाउनुहोस् प्रयोग गरी सी कम्पाइलर (gcc/clang) वा कुनै पनि बाह्य प्रोग्राम चलाउने।',
    code: `// बाह्य आदेश र C कम्पाइलर रनर (Command Runner)
//
// आदेश_चलाउनुहोस्(प्रोग्राम, [तर्क१, तर्क२]) ले सुरक्षित रूपमा कमान्ड चलाउँछ।

भनौँ("१. बाह्य प्रणाली आदेश जाँच गरिँदैछ...");
राखौँ नतिजा = आदेश_चलाउनुहोस्("uname", ["-s", "-m"]);
भनौँ("प्रणाली विवरण:", नतिजा);
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
// पाइथन_चलाउनुहोस्(कोड) ले CPython इन्जिनबाट सिधै 'परिणाम' को मान फर्काउँछ।

// १. सामान्य गणितीय हिसाब
राखौँ पाइथन_हिसाब = "import math\\nपरिणाम = math.sqrt(144)";
भनौँ("१. Python बाट वर्गमूल:", पाइथन_चलाउनुहोस्(पाइथन_हिसाब));

// २. बहु-पंक्ति Python फङ्क्सन
राखौँ पाइथन_कोड = "def square_list(n):\\n    return [i * i for i in range(1, n + 1)]\\nपरिणाम = square_list(5)";

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
राखौँ टिएस_कोड = "interface बिन्दु { x: number; y: number }\\nfunction दूरी(क: बिन्दु, ख: बिन्दु): number {\\n  const dx: number = क.x - ख.x;\\n  const dy: number = क.y - ख.y;\\n  return Math.sqrt(dx * dx + dy * dy);\\n}\\nदूरी({ x: 0, y: 0 }, { x: 3, y: 4 })";

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
