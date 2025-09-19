import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './lib/api';

interface MessageItem {
  role: 'user' | 'assistant';
  text: string;
}

const Assistant = () => {
  const [messages, setMessages] = useState<MessageItem[]>([
    { role: 'assistant', text: 'Hello! 👋 I can help with bookings, pricing, payments, or maintenance. How can I assist?' }
  ]);
  const [input, setInput] = useState('Hi! I want to book 3 units for Saturday in Westlands.');
  const [locale, setLocale] = useState<'en' | 'sw'>('en');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

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
        body: JSON.stringify({ message: content, locale })
      });
      if (!resp.ok) {
        let detail = '';
        try { const j = await resp.json(); detail = j?.error || JSON.stringify(j); } catch {}
        throw new Error(`Assistant failed: ${resp.status} ${detail ? `- ${detail}` : ''}`);
      }
      const data = await resp.json();
      const reply = data?.reply || '...';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || 'Sorry, something went wrong.' }]);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Assistant</h1>
          <p className="text-sm text-gray-500">Rule-based assistant (English/Swahili)</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border flex flex-col h-[70vh]">
          <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`max-w-[80%] p-3 rounded ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-900'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t p-3 flex items-center gap-2">
            <select
              className="border rounded px-3 py-2 text-sm"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
              title="Language"
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
            </select>
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              onClick={send}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
