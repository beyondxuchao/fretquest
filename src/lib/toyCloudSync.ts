import type { PracticeProfile } from './practiceProfile'
import type { PositionStats, Preferences } from '../types'

const META_KEY = 'fretseek-sync-meta'
const CHUNK_PREFIX = 'fretseek-sync-'
const LOCAL_SYNC_AT_KEY = 'fretquest.cloudSyncAt.v1'
const CHUNK_BYTE_LIMIT = 900
const MAX_CHUNKS = 127

export type CloudSnapshot = {
  updatedAt: number
  preferences: Preferences
  positionStats: PositionStats
  practiceProfile: PracticeProfile
  archive?: CloudLearningArchive
}

export type CloudLearningArchive = {
  version: 2
  bestDailyScore: number
  totalDailySessions: number
  totalPracticeSessions: number
  assessedPositions: number
  averageMastery: number | null
  weakestSkills: Array<{ type: string; weakness: number }>
  recentWeaknessTrend: Array<{ completedAt: number; score: number; accuracy: number; weakest: string }>
  preferenceSummary: { fretRange: string; activeStrings: number[]; noteNotation: Preferences['noteNotation']; fretboardStyle: Preferences['fretboardStyle'] }
}

export function getLocalSyncAt() {
  return Number(localStorage.getItem(LOCAL_SYNC_AT_KEY) || 0)
}

function setLocalSyncAt(time: number) {
  try { localStorage.setItem(LOCAL_SYNC_AT_KEY, String(time)) } catch {}
}

async function retryCloud<T>(operation: () => Promise<T>) {
  try { return await operation() } catch {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    return operation()
  }
}

async function canUseCloudStorage() {
  const toy = window.toy
  if (!toy?.isSupport || !toy.getCloudStorage || !toy.setCloudStorage) return false
  try {
    return Boolean(await toy.isSupport('getCloudStorage')) && Boolean(await toy.isSupport('setCloudStorage'))
  } catch {
    return false
  }
}

function splitPayload(value: string) {
  const chunks: string[] = []
  const encoder = new TextEncoder()
  let chunk = ''
  let chunkBytes = 0
  for (const character of value) {
    const bytes = encoder.encode(character).length
    if (chunk && chunkBytes + bytes > CHUNK_BYTE_LIMIT) {
      chunks.push(chunk)
      chunk = ''
      chunkBytes = 0
    }
    chunk += character
    chunkBytes += bytes
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function positionMastery(stat: PositionStats[string]) {
  const total = stat.correct + stat.wrong
  return stat.mastery ?? (total ? Math.round(stat.correct / total * 100) : null)
}

function buildArchive(snapshot: Omit<CloudSnapshot, 'updatedAt' | 'archive'>): CloudLearningArchive {
  const dailySessions = snapshot.practiceProfile.history.filter((session) => session.kind === 'daily')
  const assessed = Object.values(snapshot.positionStats).filter((stat) => stat.correct + stat.wrong > 0)
  const averageMastery = assessed.length ? Math.round(assessed.reduce((sum, stat) => sum + (positionMastery(stat) ?? 0), 0) / assessed.length) : null
  const weaknessEntries = Object.entries(snapshot.practiceProfile.weakness)
    .map(([type, weakness]) => ({ type, weakness: Math.round((weakness ?? 0) * 100) / 100 }))
    .sort((a, b) => b.weakness - a.weakness)
  return {
    version: 2,
    bestDailyScore: dailySessions.reduce((best, session) => Math.max(best, session.score), 0),
    totalDailySessions: dailySessions.length,
    totalPracticeSessions: snapshot.practiceProfile.history.length,
    assessedPositions: assessed.length,
    averageMastery,
    weakestSkills: weaknessEntries.slice(0, 5),
    recentWeaknessTrend: snapshot.practiceProfile.history.slice(0, 12).map((session) => ({
      completedAt: session.completedAt,
      score: session.score,
      accuracy: session.accuracy,
      weakest: session.stages.slice().sort((a, b) => a.accuracy - b.accuracy)[0]?.type || 'unknown',
    })),
    preferenceSummary: {
      fretRange: `${snapshot.preferences.minFret}-${snapshot.preferences.maxFret}`,
      activeStrings: snapshot.preferences.activeStrings.map((on, index) => on ? index + 1 : 0).filter(Boolean),
      noteNotation: snapshot.preferences.noteNotation,
      fretboardStyle: snapshot.preferences.fretboardStyle,
    },
  }
}

export async function loadCloudSnapshot() {
  if (!(await canUseCloudStorage())) return null
  const toy = window.toy!
  const metaRaw = (await retryCloud(() => toy.getCloudStorage!([META_KEY])))[META_KEY]
  if (!metaRaw) return null
  let meta: { chunks: number; updatedAt: number }
  try { meta = JSON.parse(metaRaw) as { chunks: number; updatedAt: number } } catch { return null }
  if (!Number.isInteger(meta.chunks) || meta.chunks < 1 || meta.chunks > MAX_CHUNKS) return null
  const keys = Array.from({ length: meta.chunks }, (_, index) => `${CHUNK_PREFIX}${index}`)
  const values = await retryCloud(() => toy.getCloudStorage!(keys))
  if (keys.some((key) => typeof values[key] !== 'string')) return null
  const payload = keys.map((key) => values[key]).join('')
  try {
    const snapshot = JSON.parse(payload) as CloudSnapshot
    if (!snapshot?.updatedAt || !snapshot.preferences || !snapshot.positionStats || !snapshot.practiceProfile) return null
    return snapshot
  } catch { return null }
}

export async function saveCloudSnapshot(snapshot: Omit<CloudSnapshot, 'updatedAt'>) {
  if (!(await canUseCloudStorage())) return false
  const toy = window.toy!
  const cloudSnapshot: CloudSnapshot = { ...snapshot, archive: buildArchive(snapshot), updatedAt: Date.now() }
  const chunks = splitPayload(JSON.stringify(cloudSnapshot))
  if (chunks.length > MAX_CHUNKS) throw new Error('Cloud snapshot exceeds storage capacity')
  const items: Record<string, string> = {}
  chunks.forEach((chunk, index) => { items[`${CHUNK_PREFIX}${index}`] = chunk })
  items[META_KEY] = JSON.stringify({ chunks: chunks.length, updatedAt: cloudSnapshot.updatedAt })
  await retryCloud(() => toy.setCloudStorage!(items))
  setLocalSyncAt(cloudSnapshot.updatedAt)
  return true
}

export async function clearCloudSnapshot() {
  if (!(await canUseCloudStorage())) return false
  const toy = window.toy!
  const all = await toy.getCloudStorage!()
  const keys = Object.keys(all).filter((key) => key === META_KEY || key.startsWith(CHUNK_PREFIX))
  if (keys.length) await toy.removeCloudStorage?.(keys)
  setLocalSyncAt(0)
  return true
}
