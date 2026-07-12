import { useState, useEffect, useRef, useCallback } from 'react';

// 音声読み上げ（TTS）hook。ブラウザ標準（Web Speech API）と VOICEVOX（ローカルエンジン直接）に対応。
// 設定は localStorage に永続化する。

const TTS_KEY = 'wa-tts';
const DEFAULTS = {
  engine: 'browser',                       // 'browser' | 'voicevox'
  voiceURI: '',                            // ブラウザ音声の voiceURI
  rate: 1.0,                               // 再生速度
  voicevoxUrl: 'http://localhost:50021',   // VOICEVOX エンジンのエンドポイント
  speaker: 3,                              // VOICEVOX の話者ID
};

const loadSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(TTS_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
};

// Chrome は cancel 直後の speak を無視することがあるため微小遅延を挟む
const CANCEL_DELAY = 80;

export function useTextToSpeech() {
  const [settings, setSettings] = useState(loadSettings);
  const [voices, setVoices] = useState([]);       // ブラウザ音声一覧
  const [speakers, setSpeakers] = useState([]);   // VOICEVOX 話者一覧 [{name, styles:[{id,name}]}]
  const [speakingId, setSpeakingId] = useState(null); // 再生中テキストの識別子（未再生なら null）
  const [loading, setLoading] = useState(false);  // VOICEVOX 合成中
  const [error, setError] = useState('');
  const audioRef = useRef(null);   // VOICEVOX 再生中の Audio
  const cancelRef = useRef(false); // 停止フラグ

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => { try { localStorage.setItem(TTS_KEY, JSON.stringify(settings)); } catch {} }, [settings]);

  const update = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);

  // ブラウザ音声の読み込み（非同期で入るため onvoiceschanged も購読）
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [supported]);

  const stop = useCallback(() => {
    cancelRef.current = true;
    if (supported) window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    setSpeakingId(null);
    setLoading(false);
  }, [supported]);

  // ブラウザ標準: 長文の途中切れ（Chrome ~15秒）を避けるため文単位に分割して逐次再生
  const speakBrowser = useCallback((text, id) => {
    if (!supported) { setError('このブラウザは音声読み上げに対応していません'); return; }
    const synth = window.speechSynthesis;
    const chunks = text.match(/[^。．.!?！？\n]+[。．.!?！？\n]?/g) || [text];
    const voice = voices.find((v) => v.voiceURI === settings.voiceURI)
      || voices.find((v) => v.lang?.startsWith('ja')) || null;
    cancelRef.current = false;
    setSpeakingId(id);
    let i = 0;
    const next = () => {
      if (cancelRef.current || i >= chunks.length) { setSpeakingId(null); return; }
      const part = chunks[i].trim();
      if (!part) { i += 1; next(); return; }
      const u = new SpeechSynthesisUtterance(part);
      if (voice) u.voice = voice;
      u.rate = settings.rate;
      u.onend = () => { i += 1; next(); };
      u.onerror = () => { i += 1; next(); };
      synth.speak(u);
    };
    setTimeout(next, CANCEL_DELAY);
  }, [supported, voices, settings.voiceURI, settings.rate]);

  // VOICEVOX: audio_query → synthesis の2段で WAV を取得し再生
  const speakVoicevox = useCallback(async (text, id) => {
    const base = (settings.voicevoxUrl || '').replace(/\/+$/, '');
    const spk = settings.speaker;
    cancelRef.current = false;
    setLoading(true); setSpeakingId(id); setError('');
    try {
      const qRes = await fetch(`${base}/audio_query?text=${encodeURIComponent(text)}&speaker=${spk}`, { method: 'POST' });
      if (!qRes.ok) throw new Error(`audio_query ${qRes.status}`);
      const query = await qRes.json();
      query.speedScale = settings.rate; // 速度はネイティブ指定（ピッチを変えない）
      const sRes = await fetch(`${base}/synthesis?speaker=${spk}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!sRes.ok) throw new Error(`synthesis ${sRes.status}`);
      const blob = await sRes.blob();
      if (cancelRef.current) { setSpeakingId(null); setLoading(false); return; }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setSpeakingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeakingId(null); setError('音声の再生に失敗しました'); URL.revokeObjectURL(url); };
      audioRef.current = audio;
      setLoading(false);
      await audio.play();
    } catch (e) {
      // localhost への接続失敗（エンジン未起動 / CORS / mixed-content）が典型
      setError(String(e?.message || e));
      setSpeakingId(null); setLoading(false);
    }
  }, [settings.voicevoxUrl, settings.speaker, settings.rate]);

  const speak = useCallback((text, id) => {
    if (!text?.trim()) return;
    stop();
    if (settings.engine === 'voicevox') speakVoicevox(text, id);
    else speakBrowser(text, id);
  }, [settings.engine, speakBrowser, speakVoicevox, stop]);

  // 同じテキストなら停止、別なら再生（トグル）
  const toggle = useCallback((text, id) => {
    if (speakingId === id) stop();
    else speak(text, id);
  }, [speakingId, speak, stop]);

  // VOICEVOX 話者一覧を取得（接続テスト兼用）
  const fetchSpeakers = useCallback(async () => {
    const base = (settings.voicevoxUrl || '').replace(/\/+$/, '');
    setError('');
    try {
      const r = await fetch(`${base}/speakers`);
      if (!r.ok) throw new Error(`speakers ${r.status}`);
      const data = await r.json();
      setSpeakers(data);
      return true;
    } catch (e) {
      setError(String(e?.message || e));
      return false;
    }
  }, [settings.voicevoxUrl]);

  // アンマウント時に停止
  useEffect(() => () => stop(), [stop]);

  return { settings, update, voices, speakers, speakingId, loading, error, setError, speak, stop, toggle, fetchSpeakers, supported };
}
