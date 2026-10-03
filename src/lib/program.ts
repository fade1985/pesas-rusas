import type { GetUpRep, Profile, Session, Side, SwingSet } from '../types'

export const SWING_SETS = 10
export const SWING_REPS_PER_SET = 10
export const GETUP_REPS = 10
export const SWING_TIME_LIMIT_SEC = 5 * 60
export const GETUP_TIME_LIMIT_SEC = 10 * 60
export const SWING_INTERVAL_SEC = 30
export const GETUP_INTERVAL_SEC = 60

export const DEFAULT_BELLS = [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]

export const STANDARDS: Record<Profile, Record<Level, { swing: number; getup: number }>> = {
  hombre: { simple: { swing: 32, getup: 32 }, sinister: { swing: 48, getup: 48 } },
  mujer: { simple: { swing: 24, getup: 16 }, sinister: { swing: 32, getup: 24 } },
}

export type Level = 'simple' | 'sinister'
export type Achievement = 'timed' | 'timeless' | null

export const WARMUP = [
  { name: 'Prying goblet squat', reps: '5' },
  { name: 'Halo', reps: '5 por lado' },
  { name: 'Hip bridge', reps: '5' },
]
export const WARMUP_ROUNDS = 3

export function sideForRep(index: number): Side {
  return index % 2 === 0 ? 'L' : 'R'
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function createSession(
  swingWeights: number[] | number,
  getupWeights: number[] | number,
  date: string = todayISO(),
): Session {
  const sw = Array.isArray(swingWeights) ? swingWeights : Array(SWING_SETS).fill(swingWeights)
  const gw = Array.isArray(getupWeights) ? getupWeights : Array(GETUP_REPS).fill(getupWeights)
  return {
    id: newId(),
    date,
    warmup: false,
    swings: Array.from({ length: SWING_SETS }, (_, i): SwingSet => ({ weight: sw[i] ?? sw[sw.length - 1], done: false })),
    getups: Array.from({ length: GETUP_REPS }, (_, i): GetUpRep => ({
      weight: gw[i] ?? gw[gw.length - 1],
      side: sideForRep(i),
      done: false,
    })),
  }
}

export interface SessionStats {
  swingReps: number
  getupReps: number
  swingVolumeKg: number
  getupVolumeKg: number
  avgSwingWeight: number
  avgGetupWeight: number
  minSwingWeight: number
  minGetupWeight: number
  maxSwingWeight: number
  maxGetupWeight: number
  complete: boolean
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

export function sessionStats(s: Session): SessionStats {
  const doneSwings = s.swings.filter((x) => x.done)
  const doneGetups = s.getups.filter((x) => x.done)
  const sw = s.swings.map((x) => x.weight)
  const gw = s.getups.map((x) => x.weight)
  return {
    swingReps: doneSwings.length * SWING_REPS_PER_SET,
    getupReps: doneGetups.length,
    swingVolumeKg: doneSwings.reduce((a, x) => a + x.weight * SWING_REPS_PER_SET, 0),
    getupVolumeKg: doneGetups.reduce((a, x) => a + x.weight, 0),
    avgSwingWeight: avg(sw),
    avgGetupWeight: avg(gw),
    minSwingWeight: sw.length ? Math.min(...sw) : 0,
    minGetupWeight: gw.length ? Math.min(...gw) : 0,
    maxSwingWeight: sw.length ? Math.max(...sw) : 0,
    maxGetupWeight: gw.length ? Math.max(...gw) : 0,
    complete: doneSwings.length === s.swings.length && doneGetups.length === s.getups.length,
  }
}

export function achievement(s: Session, profile: Profile, level: Level): Achievement {
  const std = STANDARDS[profile][level]
  const st = sessionStats(s)
  if (!st.complete || st.minSwingWeight < std.swing || st.minGetupWeight < std.getup) return null
  const timed =
    s.swingTimeSec !== undefined &&
    s.getupTimeSec !== undefined &&
    s.swingTimeSec <= SWING_TIME_LIMIT_SEC &&
    s.getupTimeSec <= GETUP_TIME_LIMIT_SEC
  return timed ? 'timed' : 'timeless'
}

export function sortByDateDesc(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
}

function nextBell(weight: number, bells: number[]): number | null {
  const heavier = [...bells].sort((a, b) => a - b).find((b) => b > weight)
  return heavier ?? null
}

/** Replace the first `count` lightest entries with the next available bell. */
function upgradeLightest(weights: number[], bells: number[], count: number): number[] | null {
  const min = Math.min(...weights)
  const next = nextBell(min, bells)
  if (next === null) return null
  const out = [...weights]
  let changed = 0
  for (let i = 0; i < out.length && changed < count; i++) {
    if (out[i] === min) {
      out[i] = next
      changed++
    }
  }
  return out
}

export interface Suggestion {
  swings: number[]
  getups: number[]
  kind: 'start' | 'repeat' | 'progress' | 'deload'
  message: string
}

export const EASY_RPE = 6
export const HARD_RPE = 9

/**
 * Pavel's guidance: train mostly "easy" and only add weight when sessions feel easy.
 * We step up one swing set (or one get-up pair) once the last two sessions were
 * completed at an easy effort.
 */
export function suggestNext(sessions: Session[], bells: number[], fallback = { swing: 16, getup: 12 }): Suggestion {
  const sorted = sortByDateDesc(sessions)
  const last = sorted[0]
  if (!last) {
    return {
      swings: Array(SWING_SETS).fill(fallback.swing),
      getups: Array(GETUP_REPS).fill(fallback.getup),
      kind: 'start',
      message: 'Primera sesión: elige pesas con las que puedas hacer todo con técnica impecable.',
    }
  }
  const swings = last.swings.map((s) => s.weight)
  const getups = last.getups.map((g) => g.weight)
  const lastStats = sessionStats(last)

  if ((last.rpe ?? 0) >= HARD_RPE || !lastStats.complete) {
    return {
      swings,
      getups,
      kind: 'deload',
      message: lastStats.complete
        ? 'La última sesión fue muy dura. Repite la misma carga (o baja) hasta que se sienta fácil.'
        : 'La última sesión quedó incompleta. Repite la misma carga hasta completarla con buena forma.',
    }
  }

  const recent = sorted.slice(0, 2)
  const easy = recent.length === 2 && recent.every((s) => sessionStats(s).complete && s.rpe !== undefined && s.rpe <= EASY_RPE)
  if (easy) {
    const nextSwings = upgradeLightest(swings, bells, 1)
    const nextGetups = upgradeLightest(getups, bells, 2)
    if (nextSwings || nextGetups) {
      return {
        swings: nextSwings ?? swings,
        getups: nextGetups ?? getups,
        kind: 'progress',
        message: 'Las dos últimas sesiones fueron fáciles: sube una serie de swings y un par de get-ups a la siguiente pesa.',
      }
    }
  }
  return {
    swings,
    getups,
    kind: 'repeat',
    message: 'Repite la carga de la última sesión. Sube cuando dos sesiones seguidas se sientan fáciles (RPE ≤ 6).',
  }
}

export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function summarizeWeights(weights: number[]): string {
  const counts = new Map<number, number>()
  for (const w of weights) counts.set(w, (counts.get(w) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([w, c]) => (counts.size === 1 ? `${w} kg` : `${c}×${w} kg`))
    .join(' + ')
}

export function startOfWeekISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - dow)
  return todayISO(date)
}

export interface GlobalStats {
  totalSessions: number
  sessionsThisWeek: number
  totalSwings: number
  totalGetups: number
  totalKg: number
  weekStreak: number
  bestSwingTimeAtMax: { time: number; weight: number } | null
}

export function globalStats(sessions: Session[], today: string = todayISO()): GlobalStats {
  const thisWeek = startOfWeekISO(today)
  let totalSwings = 0
  let totalGetups = 0
  let totalKg = 0
  let best: GlobalStats['bestSwingTimeAtMax'] = null
  const weeks = new Set<string>()
  for (const s of sessions) {
    const st = sessionStats(s)
    totalSwings += st.swingReps
    totalGetups += st.getupReps
    totalKg += st.swingVolumeKg + st.getupVolumeKg
    weeks.add(startOfWeekISO(s.date))
    if (st.complete && s.swingTimeSec !== undefined) {
      const w = st.minSwingWeight
      if (!best || w > best.weight || (w === best.weight && s.swingTimeSec < best.time)) {
        best = { time: s.swingTimeSec, weight: w }
      }
    }
  }
  let weekStreak = 0
  const [y, m, d] = thisWeek.split('-').map(Number)
  const cursor = new Date(y, m - 1, d)
  if (!weeks.has(thisWeek)) cursor.setDate(cursor.getDate() - 7)
  while (weeks.has(todayISO(cursor))) {
    weekStreak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return {
    totalSessions: sessions.length,
    sessionsThisWeek: sessions.filter((s) => s.date >= thisWeek && s.date <= today).length,
    totalSwings,
    totalGetups,
    totalKg,
    weekStreak,
    bestSwingTimeAtMax: best,
  }
}
