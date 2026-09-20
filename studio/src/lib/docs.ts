export interface DocItem {
  name: string;
  devanagari: string;
  romanAlias: string;
  category: 'keyword' | 'builtin' | 'date' | 'io' | 'array' | 'system';
  signature: string;
  description: string;
  englishDescription: string;
  example: string;
}

export const DOCS_CATALOG: DocItem[] = [
  // 1. Core Keywords
  {
    name: 'राखौँ',
    devanagari: 'राखौँ',
    romanAlias: 'rakha / man',
    category: 'keyword',
    signature: 'राखौँ चर_नाम = मान।',
    description: 'नयाँ चर (variable) घोषणा गर्न प्रयोग गरिन्छ।',
    englishDescription: 'Declares a new variable in local or outer scope.',
    example: 'राखौँ सन्देश = "नमस्ते नेपाल!";'
  },
  {
    name: 'यदि',
    devanagari: 'यदि',
    romanAlias: 'yadi',
    category: 'keyword',
    signature: 'यदि (सर्त) भने { ... } अथवा { ... }',
    description: 'सर्त परीक्षण (Conditional branching) गर्न प्रयोग गरिन्छ।',
    englishDescription: 'Executes a block if condition is true.',
    example: 'यदि (उमेर >= १८) भने {\n  भनौँ("मतदान योग्य");\n}'
  },
  {
    name: 'अथवा',
    devanagari: 'अथवा',
    romanAlias: 'athawa / athwa',
    category: 'keyword',
    signature: 'यदि (...) { ... } अथवा { ... }',
    description: 'यदि सर्त गलत भएमा वैकल्पिक कोड खण्ड चलाउँछ (else clause)।',
    englishDescription: 'Alternative branch if preceding condition evaluates to false.',
    example: 'यदि (x > 0) {\n  भनौँ("धनात्मक");\n} अथवा {\n  भनौँ("ऋणात्मक वा शून्य");\n}'
  },
  {
    name: 'जबसम्म',
    devanagari: 'जबसम्म / भएसम्म',
    romanAlias: 'jabasamma / bhaesamma',
    category: 'keyword',
    signature: 'जबसम्म (सर्त) { ... }',
    description: 'सर्त साँचो भएसम्म लुप दोहोर्याउँछ (While loop)।',
    englishDescription: 'Repeats execution of code block while condition remains true.',
    example: 'राखौँ i = 0।\nजबसम्म (i < 5) {\n  भनौँ("गणना:", i);\n  राखौँ i = i + 1;\n}'
  },
  {
    name: 'काम',
    devanagari: 'काम',
    romanAlias: 'kaam',
    category: 'keyword',
    signature: 'काम कार्य_नाम(तर्क१, तर्क२) { ... पठाउँ नतिजा; }',
    description: 'नयाँ प्रकार्य (Function) परिभाषित गर्न प्रयोग गरिन्छ।',
    englishDescription: 'Defines a callable function with parameters and return value.',
    example: 'काम जोड(क, ख) {\n  पठाउँ क + ख;\n}'
  },
  {
    name: 'पठाउँ',
    devanagari: 'पठाउँ / फर्कनुहोस्',
    romanAlias: 'pathau / pharkanuhos',
    category: 'keyword',
    signature: 'पठाउँ मान;',
    description: 'प्रकार्यबाट नतिजा फर्काउन प्रयोग गरिन्छ (Return statement)।',
    englishDescription: 'Returns a value from the currently executing function.',
    example: 'पठाउँ परिणाम;'
  },

  // 2. Date Builtins (WP9)
  {
    name: 'आज',
    devanagari: 'आज()',
    romanAlias: 'aaja()',
    category: 'date',
    signature: 'आज() -> [वर्ष, महिना, दिन]',
    description: 'प्रणालीको घडीबाट आजको वर्तमान मिति एरेको रूपमा फर्काउँछ।',
    englishDescription: 'Returns the current local date as [year, month, day] array.',
    example: 'राखौँ मिति = आज();\nभनौँ("आजको मिति:", मिति);'
  },
  {
    name: 'दिन_फरक',
    devanagari: 'दिन_फरक(मिति१, मिति२)',
    romanAlias: 'din_pharak(d1, d2)',
    category: 'date',
    signature: 'दिन_फरक(मिति१: पाठ|सूची, मिति२: पाठ|सूची) -> संख्या',
    description: 'दुई मितिहरू बीचको दिनको फरक (मिति२ - मिति१) गणना गर्छ।',
    englishDescription: 'Computes total integer days difference between two ISO or Devanagari dates.',
    example: 'राखौँ फरक = दिन_फरक("2026-01-01", "2026-09-20");\nभनौँ("दिनहरू:", फरक);'
  },
  {
    name: 'उमेर',
    devanagari: 'उमेर(जन्ममिति)',
    romanAlias: 'umer(birthdate)',
    category: 'date',
    signature: 'उमेर(जन्ममिति: पाठ|सूची) -> संख्या',
    description: 'जन्ममितिबाट आजसम्म बितेको पूर्ण वर्ष (उमेर) गणना गर्छ।',
    englishDescription: 'Calculates completed integer years of age from birth date up to today.',
    example: 'राखौँ मेरो_उमेर = उमेर("2000-05-14");\nभनौँ("उमेर:", मेरो_उमेर, "वर्ष");'
  },
  {
    name: 'हप्ताको_दिन',
    devanagari: 'हप्ताको_दिन(मिति)',
    romanAlias: 'haptako_din(d)',
    category: 'date',
    signature: 'हप्ताको_दिन(मिति: पाठ|सूची) -> पाठ',
    description: 'दिइएको मितिको हप्ताको बार (आइतबार, सोमबार, आदि) फर्काउँछ।',
    englishDescription: 'Returns the day of the week for given date in Nepali.',
    example: 'राखौँ बार = हप्ताको_दिन(आज());\nभनौँ("आजको बार:", बार);'
  },
  {
    name: 'मिति_बनाउनुहोस्',
    devanagari: 'मिति_बनाउनुहोस्(वर्ष, महिना, दिन)',
    romanAlias: 'miti_banaunuhos(y, m, d)',
    category: 'date',
    signature: 'मिति_बनाउनुहोस्(y: संख्या, m: संख्या, d: संख्या) -> सूची',
    description: 'वर्ष, महिना र दिन जाँचेर प्रमाणित नयाँ मिति एरे सिर्जना गर्छ।',
    englishDescription: 'Creates and validates a new date array [y, m, d], checking leap years.',
    example: 'राखौँ मिति = मिति_बनाउनुहोस्(2026, 9, 20);'
  },
  {
    name: 'मिति_पढ्नुहोस्',
    devanagari: 'मिति_पढ्नुहोस्(पाठ)',
    romanAlias: 'miti_padhnuhos(text)',
    category: 'date',
    signature: 'मिति_पढ्नुहोस्(पाठ: पाठ) -> सूची',
    description: 'आईएसओ पाठ वा देवनागरी अंक २०२६-०९-२० लाई [y, m, d] मा विश्लेषण गर्छ।',
    englishDescription: 'Parses ISO date strings or Devanagari numerals into [year, month, day].',
    example: 'राखौँ अंक = मिति_पढ्नुहोस्("२०२६-०९-२०");'
  },

  // 3. I/O & Builtins
  {
    name: 'लेख्नुहोस्',
    devanagari: 'लेख्नुहोस् / भनौँ / छाप्नुहोस्',
    romanAlias: 'lekhnuhos / bhana / chhapnuhos',
    category: 'io',
    signature: 'लेख्नुहोस्(मान१, मान२, ...)',
    description: 'कन्सोलमा पाठ वा चरको मान छाप्न प्रयोग गरिन्छ (Standard Output)।',
    englishDescription: 'Prints one or more values to standard output.',
    example: 'लेख्नुहोस्("नमस्ते संसार!", 42);'
  },
  {
    name: 'भनौँ',
    devanagari: 'भनौँ',
    romanAlias: 'bhana / bhanau',
    category: 'io',
    signature: 'भनौँ(मान१, मान२, ...)',
    description: 'मान कन्सोलमा छाप्न प्रयोग गरिन्छ (Print alias)।',
    englishDescription: 'Prints values to standard output.',
    example: 'भनौँ("नमस्ते नेपाल!");'
  },
  {
    name: 'इनपुट',
    devanagari: 'इनपुट(प्रश्न)',
    romanAlias: 'input(prompt)',
    category: 'io',
    signature: 'इनपुट(प्रश्न: पाठ) -> पाठ',
    description: 'प्रयोगकर्ताबाट प्रश्न सोधेर पाठ इनपुट लिन्छ।',
    englishDescription: 'Prompts the user for a line of text input and returns the string.',
    example: 'राखौँ नाम = इनपुट("नाम के हो? ");'
  },
  {
    name: 'लम्बाइ',
    devanagari: 'लम्बाइ(मान)',
    romanAlias: 'lambai(val)',
    category: 'array',
    signature: 'लम्बाइ(सूची वा पाठ) -> संख्या',
    description: 'सूचीको तत्व संख्या वा स्ट्रिङको अक्षर संख्या फर्काउँछ।',
    englishDescription: 'Returns the length of an array or unicode character count of string.',
    example: 'राखौँ सङ्ख्या = [10, 20, 30];\nभनौँ("लम्बाइ:", लम्बाइ(सङ्ख्या));'
  },
  {
    name: 'थप्नुहोस्',
    devanagari: 'थप्नुहोस्(सूची, मान)',
    romanAlias: 'thapnuhos(arr, val)',
    category: 'array',
    signature: 'थप्नुहोस्(सूची: सूची, मान: कुनै) -> शून्य',
    description: 'सूचीको अन्त्यमा नयाँ तत्व थप्छ (Array push)।',
    englishDescription: 'Appends a new value to the end of an array.',
    example: 'राखौँ सूची = [1, 2];\nथप्नुहोस्(सूची, 3);'
  }
];

export function getDocumentationForSymbol(symbol: string): DocItem | null {
  if (!symbol) return null;
  const clean = symbol.trim().replace(/[()।;,]/g, '');
  return (
    DOCS_CATALOG.find(
      (d) =>
        d.name === clean ||
        d.devanagari.includes(clean) ||
        d.romanAlias.split(/[\s/]+/).includes(clean.toLowerCase())
    ) || null
  );
}
