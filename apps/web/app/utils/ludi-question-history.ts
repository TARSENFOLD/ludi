import type { LudiView } from '@doot-games/games/ludi/contracts'
const KEY = 'ludi:official-questions:v1'
export const QUESTION_HISTORY_TTL = 30 * 24 * 60 * 60 * 1000
const official = /^en-(choice|story|social)-\d{3}$/
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
function browserStorage(): StorageLike | undefined { try { return typeof window === 'undefined' ? undefined : window.localStorage } catch { return undefined } }
function read(storage: StorageLike | undefined, now: number): Array<[string, number]> {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? 'null')
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return []
    return parsed.entries.filter((v: unknown): v is [string, number] => Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && official.test(v[0]) && typeof v[1] === 'number' && Number.isFinite(v[1]) && v[1] <= now && v[1] > now - QUESTION_HISTORY_TTL).slice(-200)
  } catch { return [] }
}
export function seenQuestionIds(storage = browserStorage(), now = Date.now()): string[] {
  const entries = read(storage, now)
  try { if (entries.length) storage?.setItem(KEY, JSON.stringify({ version: 1, entries })); else storage?.removeItem(KEY) } catch { /* Storage may be unavailable; the game still works. */ }
  return [...new Set(entries.map(([id]) => id))]
}
export function rememberQuestion(view: LudiView, storage = browserStorage(), now = Date.now()) {
  const content = view.content
  const id = content && 'officialId' in content ? content.officialId : undefined
  if (view.phase !== 'active' || !id || !official.test(id)) return
  const entries = new Map(read(storage, now)); entries.delete(id); entries.set(id, now)
  try { storage?.setItem(KEY, JSON.stringify({ version: 1, entries: [...entries].slice(-200) })) } catch { /* Best effort only. */ }
}
export function clearQuestionHistory(storage = browserStorage()) { try { storage?.removeItem(KEY) } catch { /* No durable storage available. */ } }
