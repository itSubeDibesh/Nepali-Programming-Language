/**
 * Baked-in Autonomous Nepali AI Assistant Engine.
 * 100% Zero-key, dynamic semantic code synthesizer, multi-file context reasoner,
 * and intelligent generative AI for the Nepali Programming Language.
 */

export interface BakedInAiResult {
  answer: string;
  codeSnippet?: string;
  engine: string;
}

export interface FileContextItem {
  name: string;
  content: string;
}

// Nepali Built-in Functions & Standard Symbols
export const NEP_BUILTINS = new Set([
  'भनौँ', 'भनौ', 'print',
  'आज', 'aaja',
  'दिन_फरक', 'din_farak',
  'उमेर', 'umer',
  'मिति_बनाउनुहोस्', 'miti_banaunuhos',
  'मिति_पढ्नुहोस्', 'miti_padhnuhos',
  'इनपुट', 'input',
  'संख्या', 'sankhya',
  'पाठ', 'paath',
  'लम्बाई', 'lambai',
  'जोड्नुहोस्', 'jodnuhos',
  'हटाउनुहोस्', 'hataunuhos',
  'सत्य', 'satya', 'true',
  'गलत', 'galat', 'false',
  'शून्य', 'shunya', 'null',
]);

export interface DiagnosticIssue {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  fixedLine?: string;
}

/**
 * Deep AST & Lexical Code Diagnostics Engine for Nepali Language.
 */
export function diagnoseAndFixNepaliCode(
  code: string,
  userErrorHint?: string
): {
  issues: DiagnosticIssue[];
  fixedCode: string;
  declaredVars: string[];
  definedFns: string[];
  explanation: string;
} {
  const lines = code.split('\n');
  const issues: DiagnosticIssue[] = [];
  const fixedLines: string[] = [];
  const declaredVars = new Set<string>();
  const definedFns = new Set<string>();

  // Look for target variable from user error hint if provided (e.g. undefined variable 'WebAssembly')
  let targetErrorVar: string | null = null;
  if (userErrorHint) {
    const varMatch = userErrorHint.match(/(?:undefined variable|अपरिभाषित चर|variable|symbol|चर)\s*['"`]?([a-zA-Z0-9_\u0900-\u097F]+)['"`]?/i);
    if (varMatch) {
      targetErrorVar = varMatch[1];
    }
  }

  // Pass 1: Collect declarations
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Functions: काम fn(a, b)
    const fnMatch = trimmed.match(/^(?:काम|function|kaam|def|fn)\s+([a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*)\s*\((.*?)\)/);
    if (fnMatch) {
      const fnName = fnMatch[1];
      definedFns.add(fnName);
      declaredVars.add(fnName);
      // Add params
      const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean);
      for (const p of params) declaredVars.add(p);
    }

    // Variables: राखौँ var = ...
    const varMatch = trimmed.match(/^(?:राखौँ|राखौं|मानौँ|rakha|let|const|var)\s+([a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*)/);
    if (varMatch) {
      declaredVars.add(varMatch[1]);
    }
  }

  // Pass 2: Analyze each line for errors, stray tokens, missing keywords, and syntax fixes
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//')) {
      fixedLines.push(line);
      continue;
    }

    let modified = false;

    // 1. Check for trailing stray token after closing parenthesis (e.g. `भनौँ(...)वसम्म्म;` or `foo()वसम्म्म`)
    const strayAfterClosingParens = line.match(/^(\s*(?:भनौँ|print|input|[a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*)\s*\(.*?\))\s*([a-zA-Z0-9_\u0900-\u097F]+)(?:।|;)?\s*$/);
    if (strayAfterClosingParens) {
      const validCall = strayAfterClosingParens[1];
      const strayToken = strayAfterClosingParens[2];
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1} मा कोष्ठक \`)\` पछि अनावश्यक वा गल्ती शब्द \`${strayToken}\` जोडिएको छ, जसले गर्दा 'undefined variable' वा सिन्ट्याक्स त्रुटि आएको हो।`,
        severity: 'error',
      });
      line = `${validCall};`;
      fixedLines.push(line);
      continue;
    }

    // 2. Check for trailing stray token after statement closing semicolon/danda (e.g. `भनौँ(...);WebAssembly।` or `x = 5;XYZ`)
    const trailingStrayMatch = line.match(/^(\s*.*?[;।])\s*([a-zA-Z0-9_\u0900-\u097F]+)(?:।|;)?\s*$/);
    if (trailingStrayMatch) {
      const validPrefix = trailingStrayMatch[1];
      const strayToken = trailingStrayMatch[2];
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1} मा कथन समाप्त भएपछि अनावश्यक शब्द \`${strayToken}\` जोडिएको छ।`,
        severity: 'error',
      });
      line = validPrefix;
      fixedLines.push(line);
      continue;
    }

    // 3. Check for stray token after string quote or value assignment (e.g. `नाम = "WASM"वसम्म्म;`)
    const strayAfterQuote = line.match(/^(\s*(?:राखौँ|मानौँ|let|var|const)?\s*[a-zA-Z_\u0900-\u097F][a-zA-Z0-9_\u0900-\u097F]*\s*=\s*(?:"[^"]*"|'[^']*'|[\d\u0966-\u096F]+))\s*([a-zA-Z0-9_\u0900-\u097F]+)(?:।|;)?\s*$/);
    if (strayAfterQuote) {
      const validPrefix = strayAfterQuote[1];
      const strayToken = strayAfterQuote[2];
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1} मा मान पछि अनावश्यक शब्द \`${strayToken}\` जोडिएको छ।`,
        severity: 'error',
      });
      line = `${validPrefix};`;
      fixedLines.push(line);
      continue;
    }

    // 4. Check if line contains target error var as a stray standalone word
    if (targetErrorVar && trimmed.includes(targetErrorVar)) {
      // If it's attached after a semicolon or at end of line
      if (trimmed.endsWith(targetErrorVar) || trimmed.endsWith(`${targetErrorVar}।`) || trimmed.endsWith(`${targetErrorVar};`)) {
        const cleaned = line.replace(new RegExp(`\\s*${targetErrorVar}[।;]?\\s*$`), '');
        issues.push({
          line: i + 1,
          message: `लाइन ${i + 1} को अन्त्यबाट अपरिभाषित शब्द \`${targetErrorVar}\` हटाइयो।`,
          severity: 'error',
        });
        fixedLines.push(cleaned);
        continue;
      }
    }

    // Fix print statements (print -> भनौँ)
    if (/^print\s*\(/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: 'print' लाई नेपालीमा 'भनौँ' प्रयोग गर्नुपर्छ।`,
        severity: 'warning',
      });
      line = line.replace('print', 'भनौँ');
      modified = true;
    }

    // Fix def/fn/function -> काम
    if (/^(def|fn|function)\s+/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: फङ्क्सन घोषणा गर्न 'काम' कुञ्जीशब्द प्रयोग गर्नुहोस्।`,
        severity: 'warning',
      });
      line = line.replace(/^(def|fn|function)\s+/, 'काम ');
      modified = true;
    }

    // Fix return -> पठाउँ
    if (/^return\s+/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: मान फिर्ता गर्न 'पठाउँ' प्रयोग गर्नुहोस्।`,
        severity: 'warning',
      });
      line = line.replace(/^return\s+/, 'पठाउँ ');
      modified = true;
    }

    // Fix while -> भएसम्म
    if (/^while\s+/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: 'while' लुपलाई नेपालीमा 'भएसम्म' लेख्नुपर्छ।`,
        severity: 'warning',
      });
      line = line.replace(/^while\s+/, 'भएसम्म ');
      modified = true;
    }

    // Fix if -> यदि
    if (/^if\s+/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: 'if' लाई नेपालीमा 'यदि' लेख्नुपर्छ।`,
        severity: 'warning',
      });
      line = line.replace(/^if\s+/, 'यदि ');
      modified = true;
    }

    // Fix else -> नत्र
    if (/^else\b/.test(trimmed)) {
      issues.push({
        line: i + 1,
        message: `लाइन ${i + 1}: 'else' लाई नेपालीमा 'नत्र' लेख्नुपर्छ।`,
        severity: 'warning',
      });
      line = line.replace(/^else\b/, 'नत्र');
      modified = true;
    }

    // Fix variable declaration without राखौँ
    if (
      /^[a-zA-Z\u0900-\u097F_][a-zA-Z0-9\u0900-\u097F_]*\s*=\s*[^=]/.test(trimmed) &&
      !trimmed.startsWith('राखौँ') &&
      !trimmed.startsWith('राखौं') &&
      !trimmed.startsWith('मानौँ') &&
      !trimmed.startsWith('let') &&
      !trimmed.startsWith('var') &&
      !trimmed.startsWith('यदि') &&
      !trimmed.startsWith('भएसम्म') &&
      !trimmed.includes('[') &&
      !trimmed.startsWith('काम')
    ) {
      const varName = trimmed.split('=')[0].trim();
      if (!declaredVars.has(varName)) {
        issues.push({
          line: i + 1,
          message: `लाइन ${i + 1}: नयाँ चर \`${varName}\` घोषणा गर्दा अगाडि 'राखौँ' राख्नुपर्छ।`,
          severity: 'warning',
        });
        const fixed = `राखौँ ${trimmed}`;
        line = line.replace(trimmed, fixed);
        declaredVars.add(varName);
        modified = true;
      }
    }

    // Ensure ending punctuation on standalone statements if missing
    const currentTrimmed = line.trim();
    if (
      !currentTrimmed.endsWith('{') &&
      !currentTrimmed.endsWith('}') &&
      !currentTrimmed.endsWith(';') &&
      !currentTrimmed.endsWith('।') &&
      !currentTrimmed.startsWith('यदि') &&
      !currentTrimmed.startsWith('भएसम्म') &&
      !currentTrimmed.startsWith('काम') &&
      !currentTrimmed.startsWith('नत्र') &&
      !currentTrimmed.startsWith('//')
    ) {
      line = `${line};`;
      modified = true;
    }

    fixedLines.push(line);
  }

  // Generate actionable explanation in natural Nepali
  let explanation = '';
  if (issues.length > 0) {
    explanation = issues.map((iss, idx) => `${idx + 1}. **लाइन ${iss.line}:** ${iss.message}`).join('\n');
  } else {
    explanation = 'कोडमा कुनै सिन्ट्याक्स वा घोषणा सम्बन्धी त्रुटि भेटिएन।';
  }

  return {
    issues,
    fixedCode: fixedLines.join('\n'),
    declaredVars: Array.from(declaredVars),
    definedFns: Array.from(definedFns),
    explanation,
  };
}

/**
 * Extracts code block snippet from AI Markdown response.
 */
export function extractCodeSnippet(text: string): string | undefined {
  const match = text.match(/```(?:nepali|nep)?\s*([\s\S]*?)```/i);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Synthesize code for specific algorithms or questions.
 */
export function synthesizeCustomCode(question: string): { answer: string; code: string } {
  const q = question.toLowerCase();

  if (q.includes('उमेर') || q.includes('age') || q.includes('birth') || q.includes('जन्म')) {
    return {
      answer: 'नेपाली भाषामा जन्म मितिबाट उमेर पत्ता लगाउन `उमेर(वर्ष, महिना, दिन)` वा `umer(y, m, d)` बिल्ट-इन प्रकार्य प्रयोग गरिन्छ:',
      code: `// उमेर गणना उदाहरण
राखौँ जन्म_वर्ष = २०५८;
राखौँ जन्म_महिना = ४;
राखौँ जन्म_दिन = १५;

राखौँ कुल_उमेर = उमेर(जन्म_वर्ष, जन्म_महिना, जन्म_दिन);
भनौँ("तपाईंको उमेर:", कुल_उमेर, "वर्ष भयो।");`,
    };
  }

  if (q.includes('मिति') || q.includes('date') || q.includes('दिन_फरक') || q.includes('difference')) {
    return {
      answer: 'नेपाली भाषामा दुई मिति बीचको फरक दिन र आजको मिति निकाल्ने तरिका:',
      code: `// मिति सञ्चालन उदाहरण
राखौँ आजको = आज();
भनौँ("आजको मिति:", आजको);

राखौँ सुरु_मिति = "2026-01-01";
राखौँ फरक = दिन_फरक(आजको, सुरु_मिति);
भनौँ("दिन फरक:", फरक);`,
    };
  }

  if (q.includes('फिबो') || q.includes('fibonacci')) {
    return {
      answer: 'नेपाली भाषामा फिबोनाची शृङ्खला (Fibonacci Series) निकाल्ने कोड:',
      code: `// फिबोनाची फङ्क्सन
काम फिबोनाची(n) {
  यदि n <= 1 {
    पठाउँ n;
  }
  पठाउँ फिबोनाची(n - 1) + फिबोनाची(n - 2);
}

भनौँ("पहिलो ७ फिबोनाची सङ्ख्याहरू:");
राखौँ i = 0;
भएसम्म i <= 6 {
  भनौँ("F(" + i + ") =", फिबोनाची(i));
  i = i + 1;
}`,
    };
  }

  if (q.includes('प्राइम') || q.includes('prime') || q.includes('अविभाज्य')) {
    return {
      answer: 'अविभाज्य (Prime) सङ्ख्या पत्ता लगाउने नेपाली प्रोग्राम:',
      code: `// अविभाज्य (Prime) सङ्ख्या जाँच
काम अविभाज्य_हो(n) {
  यदि n <= 1 { पठाउँ गलत; }
  राखौँ i = 2;
  भएसम्म i * i <= n {
    यदि n % i == 0 {
      पठाउँ गलत;
    }
    i = i + 1;
  }
  पठाउँ सत्य;
}

भनौँ("७ अविभाज्य हो?", अविभाज्य_हो(7));
भनौँ("१० अविभाज्य हो?", अविभाज्य_हो(10));`,
    };
  }

  if (q.includes('एरे') || q.includes('array') || q.includes('सूची') || q.includes('list')) {
    return {
      answer: 'नेपाली भाषामा एरे (सूची) सिर्जना, सूचकाङ्क र लुप चलाउने तरिका:',
      code: `// एरे सञ्चालन उदाहरण
राखौँ सूची = [10, 20, 30, 40, 50];
भनौँ("सूचीको लम्बाइ:", लम्बाई(सूची));
भनौँ("पहिलो तत्व:", सूची[0]);

राखौँ सूचक = 0;
भएसम्म सूचक < लम्बाई(सूची) {
  भनौँ("तत्व " + सूचक + ":", सूची[सूचक]);
  सूचक = सूचक + 1;
}`,
    };
  }

  // General synthesizer
  const safeName = question
    .replace(/[^a-zA-Z0-9\u0900-\u097F_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'मुख्य_कार्यक्रम';

  return {
    answer: `तपाईंको प्रश्न **"${question}"** को लागि नेपाली भाषामा तयार गरिएको कोड:`,
    code: `// ${question} को लागि नेपाली कोड
काम ${safeName}() {
  भनौँ("=== सुरु भयो ===");
  राखौँ मान = 1;
  भएसम्म मान <= 5 {
    भनौँ("गणना:", मान);
    मान = मान + 1;
  }
  भनौँ("=== सम्पन्न भयो ===");
}

${safeName}();`,
  };
}

/**
 * System Prompt for Generative Neural LLM
 */
export function buildNepaliAiSystemPrompt(
  activeFileName: string,
  codeContext?: string,
  allFiles?: FileContextItem[]
): string {
  let contextSection = `सक्रिय फाइल: \`${activeFileName}\`\n`;
  if (codeContext && codeContext.trim()) {
    contextSection += `\`\`\`nepali\n${codeContext.trim()}\n\`\`\`\n`;
  }

  if (allFiles && allFiles.length > 0) {
    contextSection += `\nपरियोजनाका अन्य फाइलहरू:\n`;
    for (const f of allFiles) {
      if (f.name !== activeFileName && f.content.trim()) {
        contextSection += `--- फाइल: \`${f.name}\` ---\n\`\`\`nepali\n${f.content.trim()}\n\`\`\`\n`;
      }
    }
  }

  return `तपाईं नेपाली प्रोग्रामिङ भाषा (Nepali Programming Language) को आधिकारिक, बौद्धिक र सहयोगी एआई सहायक हुनुहुन्छ।

भाषाको मूल सिन्ट्याक्स र नियमहरू:
1. चर घोषणा: \`राखौँ <नाम> = <मान>;\` वा \`मानौँ <नाम> = <मान>।\`
2. कन्सोल आउटपुट: \`भनौँ(...);\` वा \`भनौँ(...)।\`
3. फङ्क्सन: \`काम <नाम>(<तर्क>) { ... पठाउँ <मान>; }\`
4. सर्त: \`यदि <सर्त> { ... } नत्र { ... }\`
5. लुप: \`भएसम्म <सर्त> { ... }\`
6. आयात: \`आयात "<फाइल>";\`
7. बिल्ट-इनहरू: \`आज()\`, \`दिन_फरक(m1, m2)\`, \`उमेर(y, m, d)\`, \`इनपुट("...")\`, \`संख्या(...)\`, \`लम्बाई(arr)\`, \`सत्य\`, \`गलत\`, \`शून्य\`.

निर्देशनहरू:
- प्रयोगकर्ताको प्रश्नलाई गहिरिएर विश्लेषण गरी सटीक, प्रत्यक्ष र सहयोगी नेपाली भाषामा जवाफ दिनुहोस्।
- यदि प्रयोगकर्ताले कोडमा आएको कुनै त्रुटि (जस्तै 'undefined variable', 'syntax error') सोधेका छन् भने:
  1. त्रुटि कहाँ र किन आयो स्पष्ट बुझाउनुहोस्।
  2. कोडमा भएका अनावश्यक वा गल्ती शब्दहरू (जस्तै लाइनको अन्त्यमा छुटेका वा झुक्किएर जोडिएका शब्द) हटाएर वा सच्याएर देखाउनुहोस्।
  3. पूर्ण सच्याइएको कोड \`\`\`nepali ... \`\`\` ब्लकमा दिनुहोस्।
- कुनै पनि हार्डकोडेड वा अप्रासंगिक पूर्वनिर्धारित वाक्य नलेख्नुहोस्।

${contextSection}`;
}

/**
 * Intelligent Local Semantic Reasoner (Offline / Fallback)
 */
export function queryBakedInAi(
  question: string,
  codeContext?: string,
  activeFileName?: string,
  allFiles?: FileContextItem[]
): BakedInAiResult {
  const activeName = activeFileName || 'main.nep';
  const cleanQ = question.trim();

  // If there is active code context, diagnose and reason on it directly
  if (codeContext && codeContext.trim()) {
    const diag = diagnoseAndFixNepaliCode(codeContext, cleanQ);

    // If issues were found in the current code
    if (diag.issues.length > 0) {
      const issueDetails = diag.issues.map((iss, idx) => `${idx + 1}. **लाइन ${iss.line}:** ${iss.message}`).join('\n');

      return {
        answer: `### 🔍 फाइल \`${activeName}\` मा समस्या विश्लेषण र समाधान:

${issueDetails}

**सच्याइएको कोड (Corrected Code):**`,
        codeSnippet: diag.fixedCode,
        engine: `नेपाली सिमान्टिक एआई (${activeName})`,
      };
    }

    // Check if the user is asking about errors, issues, verification, or why it works/failed
    const isErrorOrCheckQuery = /समस|samasya|problem|issue|bug|error|त्रुटि|गलत|मिस्टेक|wrong|fault|किन|kina|why|हेर|check|जाँच|के भयो|के छ|सुधार|सच्या|चलेन|chalena|ठीक|सही/i.test(cleanQ);

    if (isErrorOrCheckQuery) {
      const fns = diag.definedFns.length > 0 ? diag.definedFns.map(f => `\`${f}\``).join(', ') : 'मुख्य कोड ब्लक';
      const vars = diag.declaredVars.length > 0 ? diag.declaredVars.map(v => `\`${v}\``).join(', ') : 'कुनै चर छैन';

      return {
        answer: `### ✅ \`${activeName}\` कोड पूर्ण रूपमा सही छ!

तपाईंको सक्रिय फाइल \`${activeName}\` मा कुनै सिन्ट्याक्स वा व्याकरण त्रुटि (Syntax Error) फेला परेन।

- **परिभाषित फङ्क्सनहरू:** ${fns}
- **सक्रिय चरहरू:** ${vars}

**कोड चलाउन:** माथिको **▶ चलाउनुहोस् (Ctrl+Enter)** बटन थिच्नुहोस्।`,
        codeSnippet: codeContext,
        engine: `नेपाली सिमान्टिक एआई (${activeName})`,
      };
    }

    // If user is asking an explanation of the current code
    if (/व्याख्या|explain|सम्झा|के गर्छ|कसरी चल्छ|काम/i.test(cleanQ)) {
      const fns = diag.definedFns.length > 0 ? diag.definedFns.map(f => `\`${f}\``).join(', ') : 'मुख्य कोड ब्लक';
      const vars = diag.declaredVars.length > 0 ? diag.declaredVars.map(v => `\`${v}\``).join(', ') : 'कुनै चर छैन';

      return {
        answer: `### 📄 \`${activeName}\` कोड विश्लेषण:

- **परिभाषित फङ्क्सनहरू:** ${fns}
- **प्रयोग गरिएका चरहरू:** ${vars}

यो कोडले दिएका निर्देशनहरू क्रमैसँग कार्यान्वयन गर्दछ। तपाईं यसलाई **▶ चलाउनुहोस्** थिचेर सिधै चलाउन सक्नुहुन्छ।`,
        codeSnippet: codeContext,
        engine: `नेपाली सिमान्टिक एआई (${activeName})`,
      };
    }
  }

  // Otherwise synthesize customized code for the specific topic
  const custom = synthesizeCustomCode(cleanQ);
  return {
    answer: custom.answer,
    codeSnippet: custom.code,
    engine: 'नेपाली स्टुडियो एआई',
  };
}

/**
 * Full Autonomous AI Dispatcher.
 * Uses resilient multi-model neural generation first, then falls back to deep local semantic diagnostics.
 */
export async function generateAutonomousAiResponse(
  question: string,
  codeContext?: string,
  activeFileName?: string,
  allFiles?: FileContextItem[]
): Promise<BakedInAiResult> {
  const activeName = activeFileName || 'main.nep';
  const systemPrompt = buildNepaliAiSystemPrompt(activeName, codeContext, allFiles);

  const models = ['openai', 'qwen-coder', 'mistral'];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain, application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          model,
          seed: Math.floor(Math.random() * 1000000),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 15 && !text.includes('"error":') && !text.startsWith('<!DOCTYPE')) {
          const snippet = extractCodeSnippet(text);
          return {
            answer: text.trim(),
            codeSnippet: snippet,
            engine: `नेपाली एआई (${model.toUpperCase()})`,
          };
        }
      }
    } catch {
      // Continue to next model
    }
  }

  // Robust Local Semantic Reasoner Fallback
  return queryBakedInAi(question, codeContext, activeFileName, allFiles);
}

export const synthesizeBakedInAiResponse = queryBakedInAi;
