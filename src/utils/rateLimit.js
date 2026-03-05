// 24時間あたりの利用回数制限（localStorageベース）
const STORAGE_KEY = 'wa-usage-log';
const LIMIT = 50;
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

/** 残り利用可能回数を返す */
export function getRemaining() {
  return Math.max(0, LIMIT - pruneLog().length);
}

/** 制限内かチェック。trueなら利用OK */
export function canUse() {
  return pruneLog().length < LIMIT;
}

/** 利用を記録する（APIコール成功時に呼ぶ） */
export function recordUsage() {
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
