import type { PositionStats, Preferences } from '../types'

export const PREFERENCES_KEY = 'fretquest.preferences.v1'
export const POSITION_STATS_KEY = 'fretquest.positionStats.v1'

export function loadJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
}

export function loadPreferences(): Partial<Preferences> {
  return loadJson<Partial<Preferences>>(PREFERENCES_KEY, {})
}

export function loadPositionStats(): PositionStats {
  return loadJson<PositionStats>(POSITION_STATS_KEY, {})
}

export function clearLearningData(): void {
  localStorage.removeItem(PREFERENCES_KEY)
  localStorage.removeItem(POSITION_STATS_KEY)
}
