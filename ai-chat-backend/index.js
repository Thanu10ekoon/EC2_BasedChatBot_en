// index.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.MODEL || 'gemma3:1b';

// Basic hardening: only allow your laptop origin (replace with your actual IP/host if you know it)
app.use(cors({ origin: true })); // keep simple for now
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, model: DEFAULT_MODEL });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }

    // Forward to Ollama Chat API
    const body = {
      model: model || DEFAULT_MODEL,
      messages,
      stream: false, // simpler for frontend
      options: {
        temperature: 0.7
      }
    };

    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Ollama error', detail: text });
    }

    const data = await r.json();
    // Ollama returns { message: { role, content }, ... } and possibly full context
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
  console.log(`Talking to Ollama at ${OLLAMA_URL} (model: ${DEFAULT_MODEL})`);
});
