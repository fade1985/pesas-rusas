import type { AppData, Settings, TimerState } from '../types'

export const STORAGE_KEY = 'simple-sinister-tracker:v1'

export const DEFAULT_SETTINGS: Settings = {
  profile: 'hombre',
  bells: [16, 20, 24, 28, 32],
  intervalBeeps: true,
}

export function emptyData(): AppData {
  return { version: 1, sessions: [], settings: { ...DEFAULT_SETTINGS }, draft: null }
}

export function parseData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Formato inválido')
  const obj = raw as Partial<AppData>
  if (!Array.isArray(obj.sessions)) throw new Error('Faltan las sesiones')
  const settings = { ...DEFAULT_SETTINGS, ...obj.settings }
  if (!Array.isArray(settings.bells) || settings.bells.length === 0) settings.bells = [...DEFAULT_SETTINGS.bells]
  settings.bells = [...new Set(settings.bells.map(Number).filter((n) => n > 0))].sort((a, b) => a - b)
  return { version: 1, sessions: obj.sessions, settings, draft: obj.draft ?? null }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseData(JSON.parse(raw)) : emptyData()
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function timerElapsedMs(t: TimerState, now = Date.now()): number {
  return t.accumulatedMs + (t.runningSince !== null ? now - t.runningSince : 0)
}

export function startTimer(t: TimerState, now = Date.now()): TimerState {
  return t.runningSince !== null ? t : { ...t, runningSince: now }
}

export function pauseTimer(t: TimerState, now = Date.now()): TimerState {
  return t.runningSince === null ? t : { accumulatedMs: timerElapsedMs(t, now), runningSince: null }
}

export const STOPPED_TIMER: TimerState = { accumulatedMs: 0, runningSince: null }
