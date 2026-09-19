import { RecipeItem } from './types';

export const EXAMPLES: RecipeItem[] = [
  {
    id: 'hello-nepal',
    title: 'Hello Nepal',
    nepaliTitle: 'नमस्ते नेपाल',
    category: 'basics',
    description: 'A simple introductory program that displays text in Devanagari.',
    code: `// नमस्ते संसार — पहिलो नेपाली प्रोग्राम
भनौँ("नमस्ते नेपाल! 🇳🇵")।
भनौँ("नेपाली प्रोग्रामिङ भाषामा स्वागत छ।")।
`
  },
  {
    id: 'dates-and-age',
    title: 'Date Difference & Age Calculation',
    nepaliTitle: 'मिति र उमेर गणना',
    category: 'dates',
    description: 'Calculates date difference in days, computes whole years of age from birth date, and checks today\'s weekday.',
    code: `// मिति र उमेर सम्बन्धी उदाहरण
राखौँ आजको_मिति = आज()।
भनौँ("आजको मिति (वर्ष, महिना, दिन):", आजको_मिति)।
भनौँ("आजको बार:", हप्ताको_दिन(आजको_मिति))।

// दिनको फरक
राखौँ सुरु = "2026-01-01"।
राखौँ अन्त्य = "2026-09-19"।
भनौँ("२०२६ को सुरुदेखि अहिलेसम्म बितेका दिनहरू:", दिन_फरक(अन्त्य, सुरु))।

// उमेर गणना
राखौँ जन्म = "2000-05-14"।
भनौँ("जन्ममिति", जन्म, "भएको व्यक्तिको उमेर:", उमेर(जन्म), "वर्ष")।
`
  },
  {
    id: 'user-input',
    title: 'Interactive User Input',
    nepaliTitle: 'प्रयोगकर्ता इनपुट',
    category: 'input',
    description: 'Prompts user for input and responds dynamically.',
    code: `// प्रयोगकर्ताबाट इनपुट लिने कार्यक्रम
राखौँ नाम = इनपुट("तपाईंको शुभनाम के हो? ")।
राखौँ उमेर_संख्या = इनपुट("तपाईंको उमेर कति भयो? ")।

भनौँ("नमस्कार", नाम, "! तपाईं", उमेर_संख्या, "वर्षको हुनुभएछ।")।
`
  },
  {
    id: 'fibonacci-recursion',
    title: 'Fibonacci (Recursion & Loops)',
    nepaliTitle: 'फिबोनाची क्रम',
    category: 'math',
    description: 'Recursive computation of Fibonacci numbers.',
    code: `काम फिबो(न) {
  यदि न <= 1 {
    पठाउँ न।
  }
  पठाउँ फिबो(न - 1) + फिबो(न - 2)।
}

भनौँ("फिबोनाची श्रृंखला:")।
राखौँ i = 0।
भएसम्म i <= 10 {
  भनौँ("फिबो(" + i + ") =", फिबो(i))।
  i = i + 1।
}
`
  },
  {
    id: 'array-transform',
    title: 'Array Operations & Filtering',
    nepaliTitle: 'सूची विश्लेषण',
    category: 'arrays',
    description: 'Iterates through array, calculates sum, and finds maximum value.',
    code: `राखौँ अंकहरू = [12, 45, 7, 89, 23, 56]।
राखौँ कुल = 0।
राखौँ अधिकतम = अंकहरू[0]।
राखौँ i = 0।

भएसम्म i < लम्बाइ(अंकहरू) {
  कुल = कुल + अंकहरू[i]।
  यदि अंकहरू[i] > अधिकतम {
    अधिकतम = अंकहरू[i]।
  }
  i = i + 1।
}

भनौँ("अंकहरूको सूची:", अंकहरू)।
भनौँ("जम्मा योग:", कुल)।
भनौँ("सबैभन्दा ठूलो अंक:", अधिकतम)।
`
  },
  {
    id: 'sqlite-db',
    title: 'Database Queries (OS Mode)',
    nepaliTitle: 'डाटाबेस व्यवस्थापन',
    category: 'sqlite',
    description: 'Creates table and runs queries against SQLite database engine.',
    code: `// SQLite डाटाबेस उदाहरण (OS मोडमा चल्छ)
डाटाबेस_चलाउनुहोस्("विद्यार्थी.db", "CREATE TABLE IF NOT EXISTS विद्यार्थी (id INTEGER PRIMARY KEY, नाम TEXT, अंक INTEGER);")।
डाटाबेस_चलाउनुहोस्("विद्यार्थी.db", "INSERT INTO विद्यार्थी (नाम, अंक) VALUES ('आभास', 95);")।

राखौँ परिणाम = डाटाबेस_सोध्नुहोस्("विद्यार्थी.db", "SELECT * FROM विद्यार्थी;")।
भनौँ("डाटाबेस रेकर्ड:", परिणाम)।
`
  }
];
