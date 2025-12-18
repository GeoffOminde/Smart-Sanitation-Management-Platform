import { useEffect, useRef, useState } from 'react';
import { useLocale } from './contexts/LocaleContext';
import { apiFetch } from './lib/api';

interface MessageItem {
  role: 'user' | 'assistant';
  text: string;
}

import { Send, User, Bot } from 'lucide-react';

const Assistant = () => {
  const { t, locale, setLocale } = useLocale();
  const [messages, setMessages] = useState<MessageItem[]>([
    { role: 'assistant', text: t('assistant.welcome') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Generate a unique session ID for conversation context
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('assistantSessionId');
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('assistantSessionId', newId);
    return newId;
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');
    setLoading(true);
    try {
      const resp = await apiFetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          locale,
          sessionId  // Send sessionId for context tracking
        })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch { }
        throw new Error(`Assistant failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      const reply = data?.reply || '...';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || t('assistant.error') }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shadow-inner border border-white/10">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide">{t('assistant.title')}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <p className="text-[10px] text-blue-100 font-medium uppercase tracking-wider opacity-90">{t('assistant.live')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <select
            className="bg-white/10 text-white text-xs font-semibold border border-white/20 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-white/20 transition-colors backdrop-blur-sm"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
            title="Change Language"
          >
            <option value="en" className="text-gray-900">EN</option>
            <option value="sw" className="text-gray-900">SW</option>
          </select>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth custom-scrollbar">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white ${isUser ? 'bg-gradient-to-br from-indigo-100 to-blue-50' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                  {isUser ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed border whitespace-pre-wrap ${isUser
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none border-transparent'
                  : 'bg-white text-gray-800 border-gray-100 rounded-bl-none shadow-md shadow-gray-100/50'
                  }`}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex w-full justify-start animate-in fade-in duration-300">
            <div className="flex max-w-[85%] flex-row items-end gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-md">
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="relative flex items-center group">
          <input
            className="w-full pl-5 pr-14 py-3.5 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none shadow-inner"
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            autoFocus
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">
          {t('assistant.footer')}
        </p>
      </div>
    </div>
  );
};

export default Assistant;
