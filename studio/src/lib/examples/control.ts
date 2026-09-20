import { RecipeItem } from '../types';

export const CONTROL_EXAMPLES: RecipeItem[] = [
  {
    id: 'if-else-conditions',
    title: 'Conditional Branching',
    nepaliTitle: 'सर्त र निर्णय (यदि / नभए / अन्यथा)',
    category: 'control',
    description: 'यदि, नभए, र अन्यथा प्रयोग गरी सर्त अनुसार निर्णय लिने तरिका।',
    code: `// नेपालीमा सर्त परीक्षण (If-Else conditions)
राखौँ अङ्क = ७८।

यदि अङ्क >= ९० {
    भनौँ("नतिजा: विशिष्ट श्रेणी (Distinction)");
} नभए अङ्क >= ६० {
    भनौँ("नतिजा: प्रथम श्रेणी (First Division)");
} नभए अङ्क >= ४० {
    भनौँ("नतिजा: उत्तीर्ण (Pass)");
} अन्यथा {
    भनौँ("नतिजा: अनुत्तीर्ण (Fail)");
}
`,
  },
  {
    id: 'while-loop-counter',
    title: 'While Loop Counter',
    nepaliTitle: 'भएसम्म लुप (While Loop)',
    category: 'control',
    description: 'सर्त पूरा भएसम्म बारम्बार कोड चलाउने लुप।',
    code: `// भएसम्म लुप (While loop) - १ देखि १० सम्म
राखौँ गन्ती = १।

भनौँ("सुरुवात भयो...");
भएसम्म गन्ती <= १० {
    भनौँ("गन्ती सङ्ख्या:", गन्ती)।
    गन्ती = गन्ती + १।
}
भनौँ("लुप सम्पन्न भयो!");
`,
  },
  {
    id: 'multiplication-table',
    title: 'Multiplication Table',
    nepaliTitle: 'गुणन तालिका (Multiplication Pahada)',
    category: 'control',
    description: 'कुनै पनि अङ्कको पहाडा (Multiplication Table) तयार गर्ने लुप।',
    code: `// ७ को पहाडा (Table of 7)
राखौँ सङ्ख्या = ७।
राखौँ सूचकांक = १।

भनौँ("--- " + सङ्ख्या + " को गुणन तालिका ---");
भएसम्म सूचकांक <= १० {
    राखौँ गुणनफल = सङ्ख्या * सूचकांक।
    भनौँ(सङ्ख्या, "×", सूचकांक, "=", गुणनफल)।
    सूचकांक = सूचकांक + १।
}
`,
  },
  {
    id: 'even-odd-checker',
    title: 'Even or Odd Checker',
    nepaliTitle: 'जोड/बिजोड पहिचान (Even/Odd Checker)',
    category: 'control',
    description: '१ देखि २० सम्मका सङ्ख्या जोड हुन् कि बिजोर छुट्याउने।',
    code: `// जोड र बिजोर सङ्ख्या छुट्याउने लुप
राखौँ सङ्ख्या = १।

भएसम्म सङ्ख्या <= १५ {
    यदि सङ्ख्या % २ == ० {
        भनौँ(सङ्ख्या, "→ जोड (Even)");
    } अन्यथा {
        भनौँ(सङ्ख्या, "→ बिजोर (Odd)");
    }
    सङ्ख्या = सङ्ख्या + १।
}
`,
  },
  {
    id: 'prime-number-finder',
    title: 'Prime Number Checker',
    nepaliTitle: 'अभाज्य सङ्ख्या पहिचान (Prime Numbers)',
    category: 'control',
    description: 'कुनै सङ्ख्या अभाज्य (Prime) हो कि होइन गणितीय रूपमा जाँच गर्ने।',
    code: `// अभाज्य (Prime) सङ्ख्या जाँच
काम अभाज्य_जाँच(n) {
    यदि n <= १ {
        फर्काउनुहोस् गलत।
    }
    राखौँ d = २।
    भएसम्म d * d <= n {
        यदि n % d == ० {
            फर्काउनुहोस् गलत।
        }
        d = d + १।
    }
    फर्काउनुहोस् सहि।
}

राखौँ जाँच_गरिने = [२, ३, ४, १७, २१, २९, ३३, ९७]।
राखौँ i = ०।
भएसम्म i < लम्बाइ(जाँच_गरिने) {
    राखौँ मान = जाँच_गरिने[i]।
    यदि अभाज्य_जाँच(मान) {
        भनौँ(मान, "अभाज्य सङ्ख्या (Prime) हो।");
    } अन्यथा {
        भनौँ(मान, "संयुक्त सङ्ख्या (Composite) हो।");
    }
    i = i + १।
}
`,
  },
];
