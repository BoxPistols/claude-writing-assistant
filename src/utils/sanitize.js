// 出力先テンプレートの禁止事項を、生成結果に対して決定論的に適用する。
// LLMの指示追従に依存すると混入が残るため、署名と絵文字の除去はここで確実に行う。

// AI署名として落とす行。labelは利用者に「何を消したか」を見せるために持つ。
const SIGNATURE_LINES = [
  { label: 'Claude Codeの生成署名', re: /^\s*>?\s*(?:🤖\s*)?Generated\s+with\s+\[?Claude\s+Code\]?(?:\([^)]*\))?\s*$/i },
  { label: 'Claude Codeの生成署名', re: /^\s*>?\s*_*\s*Generated\s+by\s+\[?Claude\s+Code\]?(?:\([^)]*\))?\s*_*\s*$/i },
  { label: 'Co-Authored-By署名', re: /^\s*>?\s*Co-?Authored-?By:\s*Claude\b.*$/i },
  { label: 'Claudeへの言及を含む署名行', re: /^\s*>?\s*.*(?:claude\.ai\/code|claude\.com\/claude-code|noreply@anthropic\.com).*$/i },
  { label: 'Claude由来を示す署名', re: /^\s*>?\s*(?:🤖\s*)?(?:Made|Written|Created|Authored)\s+(?:with|by)\s+Claude\b.*$/i },
  { label: 'Claude由来を示す署名', re: /^\s*>?\s*(?:🤖\s*)?Claude\s+Code\s+(?:により|によって|が)\s*(?:生成|作成).*$/ },
];

// 絵文字。異体字セレクタ・肌色・ZWJ連結・国旗・キーキャップまでを1つの塊として扱う。
const EMOJI_RE = /(?:\p{Extended_Pictographic}(?:️|︎)?(?:\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|︎)?(?:\p{Emoji_Modifier})?)*|\p{Regional_Indicator}{2}|[0-9#*]️?⃣)/gu;
// 記号として本文に使われうるものは絵文字扱いしない。
const EMOJI_KEEP = new Set(['™', '©', '®', '‼', '⁉']);

const isRule = (line) => /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);

/** AI署名の行を落とす。署名を導いていた末尾の水平線も一緒に落とす。 */
export function stripAiSignatures(text) {
  const removed = [];
  const lines = text.split('\n');
  const kept = lines.filter((line) => {
    const hit = SIGNATURE_LINES.find((s) => s.re.test(line));
    if (hit && line.trim()) { removed.push({ label: hit.label, text: line.trim() }); return false; }
    return true;
  });

  // 署名を消した結果、末尾に用のない水平線と空行だけが残ることがある。
  if (removed.length) {
    while (kept.length) {
      const last = kept[kept.length - 1];
      if (last.trim() === '' || isRule(last)) kept.pop();
      else break;
    }
  }
  return { text: kept.join('\n'), removed };
}

/** 絵文字を落とす。除去跡の空白は行単位で詰める。インデントは元の行のものを保つ。 */
export function stripEmoji(text) {
  const removed = [];
  const lines = text.split('\n').map((line) => {
    EMOJI_RE.lastIndex = 0;
    if (!EMOJI_RE.test(line)) return line;
    EMOJI_RE.lastIndex = 0;
    // インデントは判定前に切り離す。箇条書きの階層を崩さないため。
    const leading = line.match(/^[ \t]*/)[0];
    const body = line.slice(leading.length).replace(EMOJI_RE, (m) => {
      if (EMOJI_KEEP.has(m)) return m;
      removed.push({ label: '絵文字', text: m });
      return '';
    });
    return (leading + body.replace(/[ \t]{2,}/g, ' ').replace(/^[ \t]+/, '')).trimEnd();
  });
  return { text: lines.join('\n'), removed };
}

/**
 * Markdown記法を外して本文を残す。
 * level 'minimal' は見出しと強調だけ落とす (コミットメッセージ向け。- の箇条書きはgitの慣習なので残す)。
 * level 'none' はSlack向けにリンクと箇条書き記号まで落とす。
 */
export function stripMarkdown(text, level = 'none') {
  const removed = [];
  const mark = (label) => { removed.push({ label, text: '' }); };
  let out = text
    .replace(/^\s{0,3}#{1,6}\s+/gm, () => { mark('見出し記法'); return ''; })
    .replace(/\*\*([^*\n]+)\*\*/g, (_, s) => { mark('太字記法'); return s; })
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_, s) => { mark('斜体記法'); return s; });

  if (level === 'minimal') return { text: out, removed };

  out = out
    .replace(/`([^`\n]+)`/g, (_, s) => { mark('インラインコード記法'); return s; })
    // URLはフルパスのまま残す。SlackではラベルよりURL本体が要る。
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
      mark('リンク記法'); return label.trim() === url.trim() ? url : `${label} ${url}`;
    })
    .replace(/^\s{0,3}>\s?/gm, () => { mark('引用記法'); return ''; })
    .replace(/^(\s*)[-*+]\s+/gm, (_, sp) => { mark('箇条書き記号'); return `${sp}・`; });
  return { text: out, removed };
}

/**
 * 出力先の設定に沿って生成結果を整える。
 * @returns {{text: string, removed: Array<{label: string, text: string}>}}
 */
export function sanitizeForTarget(text, target) {
  if (!target) return { text, removed: [] };
  let out = text;
  const removed = [];
  const run = (fn) => { const r = fn(out); out = r.text; removed.push(...r.removed); };

  if (target.stripSignatures !== false) run(stripAiSignatures);
  if (target.allowEmoji === false) run(stripEmoji);
  if (target.markdown === 'minimal') run((s) => stripMarkdown(s, 'minimal'));
  if (target.markdown === 'none') run((s) => stripMarkdown(s, 'none'));

  // 空行が3行以上続くのは整形の副作用なので1行に詰める。
  out = out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trim();
  return { text: out, removed };
}

/** 除去内容を「何をいくつ消したか」に畳む。画面表示用。 */
export function summarizeRemovals(removed) {
  const byLabel = new Map();
  for (const r of removed) byLabel.set(r.label, (byLabel.get(r.label) || 0) + 1);
  return [...byLabel.entries()].map(([label, count]) => ({ label, count }));
}
