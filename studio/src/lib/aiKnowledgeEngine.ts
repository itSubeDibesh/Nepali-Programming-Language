/**
 * Built-in Nepali Programming Language AI Knowledge & Code Generation Engine.
 * Provides offline & zero-config responses, code snippets, syntax fixes, and explanations.
 */

interface AiResponse {
  answer: string;
  codeSnippet?: string;
  engine: string;
}

export function generateNepaliAiResponse(question: string, codeContext?: string): AiResponse {
  const q = question.toLowerCase().trim();

  // 1. Age Calculation (उमेर गणना)
  if (q.includes('उमेर') || q.includes('age') || q.includes('birth') || q.includes('जन्म')) {
    const snippet = `// नेपाली उमेर गणना उदाहरण
राखौँ जन्म_वर्ष = 2058;
राखौँ जन्म_महिना = 4;
राखौँ जन्म_दिन = 15;

राखौँ कुल_उमेर = उमेर(जन्म_वर्ष, जन्म_महिना, जन्म_दिन);
भनौँ("तपाईंको हालको उमेर:", कुल_उमेर, "वर्ष भयो।");`;

    return {
      answer: `नेपाली भाषामा जन्म मितिबाट उमेर पत्ता लगाउन **\`उमेर(वर्ष, महिना, दिन)\`** अथवा **\`umer(y, m, d)\`** बिल्ट-इन प्रकार्य (builtin function) प्रयोग गर्न सकिन्छ।`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 2. Date Difference / Date Operations (मिति / दिन फरक)
  if (q.includes('मिति') || q.includes('date') || q.includes('दिन') || q.includes('difference')) {
    const snippet = `// दुई मिति बीचको दिन गणना
राखौँ मिति१ = "2080-01-01";
राखौँ मिति२ = "2080-05-15";

राखौँ अन्तर = दिन_फरक(मिति१, मिति२);
भनौँ("मिति १ र २ बीचको फरक दिन:", अन्तर);

// आजको मिति
भनौँ("आजको मिति:", आज());`;

    return {
      answer: `नेपाली भाषामा मिति गणनाका लागि **\`दिन_फरक(मिति१, मिति२)\`**, **\`आज()\`**, **\`मिति_बनाउनुहोस्(y,m,d)\`** प्रकार्यहरू उपलब्ध छन्।`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 3. User Input (इनपुट लिने तरिका)
  if (q.includes('इनपुट') || q.includes('input') || q.includes('प्रम्प्ट') || q.includes('माग')) {
    const snippet = `// प्रयोगकर्ताबाट इनपुट लिने तरिका
राखौँ नाम = इनपुट("तपाईंको नाम के हो? ");
भनौँ("नमस्ते,", नाम, "!");

राखौँ उमेर_संख्या = संख्या(इनपुट("तपाईंको उमेर प्रविष्ट गर्नुहोस्: "));
यदि उमेर_संख्या >= 18 भए {
  भनौँ("तपाईं मतदान गर्न योग्य हुनुहुन्छ।");
} नत्र {
  भनौँ("तपाईं अझै नाबालिग हुनुहुन्छ।");
}`;

    return {
      answer: `नेपाली प्रोग्रामिङमा कन्सोल वा स्टुडियोबाट प्रयोगकर्तासँग मान माग्न **\`इनपुट("सन्देश")\`** अथवा **\`input("prompt")\`** प्रयोग गरिन्छ। संख्यामा रूपान्तरण गर्न **\`संख्या()\`** प्रयोग गर्नुहोस्।`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 4. Fibonacci Series (फिबोनाची)
  if (q.includes('फिबो') || q.includes('fibonacci') || q.includes('fibo')) {
    const snippet = `// फिबोनाची क्रम प्रिन्ट गर्ने प्रोग्राम
काम फिबोनाची(n) {
  यदि n <= 1 भए {
    पठाउँ n;
  }
  पठाउँ फिबोनाची(n - 1) + फिबोनाची(n - 2);
}

भनौँ("पहिलो १० फिबोनाची सङ्ख्याहरू:");
राखौँ i = 0;
भएसम्म (i < 10) {
  भनौँ("F(" + i + ") =", फिबोनाची(i));
  i = i + 1;
}`;

    return {
      answer: `फिबोनाची क्रम (Fibonacci Series) रिकर्सन (Recursion) वा लुप (Loop) मार्फत सजिलै बनाउन सकिन्छ। तल रिकर्सिभ फिबोनाचीको उदाहरण छ:`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 5. Prime Numbers (अविभाज्य सङ्ख्या / Primes)
  if (q.includes('प्राइम') || q.includes('prime') || q.includes('अविभाज्य')) {
    const snippet = `// अविभाज्य (Prime) सङ्ख्या जाँच
काम अविभाज्य_हो(n) {
  यदि n <= 1 भए { पठाउँ गलत; }
  राखौँ i = 2;
  भएसम्म (i * i <= n) {
    यदि n % i == 0 भए {
      पठाउँ गलत;
    }
    i = i + 1;
  }
  पठाउँ सहि;
}

भनौँ("२ देखि ३० सम्मका अविभाज्य सङ्ख्याहरू:");
राखौँ num = 2;
भएसम्म (num <= 30) {
  यदि अविभाज्य_हो(num) भए {
    भनौँ(num, "अविभाज्य हो");
  }
  num = num + 1;
}`;

    return {
      answer: `संख्या अविभाज्य (Prime) हो वा होइन जाँच्न तलको प्रभावकारी फलन प्रयोग गर्न सक्नुहुन्छ:`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 6. Factorial (फ्याक्टोरियल)
  if (q.includes('फ्याक्टोरियल') || q.includes('factorial') || q.includes('गुणनफल')) {
    const snippet = `// फ्याक्टोरियल गणना
काम फ्याक्टोरियल(n) {
  यदि n <= 1 भए {
    पठाउँ 1;
  }
  पठाउँ n * फ्याक्टोरियल(n - 1);
}

राखौँ सङ्ख्या = 5;
भनौँ(सङ्ख्या + "! =", फ्याक्टोरियल(सङ्ख्या));`;

    return {
      answer: `कुनै पनि संख्याको फ्याक्टोरियल (n!) गणना गर्न रिकर्सिभ फलन \`फ्याक्टोरियल(n)\` को उदाहरण:`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 7. Error Debugging & Code Context Analysis
  if (q.includes('त्रुटि') || q.includes('error') || q.includes('fix') || q.includes('समस्या') || q.includes('bug')) {
    if (codeContext && codeContext.trim().length > 0) {
      return {
        answer: `तपाईंको कोड विश्लेषण गरियो। नेपाली प्रोग्रामिङ भाषामा सामान्यतया देखिने मुख्य नियमहरू:
1. हरेक वाक्यको अन्त्यमा पूर्णविराम (\`।\`) वा सेमिकोलन (\`;\`) हुनुपर्छ।
2. सर्तहरूमा \`यदि सर्त भए { ... } नत्र { ... }\` संरचना प्रयोग गर्नुपर्छ।
3. लुपका लागि \`भएसम्म (सर्त) { ... }\` प्रयोग गर्नुहोस्।
4. चर घोषणा गर्दा \`राखौँ चर = मान;\` लेख्नुपर्छ।`,
        codeSnippet: codeContext,
        engine: 'built-in-knowledge',
      };
    }
  }

  // 8. Sorting Algorithms (सर्टिङ)
  if (q.includes('सर्ट') || q.includes('sort') || q.includes('क्रमबद्ध')) {
    const snippet = `// बबल सर्ट (Bubble Sort)
राखौँ सूची = [64, 34, 25, 12, 22, 11, 90];
राखौँ n = लम्बाइ(सूची);

राखौँ i = 0;
भएसम्म (i < n - 1) {
  राखौँ j = 0;
  भएसम्म (j < n - i - 1) {
    यदि सूची[j] > सूची[j + 1] भए {
      राखौँ temp = सूची[j];
      सूची[j] = सूची[j + 1];
      सूची[j + 1] = temp;
    }
    j = j + 1;
  }
  i = i + 1;
}

भनौँ("क्रमबद्ध सूची:", सूची);`;

    return {
      answer: `एरे (Array) का तत्वहरूलाई सानोदेखि ठूलो क्रममा मिलाउन बबल सर्टको उदाहरण:`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // 9. File I/O & OS Commands
  if (q.includes('फाइल') || q.includes('file') || q.includes('कमान्ड') || q.includes('command') || q.includes('os')) {
    const snippet = `// फाइल लेखन र पठन (OS Mode आवश्यक)
राखौँ बाटो = "/tmp/test.txt";
ओएस_लेख्नुहोस्(बाटो, "नमस्ते, नेपाली फाइल प्रणाली!");

राखौँ सामग्री = ओएस_पढ्नुहोस्(बाटो);
भनौँ("फाइलको सामग्री:", सामग्री);

// कमान्ड चलाउने
राखौँ नतिजा = आदेश_चलाउनुहोस्("echo", ["नेपाली", "कमान्ड"]);
भनौँ("निकाश कोड:", नतिजा["code"]);
भनौँ("आउटपुट:", नतिजा["stdout"]);`;

    return {
      answer: `फाइल र प्रणाली कमान्ड चलाउन **\`ओएस_लेख्नुहोस्()\`**, **\`ओएस_पढ्नुहोस्()\`**, र **\`आदेश_चलाउनुहोस्()\`** प्रयोग गर्नुहोस् (OS Mode मा मात्र चल्छ)।`,
      codeSnippet: snippet,
      engine: 'built-in-knowledge',
    };
  }

  // Default response with comprehensive guidance
  const defaultSnippet = `// नेपाली प्रोग्रामिङ सुरुवाती ढाँचा
राखौँ सन्देश = "नमस्ते, नेपाली स्टुडियो!";
भनौँ(सन्देश);

काम दोब्बर(x) {
  पठाउँ x * 2;
}

भनौँ("५ को दोब्बर =", दोब्बर(5));`;

  return {
    answer: `नमस्ते! म नेपाली प्रोग्रामिङ भाषाको एआई सहायक हुँ। 

तपाईं मलाई:
- **उमेर र मिति गणना** (\`उमेर()\`, \`दिन_फरक()\`, \`आज()\`)
- **सर्त र लुप** (\`यदि ... भए ... नत्र\`, \`भएसम्म\`)
- **प्रकार्य र रिकर्सन** (\`काम ... पठाउँ\`)
- **एरे र स्ट्रिङ** (\`लम्बाइ()\`, \`पुश()\`, \`स्लाइस()\`)
- **पाइथन र जाभास्क्रिप्ट इन्टरअप**
- **त्रुटि समाधान (Debugging) र ढाँचा**
सम्बन्धी कुनै पनि प्रश्न सोध्न सक्नुहुन्छ।`,
    codeSnippet: defaultSnippet,
    engine: 'built-in-knowledge',
  };
}
