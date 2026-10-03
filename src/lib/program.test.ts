import { describe, expect, it } from 'vitest'
import {
  achievement,
  createSession,
  globalStats,
  sessionStats,
  startOfWeekISO,
  suggestNext,
  summarizeWeights,
} from './program'
import type { Session } from '../types'
import { pauseTimer, startTimer, timerElapsedMs } from './storage'

function completed(swing: number, getup: number, date: string, extra: Partial<Session> = {}): Session {
  const s = createSession(swing, getup, date)
  s.swings.forEach((x) => (x.done = true))
  s.getups.forEach((x) => (x.done = true))
  return { ...s, ...extra }
}

const bells = [16, 20, 24, 28, 32]

describe('createSession', () => {
  it('creates 10 swing sets and 10 alternating get-ups', () => {
    const s = createSession(24, 16, '2026-01-01')
    expect(s.swings).toHaveLength(10)
    expect(s.getups.map((g) => g.side).join('')).toBe('LRLRLRLRLR')
  })
})

describe('sessionStats', () => {
  it('computes reps and volume', () => {
    const st = sessionStats(completed(24, 16, '2026-01-01'))
    expect(st.swingReps).toBe(100)
    expect(st.getupReps).toBe(10)
    expect(st.swingVolumeKg).toBe(2400)
    expect(st.getupVolumeKg).toBe(160)
    expect(st.complete).toBe(true)
  })
})

describe('achievement', () => {
  it('detects timed Simple for men', () => {
    const s = completed(32, 32, '2026-01-01', { swingTimeSec: 290, getupTimeSec: 590 })
    expect(achievement(s, 'hombre', 'simple')).toBe('timed')
    expect(achievement(s, 'hombre', 'sinister')).toBeNull()
  })
  it('is timeless when over the time limit', () => {
    const s = completed(32, 32, '2026-01-01', { swingTimeSec: 400, getupTimeSec: 590 })
    expect(achievement(s, 'hombre', 'simple')).toBe('timeless')
  })
  it('uses women standards', () => {
    const s = completed(24, 16, '2026-01-01', { swingTimeSec: 300, getupTimeSec: 600 })
    expect(achievement(s, 'mujer', 'simple')).toBe('timed')
  })
})

describe('suggestNext', () => {
  it('progresses one swing set and one get-up pair after two easy sessions', () => {
    const sessions = [completed(24, 16, '2026-01-01', { rpe: 5 }), completed(24, 16, '2026-01-02', { rpe: 6 })]
    const sug = suggestNext(sessions, bells)
    expect(sug.kind).toBe('progress')
    expect(sug.swings.filter((w) => w === 28)).toHaveLength(1)
    expect(sug.getups.filter((w) => w === 20)).toHaveLength(2)
    expect(sug.getups[0]).toBe(20)
    expect(sug.getups[1]).toBe(20)
  })
  it('repeats when effort was moderate', () => {
    const sessions = [completed(24, 16, '2026-01-01', { rpe: 5 }), completed(24, 16, '2026-01-02', { rpe: 7 })]
    expect(suggestNext(sessions, bells).kind).toBe('repeat')
  })
  it('deloads after a very hard session', () => {
    expect(suggestNext([completed(24, 16, '2026-01-02', { rpe: 9 })], bells).kind).toBe('deload')
  })
})

describe('helpers', () => {
  it('summarizes mixed weights', () => {
    expect(summarizeWeights([24, 24, 28])).toBe('2×24 kg + 1×28 kg')
    expect(summarizeWeights([24, 24])).toBe('24 kg')
  })
  it('finds monday of week', () => {
    expect(startOfWeekISO('2026-10-03')).toBe('2026-09-28')
    expect(startOfWeekISO('2026-09-28')).toBe('2026-09-28')
  })
  it('computes week streak', () => {
    const sessions = [completed(24, 16, '2026-09-14'), completed(24, 16, '2026-09-22'), completed(24, 16, '2026-09-29'), completed(24, 16, '2026-10-02')]
    const st = globalStats(sessions, '2026-10-03')
    expect(st.weekStreak).toBe(3)
    expect(st.sessionsThisWeek).toBe(2)
  })
  it('tracks timer elapsed across pause', () => {
    let t = startTimer({ accumulatedMs: 0, runningSince: null }, 1000)
    t = pauseTimer(t, 4000)
    expect(timerElapsedMs(t, 9999)).toBe(3000)
    t = startTimer(t, 10000)
    expect(timerElapsedMs(t, 11000)).toBe(4000)
  })
})
