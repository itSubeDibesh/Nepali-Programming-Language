'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  CornerRightDown,
  X,
  Trash2,
  Check,
  ArrowUp,
  Cpu,
  FileCode,
} from 'lucide-react';
import { copyToClipboard } from '../lib/clipboard';
import { AiMessage, CodeFile } from '../lib/types';
import { transliterateWord } from '../lib/translit';
import { getI18n } from '../lib/i18n';
import { toNepaliDigits } from '../lib/numbers';
import { generateAutonomousAiResponse } from '../lib/bakedInAiEngine';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode: (code: string) => void;
  currentCode: string;
  activeFileName?: string;
  files?: CodeFile[];
  translitEnabled?: boolean;
}

const STORAGE_KEY = 'nepali_studio_ai_messages_v1';

const DEFAULT_AI_MESSAGES: AiMessage[] = [
  {
    id: '1',
    sender: 'assistant',
    text: 'नमस्ते! म नेपाली स्टुडियोको बेक्ड-इन एआई सहायक (Built-in Studio AI) हुँ। कोड लेख्न, त्रुटि सच्याउन, नयाँ एल्गोरिदम बनाउन वा कुनै पनि प्रश्न सोध्न सक्नुहुन्छ!',
    timestamp: 'अहिले',
  },
];

function getInitialAiMessages(): AiMessage[] {
  if (typeof window === 'undefined') return DEFAULT_AI_MESSAGES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_AI_MESSAGES;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  isOpen,
  onClose,
  onInsertCode,
  currentCode,
  activeFileName = 'main.nep',
  files = [],
  translitEnabled = true,
}) => {
  const [messages, setMessagesState] = useState<AiMessage[]>(getInitialAiMessages);
  const i18n = getI18n(translitEnabled).ai;
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const setMessages = (updater: AiMessage[] | ((prev: AiMessage[]) => AiMessage[])) => {
    setMessagesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: AiMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: 'अहिले',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      let data: any = null;

      // 1. Try Desktop Tauri IPC if running in desktop app
      if (typeof window !== 'undefined' && ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
        try {
          const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
          if (typeof tauriInvoke === 'function') {
            const res: any = await tauriInvoke('ask_nepali_ai', {
              question: q,
              codeContext: currentCode,
              activeFile: activeFileName,
            });
            if (res && res.answer && !res.fallback) {
              data = res;
            }
          }
        } catch {}
      }

      // 2. Try Next.js server route
      if (!data || !data.answer) {
        try {
          const resp = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: q,
              codeContext: currentCode,
              activeFileName,
              files: files.map((f) => ({ name: f.name, content: f.content })),
            }),
          });
          if (resp.ok) {
            data = await resp.json();
          }
        } catch {}
      }

      // 3. Fallback to client-side autonomous generative AI
      if (!data || !data.answer) {
        data = await generateAutonomousAiResponse(
          q,
          currentCode,
          activeFileName,
          files.map((f) => ({ name: f.name, content: f.content }))
        );
      }

      const aiMsg: AiMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: data.answer || 'माफ गर्नुहोस्, कुनै उत्तर प्राप्त भएन।',
        codeSnippet: data.codeSnippet,
        timestamp: data.engine ? `⚡ ${data.engine}` : `⚡ नेपाली बेक्ड-इन एआई (${activeFileName})`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const fallback = await generateAutonomousAiResponse(
        q,
        currentCode,
        activeFileName,
        files.map((f) => ({ name: f.name, content: f.content }))
      );
      const aiMsg: AiMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: fallback.answer,
        codeSnippet: fallback.codeSnippet,
        timestamp: `⚡ ${fallback.engine}`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === ' ' || e.key === 'Enter' || e.key === '।' || e.key === '?' || e.key === ',') {
      const target = textareaRef.current;
      if (!target) return;
      const pos = target.selectionStart;
      const text = target.value;

      let wordStart = pos - 1;
      while (wordStart >= 0 && /[a-zA-Z0-9_]/.test(text[wordStart])) {
        wordStart--;
      }
      wordStart++;

      if (wordStart < pos) {
        const rawWord = text.substring(wordStart, pos);
        const nepaliWord = transliterateWord(rawWord);
        if (nepaliWord !== rawWord) {
          e.preventDefault();
          const extra = e.key === 'Enter' ? '\n' : e.key;
          const newText = text.substring(0, wordStart) + nepaliWord + extra + text.substring(pos);
          setInput(newText);
          setTimeout(() => {
            target.selectionStart = target.selectionEnd = wordStart + nepaliWord.length + extra.length;
          }, 0);
        }
      }
    }
  };

  const handleCopySnippet = async (snippet: string, id: string) => {
    await copyToClipboard(snippet);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const quickPrompts = [
    'उमेर गणना गर्ने फङ्क्सन बनाउनुहोस्',
    'दुई मिति बीचको दिन फरक निकाल्ने प्रोग्राम',
    'बबल सर्ट एल्गोरिदम नेपालीमा लेख्नुहोस्',
    'यो कोडमा के समस्या छ र कसरी सच्याउने?',
    'SQLite डाटाबेसमा डेटा राख्ने उदाहरण',
  ];

  return (
    <div className="w-80 md:w-96 border-l border-[#1E293B] bg-[#0B0F19] flex flex-col h-full z-20 select-text shadow-2xl">
      {/* AI Header */}
      <div className="h-14 border-b border-[#1E293B] px-3.5 flex items-center justify-between bg-[#060911]/80 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 font-devanagari">
              नेपाली एआई सहायक
            </h3>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>सक्रिय (Baked-in AI Active)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            title="च्याट खाली गर्नुहोस् (Clear Chat)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
            title="बन्द गर्नुहोस्"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active File Context Live Badge */}
      <div className="px-3.5 py-2 bg-[#070B14] border-b border-[#1E293B] flex items-center justify-between text-[11px] text-slate-400 font-mono select-none flex-shrink-0">
        <div className="flex items-center space-x-1.5 min-w-0 pr-2">
          <FileCode className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-slate-500 font-devanagari flex-shrink-0">सन्दर्भ:</span>
          <span className="text-emerald-300 font-semibold truncate" title={activeFileName}>
            {activeFileName}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-500 flex-shrink-0 font-devanagari">
          <span>{translitEnabled ? toNepaliDigits(currentCode.split('\n').length) : currentCode.split('\n').length} पं.</span>
          {files && files.length > 1 && (
            <span className="bg-[#0F172A] border border-[#1E293B] text-slate-400 px-1.5 py-0.5 rounded font-devanagari text-[9px]">
              +{translitEnabled ? toNepaliDigits(files.length - 1) : files.length - 1} फाइलहरू
            </span>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] p-3.5 rounded-2xl ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                    : 'bg-[#0F172A] border border-[#1E293B] text-slate-200 rounded-bl-sm shadow-sm'
                }`}
              >
                <div className="font-devanagari leading-relaxed whitespace-pre-wrap">{m.text}</div>

                {m.codeSnippet && m.codeSnippet.trim() !== currentCode.trim() && (
                  <div className="mt-3 p-2.5 bg-[#060911] border border-[#1E293B] rounded-xl font-mono text-[11px] text-emerald-300 overflow-hidden space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1E293B] text-[10px] text-slate-400">
                      <span className="font-semibold text-emerald-400 font-devanagari">नेपाली कोड</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopySnippet(m.codeSnippet!, m.id)}
                          className="flex items-center space-x-1 hover:text-emerald-300 transition-colors font-devanagari"
                          title="प्रतिलिपि गर्नुहोस्"
                        >
                          {copiedSnippetId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSnippetId === m.id ? 'प्रतिलिपि भयो' : 'प्रतिलिपि'}</span>
                        </button>
                        <button
                          onClick={() => onInsertCode(m.codeSnippet!)}
                          className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors font-devanagari"
                          title="सम्पादकमा घुसाउनुहोस्"
                        >
                          <CornerRightDown className="w-3 h-3" />
                          <span>{i18n.insertCode}</span>
                        </button>
                      </div>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre font-devanagari leading-relaxed select-text">
                      {m.codeSnippet}
                    </pre>
                  </div>
                )}

                {m.timestamp && !isUser && (
                  <div className="mt-1.5 text-[9px] font-mono text-slate-500 flex items-center space-x-1 font-devanagari">
                    <Cpu className="w-2.5 h-2.5" />
                    <span>{m.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 italic text-xs p-2 font-devanagari">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>एआई सोच्दैछ...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="px-3 py-1.5 border-t border-[#1E293B] bg-[#060911]/40 flex items-center space-x-1.5 overflow-x-auto no-scrollbar select-none">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="flex-shrink-0 text-[10px] bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] px-2.5 py-1 rounded-full font-devanagari transition-colors whitespace-nowrap"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Multiline AI Input Area */}
      <div className="p-3 border-t border-[#1E293B] bg-[#060911]/80">
        <div className="relative bg-[#060911] border border-[#1E293B] rounded-xl p-1.5 focus-within:border-indigo-500/60 shadow-inner flex flex-col space-y-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="यहाँ कुनै पनि प्रश्न सोध्नुहोस् (Enter ले पठाउनुहोस्)..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs p-2 outline-none resize-none max-h-40 overflow-y-auto leading-relaxed font-devanagari"
          />

          <div className="flex items-center justify-between px-2 pt-1 border-t border-[#1E293B]/60 text-[10px] text-slate-500 select-none">
            <span className="font-mono">Enter: पठाउनुहोस् | Shift+Enter: नयाँ पंक्ति</span>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center space-x-1"
              title="पठाउनुहोस् (Send)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
