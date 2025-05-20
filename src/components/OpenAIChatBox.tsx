import React, { useState, useRef } from 'react';

const LOCAL_STORAGE_KEY = 'openai_api_key';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const OpenAIChatBox: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async () => {
    setError('');
    if (!input.trim()) return;
    if (!apiKey) {
      setError('No OpenAI API key set. Please set it above.');
      return;
    }
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || 'No response.';
      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      sendMessage();
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white max-w-xl mx-auto shadow">
      <div
        className="flex items-center justify-between cursor-pointer select-none mb-2"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand chat' : 'Collapse chat'}
      >
        <h2 className="text-lg font-semibold">OpenAI Chat</h2>
        <span className="text-xl ml-2">
          {collapsed ? '▸' : '▾'}
        </span>
      </div>
      {!collapsed && (
        <>
          <div className="h-64 overflow-y-auto bg-gray-50 p-2 mb-2 rounded border" style={{ minHeight: '8rem' }}>
            {messages.length === 0 && (
              <div className="text-gray-400 text-sm">Start a conversation with OpenAI...</div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <span className={msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-800'}
                  style={{ display: 'inline-block', borderRadius: 8, padding: '6px 12px', margin: '4px 0', maxWidth: '80%' }}>
                  <b>{msg.role === 'user' ? 'You' : 'OpenAI'}:</b> {msg.content}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="border p-2 rounded flex-1"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={loading}
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={sendMessage}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          <div className="text-xs text-gray-400 mt-2">Uses your OpenAI API key. Messages are not stored.</div>
        </>
      )}
    </div>
  );
};

export default OpenAIChatBox; 