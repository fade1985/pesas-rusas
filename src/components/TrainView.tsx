import { useMemo, useState } from 'react'
import type { AppData, Draft, Session, TimerState } from '../types'
import {
  achievement,
  createSession,
  formatTime,
  GETUP_INTERVAL_SEC,
  GETUP_TIME_LIMIT_SEC,
  STANDARDS,
  suggestNext,
  summarizeWeights,
  SWING_INTERVAL_SEC,
  SWING_TIME_LIMIT_SEC,
} from '../lib/program'
import { pauseTimer, STOPPED_TIMER, timerElapsedMs } from '../lib/storage'
import { useWakeLock } from '../hooks/useAppData'
import { SessionForm } from './SessionForm'
import { Timer } from './Timer'
import { WeightGroupsInput } from './WeightInput'

interface Props {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  onLogPast: () => void
}

const KIND_LABEL = { start: 'Empezar', repeat: 'Repetir', progress: 'Progresar', deload: 'Consolidar' }

export function TrainView({ data, update, onLogPast }: Props) {
  const { settings, draft } = data
  const suggestion = useMemo(() => {
    const std = STANDARDS[settings.profile].simple
    const lightest = settings.bells[0] ?? 16
    const fallbackSwing = settings.bells.filter((b) => b <= std.swing - 8).pop() ?? lightest
    const fallbackGetup = settings.bells.filter((b) => b <= std.getup - 12).pop() ?? lightest
    return suggestNext(data.sessions, settings.bells, { swing: fallbackSwing, getup: fallbackGetup })
  }, [data.sessions, settings])

  const [message, setMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState<{ swings: number[]; getups: number[] } | null>(null)
  const planned = plan ?? { swings: suggestion.swings, getups: suggestion.getups }
  const edited =
    plan !== null &&
    (plan.swings.join() !== suggestion.swings.join() || plan.getups.join() !== suggestion.getups.join())

  const running = !!draft && (draft.swingTimer.runningSince !== null || draft.getupTimer.runningSince !== null)
  useWakeLock(running)

  const setDraft = (fn: (d: Draft) => Draft) => update((d) => (d.draft ? { ...d, draft: fn(d.draft) } : d))

  const start = () => {
    setMessage(null)
    setPlan(null)
    update((d) => ({
      ...d,
      draft: {
        session: createSession(planned.swings, planned.getups),
        swingTimer: STOPPED_TIMER,
        getupTimer: STOPPED_TIMER,
      },
    }))
  }

  const onSessionChange = (next: Session) =>
    setDraft((d) => {
      let { swingTimer, getupTimer } = d
      const session = { ...next }
      const allSwings = next.swings.every((s) => s.done)
      const allGetups = next.getups.every((g) => g.done)
      if (allSwings && !d.session.swings.every((s) => s.done) && swingTimer.runningSince !== null) {
        swingTimer = pauseTimer(swingTimer)
        session.swingTimeSec = Math.round(swingTimer.accumulatedMs / 1000)
      }
      if (allGetups && !d.session.getups.every((g) => g.done) && getupTimer.runningSince !== null) {
        getupTimer = pauseTimer(getupTimer)
        session.getupTimeSec = Math.round(getupTimer.accumulatedMs / 1000)
      }
      return { session, swingTimer, getupTimer }
    })

  const save = () => {
    if (!draft) return
    const s = { ...draft.session }
    const swingMs = timerElapsedMs(draft.swingTimer)
    const getupMs = timerElapsedMs(draft.getupTimer)
    if (s.swingTimeSec === undefined && swingMs > 0) s.swingTimeSec = Math.round(swingMs / 1000)
    if (s.getupTimeSec === undefined && getupMs > 0) s.getupTimeSec = Math.round(getupMs / 1000)
    if (!s.notes?.trim()) delete s.notes
    update((d) => ({ ...d, sessions: [...d.sessions, s], draft: null }))
    const lvl = (['sinister', 'simple'] as const).find((l) => achievement(s, settings.profile, l))
    setMessage(
      lvl
        ? `¡Sesión guardada! Cumpliste el estándar ${lvl === 'simple' ? 'Simple' : 'Sinister'}${achievement(s, settings.profile, lvl) === 'timed' ? ' con tiempo' : ' (sin tiempo)'}.`
        : 'Sesión guardada. ¡Buen trabajo!',
    )
  }

  const discard = () => {
    if (confirm('¿Descartar la sesión en curso?')) update((d) => ({ ...d, draft: null }))
  }

  if (!draft) {
    return (
      <div className="view">
        {message && <div className="toast">{message}</div>}
        <section className="card hero">
          <span className={`tag tag-${suggestion.kind}`}>{KIND_LABEL[suggestion.kind]}</span>
          <h2>Sesión de hoy</h2>
          <div className="hero-grid">
            <div>
              <div className="muted small">100 swings</div>
              <WeightGroupsInput
                label="Swings"
                weights={planned.swings}
                onChange={(swings) => setPlan({ ...planned, swings })}
              />
            </div>
            <div>
              <div className="muted small">10 get-ups</div>
              <WeightGroupsInput
                label="Get-ups"
                weights={planned.getups}
                onChange={(getups) => setPlan({ ...planned, getups })}
              />
            </div>
          </div>
          <p className="muted">{suggestion.message}</p>
          {edited && (
            <p className="small">
              Peso modificado (sugerido: swings {summarizeWeights(suggestion.swings)}, get-ups{' '}
              {summarizeWeights(suggestion.getups)}).{' '}
              <button className="link inline" onClick={() => setPlan(null)}>
                Volver a la sugerencia
              </button>
            </p>
          )}
          <button className="btn primary block" onClick={start}>
            Empezar entrenamiento
          </button>
          <button className="btn ghost block" onClick={onLogPast}>
            Registrar una sesión pasada
          </button>
        </section>
        <section className="card">
          <h3>El programa</h3>
          <ol className="program-steps">
            <li>
              <strong>Calentamiento:</strong> 3 rondas de prying goblet squat, halo y hip bridge.
            </li>
            <li>
              <strong>Swings:</strong> 10 series de 10 swings a una mano (alterna manos cada serie). Objetivo:{' '}
              {formatTime(SWING_TIME_LIMIT_SEC)}.
            </li>
            <li>Descansa 1 minuto.</li>
            <li>
              <strong>Get-ups:</strong> 10 reps alternando lados, una por minuto. Objetivo: {formatTime(GETUP_TIME_LIMIT_SEC)}.
            </li>
          </ol>
        </section>
      </div>
    )
  }

  const setTimer = (key: 'swingTimer' | 'getupTimer') => (t: TimerState) => setDraft((d) => ({ ...d, [key]: t }))

  return (
    <div className="view">
      <SessionForm
        live
        session={draft.session}
        bells={settings.bells}
        onChange={onSessionChange}
        swingTimer={
          <Timer
            timer={draft.swingTimer}
            limitSec={SWING_TIME_LIMIT_SEC}
            intervalSec={SWING_INTERVAL_SEC}
            beeps={settings.intervalBeeps}
            onChange={setTimer('swingTimer')}
          />
        }
        getupTimer={
          <Timer
            timer={draft.getupTimer}
            limitSec={GETUP_TIME_LIMIT_SEC}
            intervalSec={GETUP_INTERVAL_SEC}
            beeps={settings.intervalBeeps}
            onChange={setTimer('getupTimer')}
          />
        }
      />
      <div className="actions sticky">
        <button className="btn ghost" onClick={discard}>
          Descartar
        </button>
        <button className="btn primary" onClick={save}>
          Guardar sesión
        </button>
      </div>
    </div>
  )
}
