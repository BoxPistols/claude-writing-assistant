import crypto from 'crypto';
import { setCorsHeaders } from './_shared.js';

function parseBody(req) {
  if (req.body == null) return {};
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString('utf8')); } catch { return {}; }
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export default function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = (process.env.BASIC_AUTH_PASSWORD || '').trim();
  if (!expected) return res.status(200).json({ ok: true });

  const { password } = parseBody(req);
  const input = (password || '').trim();

  if (input !== expected) {
    return res.status(401).json({ error: 'Invalid password', debug: { inputLen: input.length, expectedLen: expected.length } });
  }

  const token = crypto.createHash('sha256').update(expected).digest('hex');
  const isSecure = req.headers['x-forwarded-proto'] === 'https';
  const cookie = `auth-token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}${isSecure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
}
