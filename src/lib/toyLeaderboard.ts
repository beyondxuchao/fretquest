import type { PracticeSession } from './practiceProfile'

export const SCORE_BOARD = 1
export const CHECKIN_BOARD = 2

export type ToyRankPeriod = 'all' | 'month' | 'week' | 'day'
export type ToyRankItem = { rank: number; score: number; nickname: string; avatar?: string }
export type ToyMyRank = { ranked: boolean; rank: number; score: number }
export type ToyUserProfile = { avatar: string; nickname: string; toyOpenId?: string }
export type ToyAuthorRelation = Record<string, unknown>

type ToySdk = {
  isSupport?: (ability: string) => Promise<boolean>
  submitScore?: (req: { board?: number; score: number }) => Promise<{ score: number }>
  getRankList?: (req?: { board?: number; period?: ToyRankPeriod; limit?: number }) => Promise<ToyRankItem[]>
  getMyRank?: (req?: { board?: number; period?: ToyRankPeriod }) => Promise<ToyMyRank>
  getUserProfile?: () => Promise<ToyUserProfile>
  getAuthorRelation?: () => Promise<ToyAuthorRelation>
  saveImageToAlbum?: (req: { url?: string; base64Data?: string; hintMsg?: string }) => Promise<{ localPath: string }>
  setCloudStorage?: (items: Record<string, string>) => Promise<void>
  getCloudStorage?: (keys?: string[]) => Promise<Record<string, string>>
  removeCloudStorage?: (keys: string[]) => Promise<void>
}

declare global {
  interface Window {
    toy?: ToySdk
  }
}

export function normalizeToyAvatar(url?: string) {
  if (!url) return ''
  return url.startsWith('//') ? `https:${url}` : url
}

function dayKey(time: number) {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function currentDailyStreak(sessions: PracticeSession[]) {
  const days = new Set(sessions.filter((session) => session.kind === 'daily').map((session) => dayKey(session.completedAt)))
  let streak = 0
  const cursor = new Date()
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function canUseToyRank() {
  const toy = window.toy
  if (!toy?.isSupport) return false
  try {
    return Boolean(await toy.isSupport('submitScore')) && Boolean(await toy.isSupport('getRankList'))
  } catch {
    return false
  }
}

export async function getToyUserProfile() {
  const toy = window.toy
  if (!toy?.isSupport || !toy.getUserProfile) return null
  try {
    if (!await toy.isSupport('getUserProfile')) return null
    return toy.getUserProfile()
  } catch {
    return null
  }
}

export function isFollowingAuthor(relation: ToyAuthorRelation | null) {
  if (!relation) return false
  let payload: ToyAuthorRelation = relation
  for (let depth = 0; depth < 4; depth++) {
    const direct = payload.following ?? payload.isFollowing ?? payload.followed ?? payload.isFollowed ?? payload.is_following ?? payload.is_followed
    if (typeof direct === 'boolean') return direct
    if (typeof direct === 'number') return direct > 0
    if (typeof direct === 'string') return ['true', 'follow', 'following', 'followed', '1', '2'].includes(direct.toLowerCase())
    const relationValue = payload.relation ?? payload.attribute ?? payload.followType
    if (typeof relationValue === 'number') return relationValue > 0
    if (typeof relationValue === 'string') return ['follow', 'following', 'followed', '1', '2'].includes(relationValue.toLowerCase())
    const nested = payload.data ?? payload.result
    if (!nested || typeof nested !== 'object') break
    payload = nested as ToyAuthorRelation
  }
  return false
}

export async function getToyAuthorRelation() {
  const toy = window.toy
  if (!toy?.isSupport || !toy.getAuthorRelation) return null
  try {
    if (!await toy.isSupport('getAuthorRelation')) return null
    return toy.getAuthorRelation()
  } catch {
    return null
  }
}

export async function submitDailyRank(session: PracticeSession, history: PracticeSession[]) {
  const toy = window.toy
  if (session.kind !== 'daily' || !toy?.submitScore || !(await canUseToyRank())) return false
  await toy.submitScore({ board: SCORE_BOARD, score: session.score })
  await toy.submitScore({ board: CHECKIN_BOARD, score: currentDailyStreak([session, ...history]) })
  return true
}

export async function getToyRankList(board: number, period: ToyRankPeriod, limit = 50) {
  const toy = window.toy
  if (!toy?.getRankList || !(await canUseToyRank())) return null
  return toy.getRankList({ board, period, limit })
}

export async function getToyMyRank(board: number, period: ToyRankPeriod) {
  const toy = window.toy
  if (!toy?.getMyRank || !(await canUseToyRank())) return null
  return toy.getMyRank({ board, period })
}
