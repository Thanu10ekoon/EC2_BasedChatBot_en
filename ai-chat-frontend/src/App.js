// src/App.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function renderMarkdown(md) {
  const raw = marked.parse(md ?? '', { breaks: true });
  const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  return { __html: clean };
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful assistant.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const visibleMessages = useMemo(
    () => messages.filter(m => m.role !== 'system'),
    [messages]
  );

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      });

      const data = await res.json();
      const assistant =
        data?.message ||
        data?.messages?.find(m => m.role === 'assistant') ||
        { role: 'assistant', content: '[No response]' };

      setMessages([...next, assistant]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...next,
        { role: 'assistant', content: '⚠️ Error contacting server.' }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">AI Chat</div>
        <div className="sub">gemma3:1b via EC2</div>
      </header>

      <main className="chat" ref={scrollerRef}>
        {visibleMessages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={i}
              className={`msg ${isUser ? 'msg--user' : 'msg--assistant'}`}
            >
              <div className="msg__avatar" aria-hidden="true">
                {isUser ? 'You' : 'AI'}
              </div>
              <div
                className="msg__bubble"
                dangerouslySetInnerHTML={renderMarkdown(m.content)}
              />
            </div>
          );
        })}
        {loading && (
          <div className="msg msg--assistant">
            <div className="msg__avatar">AI</div>
            <div className="msg__bubble">
              <em>…thinking…</em>
            </div>
          </div>
        )}
      </main>

      <form className="composer" onSubmit={sendMessage}>
        <input
          className="composer__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message…"
        />
        <button className="composer__btn" type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
