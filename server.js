import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));

// Provider detection from model ID
function getProvider(modelId) {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'gemini';
  return null;
}

// Available API keys endpoint
app.get('/api/providers', (req, res) => {
  res.json({
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  });
});

// Resolve API key: client-provided key takes precedence over env var
function resolveKey(provider, clientKeys) {
  const envMap = { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY' };
  // clientKeys uses provider name ('openai') as key from frontend
  return clientKeys?.[provider] || process.env[envMap[provider]] || null;
}

// ─── OpenAI ────────────────────────────────────────
async function callOpenAI(model, messages, apiKey) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 1000,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[OpenAI] ${response.status} ${response.statusText}:`, errBody);
    throw { status: response.status, message: `OpenAI error ${response.status}: ${errBody}` };
  }

  const data = await response.json();
  return {
    content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
    model: data.model,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
  };
}

// ─── Anthropic ─────────────────────────────────────
async function callAnthropic(model, messages, apiKey) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Anthropic] ${response.status} ${response.statusText}:`, errBody);
    throw { status: response.status, message: `Anthropic error ${response.status}: ${errBody}` };
  }

  return response.json();
}

// ─── Google Gemini ─────────────────────────────────
async function callGemini(model, messages, apiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // Convert chat messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 1000 },
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Gemini] ${response.status} ${response.statusText}:`, errBody);
    throw { status: response.status, message: `Gemini error ${response.status}: ${errBody}` };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    content: [{ type: 'text', text }],
    model,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

// ─── Unified Analyze Endpoint ──────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const { model, messages, clientKeys } = req.body;
    const provider = getProvider(model);

    if (!provider) {
      return res.status(400).json({ error: `Unknown model: ${model}` });
    }

    const apiKey = resolveKey(provider, clientKeys);

    let data;
    switch (provider) {
      case 'openai':
        data = await callOpenAI(model, messages, apiKey);
        break;
      case 'anthropic':
        data = await callAnthropic(model, messages, apiKey);
        break;
      case 'gemini':
        data = await callGemini(model, messages, apiKey);
        break;
    }

    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message || err);
    const status = err.status || 500;
    const message = typeof err.message === 'string' ? err.message : 'Internal server error';
    res.status(status).json({ error: message });
  }
});

// SPA fallback for production
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API proxy running on http://localhost:${PORT}`);
});
