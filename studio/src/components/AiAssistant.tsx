'use client';
import React, { useState } from 'react';
import { Sparkles, Send, Copy, CornerRightDown, X, Bot, User, Code2 } from 'lucide-react';
import { AiMessage } from '../lib/types';

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode: (code: string) => void;
  currentCode: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  isOpen,
  onClose,
  onInsertCode,
  currentCode,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'नमस्ते! म नेपाली प्रोग्रामिङ सहायक हुँ। तपाईंलाई कोड लेख्न, त्रुटि बुझ्न वा नयाँ कुरा सिक्न कसरी मद्दत गर्न सक्छु?',
      timestamp: 'अहिले',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || isLoading) return;

    const userMsg: AiMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: 'अहिले',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, codeContext: currentCode }),
      });
      const data = await resp.json();

      const aiMsg: AiMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: data.answer || 'माफ गर्नुहोस्, म अहिले उत्तर दिन असमर्थ छु।',
        codeSnippet: data.codeSnippet,
        timestamp: 'अहिले',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errorMsg: AiMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `त्रुटि: ${e.message || 'सहायक सेवामा समस्या आयो।'}`,
        timestamp: 'अहिले',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'उमेर पत्ता लगाउने कोड',
    'मितिहरूको अन्तर (दिन_फरक)',
    'इनपुट लिने तरिका',
    'फिबोनाची लुप',
  ];

  return (
    <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-925 flex flex-col h-full z-20 select-text">
      {/* AI Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 font-devanagari">
              नेपाली एआई सहायक
            </h3>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>सक्रिय</span>
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-xl ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
              }`}
            >
              <p className="font-devanagari leading-relaxed whitespace-pre-wrap">{m.text}</p>

              {m.codeSnippet && (
                <div className="mt-2.5 p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-850 text-[10px] text-slate-500">
                    <span>नेपाली कोड</span>
                    <button
                      onClick={() => onInsertCode(m.codeSnippet!)}
                      className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300"
                    >
                      <CornerRightDown className="w-3 h-3" />
                      <span>सम्पादकमा हाल्नुहोस्</span>
                    </button>
                  </div>
                  <pre>{m.codeSnippet}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-500 italic text-xs p-2">
            <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>एआई सोच्दैछ...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 border-t border-slate-850 flex items-center space-x-1 overflow-x-auto no-scrollbar">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="flex-shrink-0 text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1 rounded-full font-devanagari transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="केही सोध्नुहोस् (Ask AI)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-devanagari"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
