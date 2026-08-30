import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Volume2, Square, Loader2 } from 'lucide-react';
import { t, locale } from '../locales';

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 };
const fieldStyle = {
  width: '100%', padding: '7px 10px', fontSize: 12,
  border: '1px solid var(--border-primary)', borderRadius: 'var(--radius)',
  background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
  boxSizing: 'border-box',
};

// 試聴用サンプル文
const PREVIEW_TEXT = locale.startsWith('ja')
  ? '音声読み上げのテストです。速度やピッチを調整できます。'
  : 'This is a voice preview. You can adjust the speed and pitch.';

function Slider({ label, value, min, max, step, onChange, format = (v) => v.toFixed(1) }) {
  return (
    <div>
      <label style={labelStyle}>{label}: {format(value)}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
    </div>
  );
}

// 音声設定フォーム本体（ポップオーバーと設定ダイアログで共用）
export function TtsSettingsForm({ tts }) {
  const { settings, update, voices, speakers, error, fetchSpeakers, speakingId, loading, toggle } = tts;

  // 日本語音声を優先して並べる
  const sortedVoices = [...voices].sort(
    (a, b) => (b.lang?.startsWith('ja') ? 1 : 0) - (a.lang?.startsWith('ja') ? 1 : 0)
  );
  // VOICEVOX 話者をフラット化
  const speakerOptions = speakers.flatMap((s) =>
    (s.styles || []).map((st) => ({ id: st.id, label: `${s.name}（${st.name}）` }))
  );

  const isVoicevox = settings.engine === 'voicevox';
  const isPreviewing = speakingId === 'preview';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* エンジン切替 */}
      <div>
        <label style={labelStyle}>{t('ttsEngine')}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'browser', label: t('ttsBrowser') },
            { key: 'voicevox', label: t('ttsVoicevox') },
          ].map((e) => (
            <button key={e.key} onClick={() => update({ engine: e.key })}
              style={{
                flex: 1, padding: '6px 8px', fontSize: 12, fontWeight: 600,
                borderRadius: 'var(--radius)', cursor: 'pointer',
                border: `1px solid ${settings.engine === e.key ? 'var(--accent)' : 'var(--border-primary)'}`,
                background: settings.engine === e.key ? 'var(--accent)' : 'var(--bg-secondary)',
                color: settings.engine === e.key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* ブラウザ標準の設定 */}
      {!isVoicevox && (
        <>
          <div>
            <label style={labelStyle}>{t('ttsVoice')}</label>
            <select value={settings.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })} style={fieldStyle}>
              <option value="">{t('ttsVoiceAuto')}</option>
              {sortedVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}（{v.lang}）</option>
              ))}
            </select>
          </div>
          <Slider label={t('ttsPitch')} value={settings.pitch} min={0.5} max={2} step={0.1}
            onChange={(v) => update({ pitch: v })} format={(v) => `${v.toFixed(1)}`} />
        </>
      )}

      {/* VOICEVOX の設定 */}
      {isVoicevox && (
        <>
          <div>
            <label style={labelStyle}>{t('ttsEndpoint')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={settings.voicevoxUrl} onChange={(e) => update({ voicevoxUrl: e.target.value })}
                placeholder="http://localhost:50021"
                style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace' }} />
              <button onClick={fetchSpeakers}
                style={{
                  padding: '7px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border-primary)',
                  background: speakerOptions.length ? 'var(--accept)' : 'var(--bg-secondary)',
                  color: speakerOptions.length ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
                }}>
                {t('ttsConnect')}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t('ttsSpeaker')}</label>
            <select value={settings.speaker} onChange={(e) => update({ speaker: Number(e.target.value) })}
              style={fieldStyle} disabled={!speakerOptions.length}>
              {speakerOptions.length
                ? speakerOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)
                : <option value={settings.speaker}>{t('ttsSpeakerHint')}</option>}
            </select>
          </div>
          <Slider label={t('ttsPitch')} value={settings.vvPitch} min={-0.15} max={0.15} step={0.01}
            onChange={(v) => update({ vvPitch: v })} format={(v) => v.toFixed(2)} />
          <Slider label={t('ttsIntonation')} value={settings.vvIntonation} min={0} max={2} step={0.1}
            onChange={(v) => update({ vvIntonation: v })} />
          <Slider label={t('ttsVolume')} value={settings.vvVolume} min={0} max={2} step={0.1}
            onChange={(v) => update({ vvVolume: v })} />
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0, lineHeight: 1.5 }}>
            {t('ttsVoicevoxHint')}
          </p>
        </>
      )}

      {/* 速度（共通） */}
      <Slider label={t('ttsRate')} value={settings.rate} min={0.5} max={2} step={0.1}
        onChange={(v) => update({ rate: v })} format={(v) => `${v.toFixed(1)}x`} />

      {/* 試聴 */}
      <button onClick={() => toggle(PREVIEW_TEXT, 'preview')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '7px 12px', fontSize: 12, fontWeight: 600,
          borderRadius: 'var(--radius)', border: '1px solid var(--border-primary)',
          background: isPreviewing ? 'var(--accent-soft)' : 'var(--bg-secondary)',
          color: isPreviewing ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
        {isPreviewing
          ? (loading ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin-slow" /> : <Square style={{ width: 11, height: 11, fill: 'currentColor' }} />)
          : <Volume2 style={{ width: 14, height: 14 }} />}
        {isPreviewing ? t('ttsStop') : t('ttsPreview')}
      </button>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--cat-spelling)', margin: 0, wordBreak: 'break-all' }}>{error}</p>
      )}
    </div>
  );
}

// ポップオーバー版（エディタヘッダー・結果モーダル用）
export default function TtsSettings({ tts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="toolbar-btn" title={t('ttsSettings')} style={{ width: 28, height: 28 }}
        onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal style={{ width: 15, height: 15 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 288, zIndex: 130,
          background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 14,
          maxHeight: '70vh', overflowY: 'auto',
        }}>
          <TtsSettingsForm tts={tts} />
        </div>
      )}
    </div>
  );
}
