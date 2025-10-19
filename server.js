import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS (open now; lock to your domain later)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// simple rate limit
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

app.post('/api/chat', async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const systemPrompt = `You are StudyBuddy, a friendly tutor. Be concise, step-by-step, and don’t complete graded work.`;

    const ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      })
    });

    if (!ai.ok) {
      const detail = await ai.text();
      return res.status(500).json({ error: 'OpenAI failed', detail });
    }

    const data = await ai.json();
    res.json({ reply: data?.choices?.[0]?.message?.content ?? '(no reply)' });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('OK on ' + PORT));
