// ux-writing-dead-cliche の配布物を src/vendor/ に取り込む。
// 検出ロジックは The-Write では書かない。上流をそのまま複製し、差分が出たらここで検知する。
// 使い方: npm run sync:cliche
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BASE = 'https://boxpistols.github.io/ux-writing-dead-cliche';
const TARGETS = [
  { url: `${BASE}/engine.mjs`, path: 'src/vendor/dead-cliche-engine.mjs', kind: 'js' },
  { url: `${BASE}/app-data.json`, path: 'src/vendor/dead-cliche-data.js', kind: 'data' },
];

const HEADER = `// 上流 ${BASE} の複製。直接編集しない。
// 更新は npm run sync:cliche。辞書の変更要望は ux-writing-dead-cliche 側の issue へ。
`;

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

let changed = 0;
for (const t of TARGETS) {
  const res = await fetch(`${t.url}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`${t.url} -> ${res.status}`);
  const body = await res.text();
  // JSON のままだと Node が import attribute を要求し Vite と挙動が割れるので、JS モジュールとして吐く。
  const next = t.kind === 'js' ? HEADER + body : `${HEADER}export default ${body.trim()};\n`;
  const prev = await readFile(t.path, 'utf8').catch(() => null);
  if (prev === next) { console.log(`変更なし ${t.path} (${sha(next)})`); continue; }
  await writeFile(t.path, next);
  changed++;
  console.log(`${prev === null ? '新規' : '更新'} ${t.path} (${prev ? sha(prev) + ' -> ' : ''}${sha(next)})`);
}

// 取り込んだ結果が The-Write の想定と噛み合うかを、その場で実測して出す。
const { default: data } = await import(`../src/vendor/dead-cliche-data.js?${Date.now()}`);
const engine = await import(`../src/vendor/dead-cliche-engine.mjs?${Date.now()}`);
if (typeof engine.rulesForPresetData !== 'function') {
  throw new Error('上流の engine に rulesForPresetData がない。取り込みを中止する。');
}
const manual = data.rules.filter((r) => r.manual === true).length;
console.log(`\n辞書 v${data.version}: 規則 ${data.rules.length} 件 (自動 ${data.rules.length - manual} / 手動 ${manual})`);
for (const p of Object.keys(data.presets)) {
  const rules = engine.rulesForPresetData(data, p);
  console.log(`  ${p.padEnd(14)} 自動 ${String(rules.length).padStart(3)} 件  ${data.presetInfo[p].description}`);
}
// 上書きが実際に効いているかを確かめる。効いていなければプリセットの差が消えている。
const ov = Object.entries(data.presetInfo).filter(([, v]) => Object.keys(v.severity || {}).length);
console.log(ov.length ? `\nseverity 上書きあり: ${ov.map(([k, v]) => `${k}(${Object.keys(v.severity).length}件)`).join(', ')}`
                      : '\n警告: severity 上書きが1件もない。プリセット間で差が出ない可能性がある。');
console.log(changed ? `\n${changed} 件更新した。` : '\nすべて最新。');
