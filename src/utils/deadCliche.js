// ux-writing-dead-clicheの辞書で本文を検査する。
// 判定ロジックとプリセット解決は上流のengineに任せる。ここでルールを書かない。
// 取り込みはnpm run sync:cliche (scripts/sync-dead-cliche.mjs)。

let cache = null;

/** 辞書とengineを遅延読み込みする。初回だけ読み、以降は使い回す。 */
async function load() {
  if (cache) return cache;
  const [engine, mod] = await Promise.all([
    import('../vendor/dead-cliche-engine.mjs'),
    import('../vendor/dead-cliche-data.js'),
  ]);
  cache = { engine, data: mod.default ?? mod };
  return cache;
}

/** 画面に出す検査範囲。0件を「問題なし」と誤読させないために常に添える。 */
export async function getPresetScope(presetName) {
  const { engine, data } = await load();
  const info = data.presetInfo?.[presetName];
  if (!info) return null;
  const rules = engine.rulesForPresetData(data, presetName);
  const manualCount = data.rules.filter((r) => r.manual === true).length;
  return {
    preset: presetName,
    description: info.description,
    activeCount: rules.length,
    totalRules: data.rules.length,
    manualCount,
    version: data.version,
  };
}

/**
 * 生成側に渡す日本語ライティング規律を返す。辞書から自動生成されたもので、
 * 検出ルールと同じ情報源を持つ。ここでクリシェの一覧を書かない。
 * 書かずに済ませると、辞書に語が増えても生成側が知らないままになる。
 * @param {'writing-guard'|'writing-guard-compact'|'ux-writing-guard'|'clean-sheet-writing'} id
 */
export async function getWritingGuard(id = 'writing-guard') {
  const { data } = await load();
  return data.guards?.find((g) => g.id === id)?.body || '';
}

/**
 * 辞書が持つ決定論的な修正を適用する。修正テンプレートは辞書側にあり、ここでは書かない。
 * businessプリセットの対象は3ルール(和欧間スペース、感嘆符の重ね、することができます)で、
 * いずれも文意を変えない。自動で直せるものを先に消し、人が判断すべき指摘だけを検査に残す。
 * @returns {Promise<{text: string, applied: Array<{ruleId: string, before: string, after: string}>}>}
 */
export async function autoFix(text, presetName = 'business') {
  const { engine, data } = await load();
  if (!data.presetInfo?.[presetName]) throw new Error(`未知のプリセット: ${presetName}`);
  const rules = engine.rulesForPresetData(data, presetName);
  // maskedTextを渡さないとコードブロックとインラインコードの中身まで書き換わる。
  return engine.applyFixes(text, rules, { maskedText: engine.maskMarkdownCode(text) });
}

/**
 * 本文を検査する。コードブロックとインラインコードは除外する。
 * @returns {Promise<{violations: Array, scope: object|null}>}
 */
export async function checkText(text, presetName = 'business') {
  const { engine, data } = await load();
  if (!data.presetInfo?.[presetName]) throw new Error(`未知のプリセット: ${presetName}`);
  const rules = engine.rulesForPresetData(data, presetName);
  const masked = engine.maskMarkdownCode(text);
  // 書式ルールのmatchedは空白や記号だけになることがあり、そのままでは何に当たったか読めない。
  // 辞書が持つ代表表現とカテゴリ名をviolationに足して、画面で説明できるようにする。
  const byId = new Map(data.rules.map((r) => [r.id, r]));
  const violations = engine.check(masked, rules).map((v) => {
    const rule = byId.get(v.ruleId);
    return { ...v, catLabel: rule?.catLabel || '' };
  });
  return { violations, scope: await getPresetScope(presetName) };
}

/** 重大度ごとの件数。engineのJSON出力と同じ形に揃える。 */
export function countBySeverity(violations) {
  return violations.reduce(
    (acc, v) => { acc[v.severity] = (acc[v.severity] || 0) + 1; return acc; },
    { error: 0, warn: 0, info: 0 }
  );
}

/**
 * 書き直し前後を行単位で照合する。
 * 辞書は「辞書にある表現の有無」しか見ないので、意味が壊れても0件になりうる。
 * 行数の変化・数値の変化・原文とほとんど重ならない行を、利用者に確認させるために返す。
 */
export function diffReport(before, after) {
  const bl = before.split('\n').filter((l) => l.trim());
  const al = after.split('\n').filter((l) => l.trim());
  const nums = (s) => (s.match(/[+-]?\d+(?:[.,]\d+)*/g) || []);
  const bn = nums(before), an = nums(after);
  // 出現回数で引き算する。includesだと「1と1」を「1」にしても差が出ない。
  const subtract = (from, against) => {
    const rest = new Map();
    for (const n of against) rest.set(n, (rest.get(n) || 0) + 1);
    return from.filter((n) => {
      const c = rest.get(n) || 0;
      if (!c) return true;
      rest.set(n, c - 1);
      return false;
    });
  };
  // 消えた側は出現回数で見る。「1と1」を「1」にすると情報が落ちるため。
  const removedNums = subtract(bn, an);
  // 入った側は原文に一度も出てこない値だけを見る。捏造の検知が目的で、
  // 原文にある数値の再掲(10秒を2回書く等)は問題にならない。
  const inBefore = new Set(bn);
  const addedNums = an.filter((n) => !inBefore.has(n));

  // 2-gramの重なりで行の対応を測る。日本語は分かち書きしないので文字2-gramを使う。
  const grams = (s) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));
  const overlap = (a, b) => {
    const ga = grams(a), gb = grams(b);
    if (!ga.size || !gb.size) return 0;
    let hit = 0;
    for (const g of ga) if (gb.has(g)) hit++;
    return hit / Math.max(ga.size, gb.size);
  };
  const drifted = al
    .map((line) => ({ line, score: Math.max(0, ...bl.map((b) => overlap(line, b))) }))
    .filter((x) => x.score < 0.3);

  return {
    lineCountBefore: bl.length,
    lineCountAfter: al.length,
    lineCountChanged: bl.length !== al.length,
    removedNumbers: [...new Set(removedNums)],
    addedNumbers: [...new Set(addedNums)],
    driftedLines: drifted.map((d) => d.line),
    // 何も引っかからなくても「検証した」だけであって「正しい」ではない。
    hasWarnings: bl.length !== al.length || removedNums.length > 0 || addedNums.length > 0 || drifted.length > 0,
  };
}
