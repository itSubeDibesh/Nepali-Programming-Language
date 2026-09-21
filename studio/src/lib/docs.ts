export interface DocItem {
  name: string;
  devanagari: string;
  romanAlias: string;
  aliases?: string[];
  category: 'keyword' | 'builtin' | 'date' | 'io' | 'array' | 'system' | 'literal';
  signature: string;
  description: string;
  englishDescription: string;
  example: string;
}

export const DOCS_CATALOG: DocItem[] = [
  // 1. Core Variable & Keywords
  {
    name: 'राखौँ',
    devanagari: 'राखौँ',
    romanAlias: 'rakha / rakhau / man',
    aliases: ['राखौँ', 'राखौं', 'राखौ', 'rakha', 'rakhau', 'rakhaun', 'rakhom', 'man'],
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
    aliases: ['यदि', 'yadi'],
    category: 'keyword',
    signature: 'यदि (सर्त) भने { ... } अथवा { ... }',
    description: 'सर्त परीक्षण (Conditional branching) गर्न प्रयोग गरिन्छ।',
    englishDescription: 'Executes a block if condition is true.',
    example: 'यदि (उमेर >= १८) भने {\n  भनौँ("मतदान योग्य हुनुहुन्छ।");\n}'
  },
  {
    name: 'अथवा',
    devanagari: 'अथवा',
    romanAlias: 'athawa / natra',
    aliases: ['अथवा', 'athawa', 'athwa', 'नत्र', 'natra'],
    category: 'keyword',
    signature: 'अथवा { ... }',
    description: 'यदि सर्त गलत भएमा वैकल्पिक कोड खण्ड चलाउँछ (else)।',
    englishDescription: 'Executes alternative code block when "if" condition is false.',
    example: 'यदि (अंक >= ४०) भने {\n  भनौँ("उत्तीर्ण");\n} अथवा {\n  भनौँ("अनुत्तीर्ण");\n}'
  },
  {
    name: 'भने',
    devanagari: 'भने',
    romanAlias: 'bhane / bhaye',
    aliases: ['भने', 'bhane', 'भए', 'bhaye'],
    category: 'keyword',
    signature: 'यदि (सर्त) भने { ... }',
    description: 'यदि सर्तपछि प्रयोग हुने संयोजन शब्द (then block delimiter)।',
    englishDescription: 'Syntactic keyword marking the conditional then block.',
    example: 'यदि (सङ्ख्या > ०) भने { भनौँ("सकारात्मक"); }'
  },
  {
    name: 'भएसम्म',
    devanagari: 'भएसम्म',
    romanAlias: 'bhayesamma / jabasamma',
    aliases: ['भएसम्म', 'bhayesamma', 'जबसम्म', 'jabasamma'],
    category: 'keyword',
    signature: 'भएसम्म (सर्त) { ... }',
    description: 'सर्त साँचो भएसम्म लुप चलाउँछ (while loop)।',
    englishDescription: 'Executes code block repeatedly while condition evaluates to true.',
    example: 'राखौँ गन्ती = ०।\nभएसम्म गन्ती < ५ {\n  भनौँ(गन्ती);\n  गन्ती = गन्ती + १।\n}'
  },
  {
    name: 'काम',
    devanagari: 'काम',
    romanAlias: 'kaam / fn',
    aliases: ['काम', 'kaam', 'fn'],
    category: 'keyword',
    signature: 'काम कार्य_नाम(प्यारामिटरहरू) { ... }',
    description: 'नयाँ प्रयोगकर्ता-परिभाषित कार्य (Function) बनाउन प्रयोग गरिन्छ।',
    englishDescription: 'Defines a reusable function with arguments and local scope.',
    example: 'काम जोड्नुहोस्(क, ख) {\n  पठाउँ क + ख।\n}\nभनौँ(जोड्नुहोस्(५, १०));'
  },
  {
    name: 'पठाउँ',
    devanagari: 'पठाउँ',
    romanAlias: 'pathau / return',
    aliases: ['पठाउँ', 'पठाउं', 'पठाउ', 'पठाऔँ', 'pathau', 'pathaun', 'pathaum', 'pharkanuhos', 'फर्कनुहोस्'],
    category: 'keyword',
    signature: 'पठाउँ मान।',
    description: 'कार्यबाट मान फिर्ता पठाउँछ (Return value from function)।',
    englishDescription: 'Returns an evaluation value from the current function invocation.',
    example: 'काम दोब्बर(x) {\n  पठाउँ x * २।\n}'
  },

  // 2. Builtin IO & Core Functions
  {
    name: 'भनौँ',
    devanagari: 'भनौँ(मानहरू...)',
    romanAlias: 'bhana / print',
    aliases: ['भनौँ', 'भनौं', 'भनौ', 'bhana', 'bhanau', 'bhanom', 'bhanaun', 'लेख्नुहोस्', 'lekhnuhos', 'छाप्नुहोस्', 'chhapnuhos'],
    category: 'io',
    signature: 'भनौँ(...मानहरू: कुनै) -> शून्य',
    description: 'कन्सोलमा सन्देश वा चरको मान छाप्छ (Standard Output)।',
    englishDescription: 'Prints text or evaluated expressions directly to stdout.',
    example: 'भनौँ("नमस्ते नेपाल!", २०८१);'
  },
  {
    name: 'इनपुट',
    devanagari: 'इनपुट(सन्देश?)',
    romanAlias: 'input(prompt?) / inपुट(prompt?)',
    aliases: ['इनपुट', 'inपुट', 'input', 'inapt', 'input_sodhnuhos'],
    category: 'io',
    signature: 'इनपुट(...सन्देश?: कुनै) -> स्ट्रिङ',
    description: 'प्रयोगकर्ताबाट अन्तरक्रियात्मक इनपुट लिन्छ (Interactive User Input)। कुनै पनि प्रकारको प्रम्प्ट (संख्या, बुलियन, स्ट्रिङ, आदि) स्वीकार गर्दछ।',
    englishDescription: 'Prompts user for text input and returns the captured string. Accepts prompts of any type.',
    example: 'राखौँ उमेर = संख्या(इनपुट("उमेर दिनुहोस्: "));\nभनौँ("अर्को वर्ष:", उमेर + १);'
  },
  {
    name: 'संख्या',
    devanagari: 'संख्या(मान)',
    romanAlias: 'sankhya(val) / number(val)',
    aliases: ['संख्या', 'सङ्ख्या', 'sankhya', 'number', 'ank'],
    category: 'builtin',
    signature: 'संख्या(मान: स्ट्रिङ | बुलियन | सङ्ख्या) -> सङ्ख्या',
    description: 'स्ट्रिङ वा बुलियन मानलाई सङ्ख्यामा रूपान्तरण गर्दछ (Devanagari र ASCII दुवै अङ्क समर्थित)।',
    englishDescription: 'Converts a string (supporting both Devanagari and ASCII numerals), boolean, or number to a number.',
    example: 'राखौँ मान = संख्या(इनपुट("उमेर: "));\nभनौँ("१० वर्षपछि:", मान + १०);'
  },
  {
    name: 'स्ट्रिङ',
    devanagari: 'स्ट्रिङ(मान)',
    romanAlias: 'string(val) / str(val)',
    aliases: ['स्ट्रिङ', 'string', 'str', 'path', 'पाठ'],
    category: 'builtin',
    signature: 'स्ट्रिङ(...मानहरू: कुनै) -> स्ट्रिङ',
    description: 'कुनै पनि मान वा चरलाई स्ट्रिङ (अक्षर रूप) मा रूपान्तरण गर्दछ।',
    englishDescription: 'Converts any value or values to their string representation.',
    example: 'राखौँ पाठ = स्ट्रिङ(२५);\nभनौँ("लम्बाइ:", लम्बाइ(पाठ));'
  },
  {
    name: 'प्रकार',
    devanagari: 'प्रकार(मान)',
    romanAlias: 'prakar(val) / type(val)',
    aliases: ['प्रकार', 'prakar', 'type'],
    category: 'builtin',
    signature: 'प्रकार(मान: कुनै) -> स्ट्रिङ',
    description: 'कुनै पनि चर वा मानको प्रकार (डाटा टाइप) पत्ता लगाउँछ ("संख्या", "स्ट्रिङ", "बुलियन", "सूची", "शून्य", "काम")।',
    englishDescription: 'Returns the type name of any value ("संख्या", "स्ट्रिङ", "बुलियन", "सूची", "शून्य", "काम").',
    example: 'भनौँ(प्रकार(४२)); // "संख्या"\nभनौँ(प्रकार("नेपाल")); // "स्ट्रिङ"'
  },

  // 3. Date & Time Builtins
  {
    name: 'आज',
    devanagari: 'आज()',
    romanAlias: 'aaja() / today()',
    aliases: ['आज', 'aaja'],
    category: 'date',
    signature: 'आज() -> मिति_स्ट्रिङ (YYYY-MM-DD)',
    description: 'वर्तमान क्यालेन्डर मिति स्ट्रिङ ढाँचामा फर्काउँछ।',
    englishDescription: 'Returns current date in ISO format (YYYY-MM-DD).',
    example: 'राखौँ चालू_मिति = आज();\nभनौँ("आजको मिति:", चालू_मिति);'
  },
  {
    name: 'मिति_बनाउनुहोस्',
    devanagari: 'मिति_बनाउनुहोस्(वर्ष, महिना, दिन)',
    romanAlias: 'miti_banaunuhos(y, m, d)',
    aliases: ['मिति_बनाउनुहोस्', 'miti_banaunuhos'],
    category: 'date',
    signature: 'मिति_बनाउनुहोस्(वर्ष: सङ्ख्या, महिना: सङ्ख्या, दिन: सङ्ख्या) -> स्ट्रिङ',
    description: 'वर्ष, महिना र दिनबाट मानक मिति स्ट्रिङ बनाउँछ।',
    englishDescription: 'Creates and validates an ISO date string from year, month, and day integers.',
    example: 'राखौँ जन्मदिन = मिति_बनाउनुहोस्(२०५५, ५, १२);'
  },
  {
    name: 'दिन_फरक',
    devanagari: 'दिन_फरक(मिति१, मिति२)',
    romanAlias: 'din_farak(d1, d2)',
    aliases: ['दिन_फरक', 'din_farak', 'din_pharak'],
    category: 'date',
    signature: 'दिन_फरक(मिति१: स्ट्रिङ, मिति२: स्ट्रिङ) -> सङ्ख्या',
    description: 'दुई मितिहरू बीचको दिन संख्या गणना गर्दछ।',
    englishDescription: 'Calculates the absolute difference in days between two date strings.',
    example: 'राखौँ दिन = दिन_फरक("2026-01-01", "2026-01-15");\nभनौँ("दिन फरक:", दिन);'
  },
  {
    name: 'उमेर',
    devanagari: 'उमेर(जन्ममिति, सन्दर्भमिति?)',
    romanAlias: 'umer(birthdate, referenceDate?)',
    aliases: ['उमेर', 'umer', 'umera'],
    category: 'date',
    signature: 'उमेर(जन्ममिति: स्ट्रिङ, सन्दर्भमिति?: स्ट्रिङ) -> सङ्ख्या',
    description: 'जन्ममितिको आधारमा पूरा भएको वर्ष (उमेर) निकाल्छ।',
    englishDescription: 'Calculates completed age in years from birthdate.',
    example: 'राखौँ मेरो_उमेर = उमेर("1998-05-20");\nभनौँ("उमेर वर्ष:", मेरो_उमेर);'
  },
  {
    name: 'हप्ताको_दिन',
    devanagari: 'हप्ताको_दिन(मिति)',
    romanAlias: 'haptako_din(date)',
    aliases: ['हप्ताको_दिन', 'haptako_din'],
    category: 'date',
    signature: 'हप्ताको_दिन(मिति: स्ट्रिङ) -> स्ट्रिङ (आइतबार..शनिबार)',
    description: 'कुनै पनि मितिको बार (हप्ताको दिन) पत्ता लगाउँछ।',
    englishDescription: 'Returns the day of the week in Nepali for a given date.',
    example: 'भनौँ("बार:", हप्ताको_दिन("2026-09-20"));'
  },

  // 4. Arrays & Sequences
  {
    name: 'लम्बाइ',
    devanagari: 'लम्बाइ(सूची_वा_स्ट्रिङ)',
    romanAlias: 'lambai(arr_or_str)',
    aliases: ['लम्बाइ', 'lambai'],
    category: 'array',
    signature: 'लम्बाइ(तत्व: सूची | स्ट्रिङ) -> सङ्ख्या',
    description: 'सूचीको तत्व संख्या वा स्ट्रिङको अक्षर संख्या फर्काउँछ।',
    englishDescription: 'Returns the length of an array or unicode character count of string.',
    example: 'राखौँ सङ्ख्या = [10, 20, 30];\nभनौँ("लम्बाइ:", लम्बाइ(सङ्ख्या));'
  },
  {
    name: 'थप्नुहोस्',
    devanagari: 'थप्नुहोस्(सूची, मान)',
    romanAlias: 'thapnuhos(arr, val)',
    aliases: ['थप्नुहोस्', 'thapnuhos'],
    category: 'array',
    signature: 'थप्नुहोस्(सूची: सूची, मान: कुनै) -> शून्य',
    description: 'सूचीको अन्त्यमा नयाँ तत्व थप्छ (Array push)।',
    englishDescription: 'Appends a new value to the end of an array.',
    example: 'राखौँ सूची = [1, 2];\nथप्नुहोस्(सूची, 3);'
  },

  // 5. Literals
  {
    name: 'सहि',
    devanagari: 'सहि',
    romanAlias: 'sahi / true',
    aliases: ['सहि', 'sahi', 'साँच्चै', 'saanchchai', 'saachchai'],
    category: 'literal',
    signature: 'सहि (सत्य मान - boolean true)',
    description: 'सत्य बुलियन मान (boolean true)।',
    englishDescription: 'Boolean true constant value.',
    example: 'राखौँ सक्रिय = सहि;'
  },
  {
    name: 'गलत',
    devanagari: 'गलत',
    romanAlias: 'galat / false',
    aliases: ['गलत', 'galat', 'झूट', 'jhoot', 'jhut'],
    category: 'literal',
    signature: 'गलत (असत्य मान - boolean false)',
    description: 'असत्य बुलियन मान (boolean false)।',
    englishDescription: 'Boolean false constant value.',
    example: 'राखौँ समाप्त = गलत;'
  },
  {
    name: 'केहीछैन',
    devanagari: 'केहीछैन',
    romanAlias: 'kehichaina / null',
    aliases: ['केहीछैन', 'kehichaina', 'शून्य', 'shoonya', 'shunya'],
    category: 'literal',
    signature: 'केहीछैन (रिक्त मान - null/nil)',
    description: 'कुनै मान नभएको अवस्था (null/none)।',
    englishDescription: 'Null / empty value representation.',
    example: 'राखौँ परिणाम = केहीछैन;'
  },
  {
    name: 'पूर्णविराम',
    devanagari: '।',
    romanAlias: 'purna biram (.)',
    aliases: ['।', '॥'],
    category: 'keyword',
    signature: 'वाक्य समाप्ति संकेत (Statement Terminator)',
    description: 'नेपाली भाषामा स्टेटमेन्टको अन्त्य जनाउन प्रयोग गरिन्छ (Semicolon समतुल्य)।',
    englishDescription: 'Statement terminator in Nepali programming language.',
    example: 'भनौँ("नमस्ते")।'
  }
];

export function getDocumentationForSymbol(symbol: string): DocItem | null {
  if (!symbol) return null;
  const clean = symbol.trim().replace(/[()\s;,]/g, '');
  if (!clean) return null;

  // 1. Direct match on name or aliases
  const exact = DOCS_CATALOG.find((d) => {
    if (d.name === clean) return true;
    if (d.aliases && d.aliases.includes(clean)) return true;
    if (d.aliases && d.aliases.includes(clean.toLowerCase())) return true;
    return false;
  });
  if (exact) return exact;

  // 2. Match on roman alias words
  const romanMatch = DOCS_CATALOG.find((d) =>
    d.romanAlias.split(/[\s/(),]+/).includes(clean.toLowerCase())
  );
  if (romanMatch) return romanMatch;

  return null;
}
