import React, { useState, useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { t } from '../locales';

// 結果モーダル内の音声設定ポップオーバー（エンジン / 音声・話者 / 速度 / VOICEVOXエンドポイント）
export default function TtsSettings({ tts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { settings, update, voices, speakers, error, fetchSpeakers } = tts;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // 日本語音声を優先して並べる
  const sortedVoices = [...voices].sort(
    (a, b) => (b.lang?.startsWith('ja') ? 1 : 0) - (a.lang?.startsWith('ja') ? 1 : 0)
  );
  // VOICEVOX 話者をフラット化（{name（style）: id}）
  const speakerOptions = speakers.flatMap((s) =>
    (s.styles || []).map((st) => ({ id: st.id, label: `${s.name}（${st.name}）` }))
  );

  const isVoicevox = settings.engine === 'voicevox';

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 };
  const fieldStyle = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    border: '1px solid var(--border-primary)', borderRadius: 'var(--radius)',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="toolbar-btn" title={t('ttsSettings')} style={{ width: 28, height: 28 }}
        onClick={() => setOpen((o) => !o)}>
        <Volume2 style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 288, zIndex: 130,
          background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
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

          {/* ブラウザ音声 */}
          {!isVoicevox && (
            <div>
              <label style={labelStyle}>{t('ttsVoice')}</label>
              <select value={settings.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })} style={fieldStyle}>
                <option value="">{t('ttsVoiceAuto')}</option>
                {sortedVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}（{v.lang}）</option>
                ))}
              </select>
            </div>
          )}

          {/* VOICEVOX 設定 */}
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
              <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0, lineHeight: 1.5 }}>
                {t('ttsVoicevoxHint')}
              </p>
            </>
          )}

          {/* 速度 */}
          <div>
            <label style={labelStyle}>{t('ttsRate')}: {settings.rate.toFixed(1)}x</label>
            <input type="range" min="0.5" max="2" step="0.1" value={settings.rate}
              onChange={(e) => update({ rate: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: 'var(--cat-spelling)', margin: 0, wordBreak: 'break-all' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
