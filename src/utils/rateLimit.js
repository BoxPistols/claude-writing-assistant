// 24時間あたりの利用回数制限（localStorageベース）
// サーバー提供のデフォルトAPIキー使用時のみ適用。ユーザーが自分のキーを設定済みなら無制限。
const STORAGE_KEY = 'wa-usage-log';
const LIMIT = 100;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24時間

function getLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveLog(log) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
}

// 期限切れエントリを除去して現在の有効ログを返す
function pruneLog() {
  const cutoff = Date.now() - WINDOW_MS;
  const log = getLog().filter((ts) => ts > cutoff);
  saveLog(log);
  return log;
}

/** ユーザーが自分のAPIキーを設定しているか判定 */
function hasUserKeys() {
  try {
    const keys = JSON.parse(localStorage.getItem('wa-keys') || '{}');
    return Object.values(keys).some((v) => !!v);
  } catch { return false; }
}

/** 残り利用可能回数を返す（自前キーなら Infinity） */
export function getRemaining() {
  if (hasUserKeys()) return Infinity;
  return Math.max(0, LIMIT - pruneLog().length);
}

/** 制限内かチェック。trueなら利用OK */
export function canUse() {
  if (hasUserKeys()) return true;
  return pruneLog().length < LIMIT;
}

/** 利用を記録する（APIコール成功時に呼ぶ） */
export function recordUsage() {
  if (hasUserKeys()) return; // 自前キーなら記録不要
  const log = pruneLog();
  log.push(Date.now());
  saveLog(log);
}

/** 次にリセットされる時刻（最古のエントリ + 24h）をミリ秒で返す */
export function getResetTime() {
  const log = pruneLog();
  if (log.length === 0) return null;
  return log[0] + WINDOW_MS;
}

export const RATE_LIMIT = LIMIT;
export { hasUserKeys };
