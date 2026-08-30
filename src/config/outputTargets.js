// 出力先テンプレート。書き直し・文脈整形のプロンプトに制約を足し、
// 生成後の決定論的サニタイズ (utils/sanitize.js) と辞書プリセットを紐づける。
// 文言の実体はここに集約する。TextEditor 側にリテラルを置かない。

// 全出力先に共通で効く規律。ユーザー指定の書き方をそのまま制約にしている。
const SHARED_JA = `【文体の規律】
- 相手に敬意を持ち、端的に書く。長文は読まれない
- 定量的な根拠を並べ立てない。数値は判断に必要な最小限にとどめる
- ただし、課題の内容と、相手が取るべきアクションは必ず明確にする
- 確認できていないことは書かない。推測を事実として書かない。不明な点は不明と書くか、書かずに省く
- 太字や見出しを装飾として散らさない。強調記法で語を飾らない
- 句読点で改行しない。段落は 1 行に繋げる
- 絵文字を使わない
- 生成ツールの署名を入れない (Claude 関連の署名、Co-Authored-By、Generated with 等は一切不要)`;

const SHARED_EN = `Writing discipline:
- Be concise and respectful to the reader. Long messages do not get read
- Do not pile on quantitative evidence. Keep numbers to the minimum needed for the decision
- Always make the problem and the action the reader should take explicit
- Do not write anything you could not confirm. Do not present guesses as facts. Omit what is unknown
- Do not scatter bold or headings as decoration
- No emoji
- No generator signatures (no Claude-related sign-off, Co-Authored-By, or "Generated with" lines)`;

/** @type {Array<{id:string,markdown:'full'|'minimal'|'none',allowEmoji:boolean,stripSignatures:boolean,preset:string,label:{ja:string,en:string},desc:{ja:string,en:string},instruction:{ja:string,en:string}}>} */
export const OUTPUT_TARGETS = [
  {
    id: 'free',
    markdown: 'full',
    allowEmoji: true,
    stripSignatures: true,
    preset: 'business',
    label: { ja: '自由', en: 'Free' },
    desc: { ja: '出力先を決めずに書く。署名の除去だけ行う', en: 'No target. Only generator signatures are stripped' },
    instruction: { ja: '', en: '' },
  },
  {
    id: 'pr-body',
    markdown: 'full',
    allowEmoji: false,
    stripSignatures: true,
    preset: 'business',
    label: { ja: 'PR 本文', en: 'PR description' },
    desc: { ja: 'GitHub のプルリクエスト本文。Markdown 可', en: 'GitHub pull request description. Markdown allowed' },
    instruction: {
      ja: `${SHARED_JA}

【出力先: GitHub の PR 本文】
- 何を変えたかを先に書く。次に、なぜその変更が要るのかを書く
- 変更の影響範囲と、レビュアーに見てほしい箇所を具体的に書く
- 動作確認したことと、していないことを分けて書く。していないことを書けない場合は、確認済みの範囲だけを書く
- Markdown の見出しと箇条書きは使ってよい。ただし構造を作るためだけの空の節を置かない
- 「〜を実装しました」の羅列で終わらせない。レビュアーが判断に使える情報を書く`,
      en: `${SHARED_EN}

Target: GitHub pull request description
- Lead with what changed, then why it was needed
- State the blast radius and the specific places the reviewer should look at
- Separate what you verified from what you did not. If you cannot state the latter, describe only what was verified
- Markdown headings and lists are allowed, but do not add empty sections just to create structure`,
    },
  },
  {
    id: 'issue',
    markdown: 'full',
    allowEmoji: false,
    stripSignatures: true,
    preset: 'business',
    label: { ja: 'issue', en: 'Issue' },
    desc: { ja: 'GitHub の issue 本文。課題と次の行動を明確にする', en: 'GitHub issue. State the problem and the next action' },
    instruction: {
      ja: `${SHARED_JA}

【出力先: GitHub の issue】
- 起きていること (事実) と、そこから困ること (影響) を分けて書く
- 再現手順が分かる場合は書く。分からない場合は「再現手順は未特定」と書き、推測の手順を書かない
- 期待する状態と実際の状態を書く
- 取るべきアクションの候補を書く。決められない場合は、決めるために必要な情報を書く
- 誰かの落ち度として書かない。事実の記述にとどめる`,
      en: `${SHARED_EN}

Target: GitHub issue
- Separate what is happening (facts) from why it matters (impact)
- Include reproduction steps if known; if not, say they are not yet identified rather than guessing
- State expected versus actual behavior
- Propose the action to take, or state what information is needed to decide
- Describe facts, not fault`,
    },
  },
  {
    id: 'commit',
    markdown: 'minimal',
    allowEmoji: false,
    stripSignatures: true,
    preset: 'business',
    label: { ja: 'コミットメッセージ', en: 'Commit message' },
    desc: { ja: '1 行目に要約、空行、本文。署名なし', en: 'Summary line, blank line, body. No sign-off' },
    instruction: {
      ja: `${SHARED_JA}

【出力先: コミットメッセージ】
- 1 行目は変更の要約。命令形か体言止めで、50 文字程度に収める。末尾に句点を打たない
- 2 行目は空行にする
- 3 行目以降に、なぜその変更をしたのかを書く。何をしたかはコードを見れば分かるので、理由を優先する
- 本文が不要なほど自明な変更なら、1 行目だけで終える
- 箇条書きは使ってよいが、見出し記法は使わない
- 末尾に署名・生成ツールの表記を一切付けない`,
      en: `${SHARED_EN}

Target: commit message
- First line: a summary in imperative mood, about 50 characters, no trailing period
- Second line: blank
- Body: why the change was made. What changed is visible in the diff, so prioritize the reason
- If the change is self-evident, the summary line alone is enough
- Lists are fine; headings are not
- No sign-off or generator attribution at the end`,
    },
  },
  {
    id: 'pr-review',
    markdown: 'full',
    allowEmoji: false,
    stripSignatures: true,
    preset: 'business',
    label: { ja: 'PR レビュー', en: 'PR review' },
    desc: { ja: 'レビューコメント。指摘と根拠と対応案を端的に', en: 'Review comment. Finding, basis, and proposed fix' },
    instruction: {
      ja: `${SHARED_JA}

【出力先: PR のレビューコメント】
- 指摘は「どこが」「どうなると困るか」「どうするか」の 3 点が分かる形にする
- 断定できる指摘と、確認したい質問を混ぜない。分からないことは質問として書く
- 実際に動かして確かめた指摘か、コードを読んだだけの推測かを区別する。推測なら推測と書く
- 相手の判断を尊重する。既に検討済みの可能性を否定しない
- 重大度の低い指摘に長い説明を付けない
- 太字と見出しを多用しない。この文章は投稿者本人の名前で公開される`,
      en: `${SHARED_EN}

Target: pull request review comment
- Each finding should make clear where it is, what goes wrong, and what to do
- Do not mix confident findings with open questions; phrase uncertainty as a question
- Distinguish findings you verified by running the code from ones you inferred by reading it
- Respect the author's judgment; do not assume they have not already considered it
- Do not attach long explanations to minor findings
- Avoid heavy bold and headings; this comment is published under the reviewer's own name`,
    },
  },
  {
    id: 'slack-review-request',
    markdown: 'none',
    allowEmoji: false,
    stripSignatures: true,
    preset: 'business',
    label: { ja: 'Slack レビュー依頼', en: 'Slack review request' },
    desc: { ja: 'プレーンテキスト。URL はフルパスで書く', en: 'Plain text. URLs written in full' },
    instruction: {
      ja: `${SHARED_JA}

【出力先: Slack のレビュー依頼】
- プレーンテキストで書く。Markdown 記法を使わない。見出し記法、太字、リンク記法を使わない
- URL は短縮せずフルパスで書く。リンクにラベルを付けず、URL をそのまま置く
- 冒頭で何のレビューを頼んでいるかが分かるようにする
- 変更の要点を 2 行から 4 行で書く。差分の全項目を書き写さない
- レビュアーに特に見てほしい箇所と、いつまでに見てほしいかを書く。期限が不明なら書かない
- 箇条書きは中黒を使う。装飾記号を並べない`,
      en: `${SHARED_EN}

Target: Slack review request
- Plain text only. No Markdown: no headings, no bold, no link syntax
- Write URLs in full, unshortened, with no label
- Open with what is being reviewed
- Summarize the change in two to four lines; do not transcribe the whole diff
- Say what you want looked at, and by when if a deadline exists`,
    },
  },
];

export const DEFAULT_TARGET_ID = 'free';

export const getTarget = (id) => OUTPUT_TARGETS.find((t) => t.id === id) || OUTPUT_TARGETS[0];

/** locale に応じた表示用の一覧を返す。 */
export function listTargets(isJa) {
  const k = isJa ? 'ja' : 'en';
  return OUTPUT_TARGETS.map((t) => ({ ...t, labelText: t.label[k], descText: t.desc[k] }));
}

/** プロンプトに差し込む制約文を返す。free は空文字。 */
export const targetInstruction = (target, isJa) => (target?.instruction?.[isJa ? 'ja' : 'en'] || '').trim();
