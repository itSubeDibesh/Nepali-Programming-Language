// Bilingual UI text dictionary (Nepali Devanagari vs English / Romanized)

export interface I18nDictionary {
  navbar: {
    title: string;
    run: string;
    running: string;
    modeOs: string;
    modeWasm: string;
    modeSandbox: string;
    translitNepali: string;
    translitEnglish: string;
    aiAssistant: string;
    terminal: string;
    share: string;
  };
  activityBar: {
    files: string;
    examples: string;
    docs: string;
    ai: string;
    terminal: string;
    run: string;
  };
  sidebar: {
    filesTitle: string;
    examplesTitle: string;
    docsTitle: string;
    newFile: string;
    resetFiles: string;
    autoSaveEnabled: string;
    autoSaveDesc: string;
    searchExamples: string;
    categories: string;
    examplesCount: (count: number) => string;
    catAll: string;
    catBasics: string;
    catControl: string;
    catFunctions: string;
    catData: string;
    catDates: string;
    catSystem: string;
    catInterop: string;
    preview: string;
    hidePreview: string;
    load: string;
    searchDocs: string;
    insertSnippet: string;
  };
  editor: {
    closeTab: string;
    closeOthers: string;
    renameTab: string;
    copyName: string;
    downloadFile: string;
    deleteFile: string;
    unsavedChanges: string;
    formatCode: string;
    formatted: string;
    copied: string;
    copyCode: string;
    download: string;
    askAi: string;
    statusNepali: string;
    statusEnglish: string;
    statusSaved: string;
    statusUnsaved: string;
    linesLabel: (line: number, col: number) => string;
    charsLabel: (chars: number) => string;
  };
  terminal: {
    title: string;
    clear: string;
    running: string;
    emptyHint: string;
    success: (ms: number) => string;
    error: (ms: number) => string;
  };
  ai: {
    title: string;
    subtitle: string;
    welcomeMsg: string;
    placeholder: string;
    send: string;
    insertCode: string;
    copySnippet: string;
    clearHistory: string;
  };
  modals: {
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteConfirm: string;
    deleteCancel: string;
    resetTitle: string;
    resetMessage: string;
    resetConfirm: string;
    resetCancel: string;
  };
}

export const I18N_NEPALI: I18nDictionary = {
  navbar: {
    title: 'नेपाली स्टुडियो',
    run: 'चलाउनुहोस्',
    running: 'चलिरहेको छ...',
    modeOs: 'ओएस मोड',
    modeWasm: 'वास्म मोड',
    modeSandbox: 'स्यान्डबक्स',
    translitNepali: 'नेपाली टाइप (F2)',
    translitEnglish: 'English Type (F2)',
    aiAssistant: 'एआई सहायक',
    terminal: 'आउटपुट',
    share: 'साझेदारी',
  },
  activityBar: {
    files: 'फाइल अन्वेषक (Ctrl+B)',
    examples: 'उदाहरण पुस्तकालय',
    docs: 'भाषा सन्दर्भ',
    ai: 'एआई सहायक',
    terminal: 'कन्सोल आउटपुट',
    run: 'प्रोग्राम चलाउनुहोस् (Ctrl+Enter)',
  },
  sidebar: {
    filesTitle: 'फाइल अन्वेषक (Files)',
    examplesTitle: 'उदाहरण पुस्तकालय (Examples)',
    docsTitle: 'भाषा सन्दर्भ (Docs & Reference)',
    newFile: 'नयाँ फाइल थप्नुहोस्',
    resetFiles: 'पूर्वनिर्धारितमा रिसेट गर्नुहोस्',
    autoSaveEnabled: 'स्वत: बचत सक्षम छ',
    autoSaveDesc: 'सबै कोड ब्राउजरको लोकल स्टोरेजमा सुरक्षित हुन्छ।',
    searchExamples: 'उदाहरण खोज्नुहोस्...',
    categories: 'वर्गहरू:',
    examplesCount: (count) => `${count} उदाहरणहरू`,
    catAll: 'सबै',
    catBasics: 'आधारभूत',
    catControl: 'लुप/सर्त',
    catFunctions: 'फंक्सन',
    catData: 'डाटा',
    catDates: 'मिति',
    catSystem: 'प्रणाली',
    catInterop: 'पाइथन',
    preview: 'हेर्नुहोस्',
    hidePreview: 'लुकाउनुहोस्',
    load: 'लोड गर्नुहोस्',
    searchDocs: 'भाषा नियम र कुञ्जीशब्द खोज्नुहोस्...',
    insertSnippet: 'घुसाउनुहोस्',
  },
  editor: {
    closeTab: 'ट्याब बन्द गर्नुहोस्',
    closeOthers: 'अन्य ट्याबहरू बन्द गर्नुहोस्',
    renameTab: 'नाम परिवर्तन गर्नुहोस्',
    copyName: 'फाइलको नाम प्रतिलिपि',
    downloadFile: 'डाउनलोड गर्नुहोस्',
    deleteFile: 'फाइल मेटाउनुहोस्',
    unsavedChanges: 'परिवर्तनहरू सुरक्षित गरिएका छैनन्',
    formatCode: 'ढाँचा मिलाउनुहोस् (Shift+Alt+F)',
    formatted: 'ढाँचा मिल्यो',
    copied: 'प्रतिलिपि भयो',
    copyCode: 'कोड प्रतिलिपि गर्नुहोस्',
    download: 'डाउनलोड गर्नुहोस्',
    askAi: 'एआई सोध्नुहोस्',
    statusNepali: 'नेपाली टाइप सक्रिय (F2)',
    statusEnglish: 'English Mode (F2)',
    statusSaved: 'सुरक्षित छ',
    statusUnsaved: 'असुरक्षित परिवर्तन',
    linesLabel: (l, c) => `लाइन ${l}, स्तम्भ ${c}`,
    charsLabel: (chars) => `${chars} क्यारेक्टर`,
  },
  terminal: {
    title: 'कन्सोल आउटपुट र निरीक्षक',
    clear: 'आउटपुट सफा गर्नुहोस्',
    running: 'प्रोग्राम चलिरहेको छ...',
    emptyHint: 'आउटपुट हेर्न प्रोग्राम चलाउनुहोस् (Ctrl+Enter थिच्नुहोस्)।',
    success: (ms) => `प्रोग्राम सफलतापूर्वक सम्पन्न भयो (${ms}ms)`,
    error: (ms) => `प्रोग्राम त्रुटि सहित अन्त्य भयो (${ms}ms)`,
  },
  ai: {
    title: 'नेपाली एआई सहायक',
    subtitle: 'Devanagari AI Coding Assistant',
    welcomeMsg: 'नमस्ते! म नेपाली प्रोग्रामिङ सहायक हुँ। तपाईंलाई कोड लेख्न, त्रुटि बुझ्न वा नयाँ कुरा सिक्न कसरी मद्दत गर्न सक्छु?',
    placeholder: 'नेपाली वा रोमीमा सोध्नुहोस् (Enter थिच्नुहोस्)...',
    send: 'पठाउनुहोस्',
    insertCode: 'कोडमा घुसाउनुहोस्',
    copySnippet: 'प्रतिलिपि',
    clearHistory: 'च्याट खाली गर्नुहोस्',
  },
  modals: {
    deleteTitle: 'फाइल मेटाउनुहोस् (Delete File)',
    deleteMessage: (name) => `के तपाईं "${name}" फाइल निश्चित रूपमा मेटाउन चाहनुहुन्छ? यो प्रक्रिया उल्टाउन सकिँदैन।`,
    deleteConfirm: 'मेटाउनुहोस्',
    deleteCancel: 'रद्द गर्नुहोस्',
    resetTitle: 'कार्यक्षेत्र रिसेट गर्नुहोस् (Reset Workspace)',
    resetMessage: 'के तपाईं सबै सिर्जना गरिएका फाइलहरू हटाएर पूर्वनिर्धारित कोडमा रिसेट गर्न चाहनुहुन्छ?',
    resetConfirm: 'हो, रिसेट गर्नुहोस्',
    resetCancel: 'रद्द गर्नुहोस्',
  },
};

export const I18N_ENGLISH: I18nDictionary = {
  navbar: {
    title: 'Nepali Studio',
    run: 'Run Code',
    running: 'Running...',
    modeOs: 'OS Mode',
    modeWasm: 'WASM Mode',
    modeSandbox: 'Sandbox Mode',
    translitNepali: 'Nepali Mode (F2)',
    translitEnglish: 'English Mode (F2)',
    aiAssistant: 'AI Assistant',
    terminal: 'Terminal',
    share: 'Share',
  },
  activityBar: {
    files: 'File Explorer (Ctrl+B)',
    examples: 'Recipe Library',
    docs: 'Language Reference',
    ai: 'AI Assistant',
    terminal: 'Terminal Output',
    run: 'Run Program (Ctrl+Enter)',
  },
  sidebar: {
    filesTitle: 'File Explorer',
    examplesTitle: 'Example Recipes',
    docsTitle: 'Language Reference & Docs',
    newFile: 'New File',
    resetFiles: 'Reset Workspace to Defaults',
    autoSaveEnabled: 'Auto-save Enabled',
    autoSaveDesc: 'All edits are saved instantly to local browser storage.',
    searchExamples: 'Search examples and recipes...',
    categories: 'Categories:',
    examplesCount: (count) => `${count} Recipes`,
    catAll: 'All',
    catBasics: 'Basics',
    catControl: 'Loops/Cond',
    catFunctions: 'Functions',
    catData: 'Data',
    catDates: 'Dates',
    catSystem: 'System',
    catInterop: 'Python',
    preview: 'Preview',
    hidePreview: 'Hide',
    load: 'Load Recipe',
    searchDocs: 'Search keywords, syntax, builtins...',
    insertSnippet: 'Insert',
  },
  editor: {
    closeTab: 'Close Tab',
    closeOthers: 'Close Other Tabs',
    renameTab: 'Rename Tab',
    copyName: 'Copy File Name',
    downloadFile: 'Download File',
    deleteFile: 'Delete File',
    unsavedChanges: 'Unsaved Changes',
    formatCode: 'Format Code (Shift+Alt+F)',
    formatted: 'Formatted',
    copied: 'Copied',
    copyCode: 'Copy Code',
    download: 'Download',
    askAi: 'Ask AI',
    statusNepali: 'Nepali Mode Active (F2)',
    statusEnglish: 'English Mode (F2)',
    statusSaved: 'Saved',
    statusUnsaved: 'Unsaved Changes',
    linesLabel: (l, c) => `Line ${l}, Col ${c}`,
    charsLabel: (chars) => `${chars} chars`,
  },
  terminal: {
    title: 'Console Output & Inspector',
    clear: 'Clear Console',
    running: 'Executing program...',
    emptyHint: 'Run program (Ctrl+Enter) to see live output here.',
    success: (ms) => `Execution finished successfully (${ms}ms)`,
    error: (ms) => `Execution failed with error (${ms}ms)`,
  },
  ai: {
    title: 'Nepali AI Assistant',
    subtitle: 'Devanagari AI Coding Assistant',
    welcomeMsg: 'Hello! I am the Nepali Coding Assistant. How can I assist you with writing, explaining, or debugging Nepali code today?',
    placeholder: 'Ask a question or explain code (Press Enter)...',
    send: 'Send',
    insertCode: 'Insert into Editor',
    copySnippet: 'Copy',
    clearHistory: 'Clear History',
  },
  modals: {
    deleteTitle: 'Delete File',
    deleteMessage: (name) => `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    resetTitle: 'Reset Workspace',
    resetMessage: 'Are you sure you want to reset all files to default starter code?',
    resetConfirm: 'Reset All',
    resetCancel: 'Cancel',
  },
};

export function getI18n(isNepaliMode: boolean): I18nDictionary {
  return isNepaliMode ? I18N_NEPALI : I18N_ENGLISH;
}
