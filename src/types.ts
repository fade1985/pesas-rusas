export type Side = 'L' | 'R'

export interface SwingSet {
  weight: number
  done: boolean
}

export interface GetUpRep {
  weight: number
  side: Side
  done: boolean
}

export interface Session {
  id: string
  /** Local date, YYYY-MM-DD */
  date: string
  warmup: boolean
  swings: SwingSet[]
  getups: GetUpRep[]
  swingTimeSec?: number
  getupTimeSec?: number
  /** Rate of perceived exertion, 1-10 */
  rpe?: number
  notes?: string
}

export interface TimerState {
  accumulatedMs: number
  runningSince: number | null
}

export interface Draft {
  session: Session
  swingTimer: TimerState
  getupTimer: TimerState
}

export type Profile = 'hombre' | 'mujer'

export interface Settings {
  profile: Profile
  bells: number[]
  intervalBeeps: boolean
}

export interface AppData {
  version: 1
  sessions: Session[]
  settings: Settings
  draft: Draft | null
}
