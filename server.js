import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeRequest, getAvailableProviders, testConnection, resolveKey } from './api/_shared.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());

// 簡易Basic認証（BASIC_AUTH_PASSWORD が設定されている場合のみ有効）
if (process.env.BASIC_AUTH_PASSWORD) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth) {
      const [scheme, encoded] = auth.split(' ');
      if (scheme === 'Basic' && encoded) {
        const [, pwd] = Buffer.from(encoded, 'base64').toString().split(':');
        if (pwd === process.env.BASIC_AUTH_PASSWORD) return next();
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="The Write"');
    res.status(401).send('Authentication required');
  });
}

app.use(express.json({ limit: '10mb' }));

// Serve static files in production
app.use(express.static(join(__dirname, 'dist')));

// Available API keys endpoint
app.get('/api/providers', (req, res) => {
  res.json(getAvailableProviders());
});

// ─── Unified Analyze Endpoint ──────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const data = await analyzeRequest(req.body);
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message || err);
    const status = err.status || 500;
    const message = status >= 500
      ? 'Internal server error'
      : (typeof err.message === 'string' ? err.message : 'Internal server error');
    res.status(status).json({ error: message });
  }
});

// ─── Connection Test Endpoint ──────────────────────
app.post('/api/test-connection', async (req, res) => {
  try {
    const { provider, clientKeys } = req.body || {};
    if (!provider) {
      return res.status(400).json({ ok: false, error: 'provider is required' });
    }
    const apiKey = resolveKey(provider, clientKeys);
    if (!apiKey) {
      return res.status(200).json({ ok: false, provider, error: 'API key not provided' });
    }
    const source = clientKeys?.[provider] ? 'client' : 'server';
    await testConnection(provider, apiKey);
    res.json({ ok: true, provider, source });
  } catch (err) {
    const message = typeof err.message === 'string' ? err.message : 'Connection failed';
    res.status(200).json({ ok: false, provider: req.body?.provider, error: message });
  }
});

// SPA fallback for production
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API proxy running on http://localhost:${PORT}`);
});
