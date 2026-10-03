import { useEffect, useRef } from 'react'
import type { TimerState } from '../types'
import { formatTime } from '../lib/program'
import { pauseTimer, startTimer, STOPPED_TIMER, timerElapsedMs } from '../lib/storage'
import { beep } from '../lib/beep'
import { useNow } from '../hooks/useAppData'

interface Props {
  timer: TimerState
  limitSec: number
  intervalSec: number
  beeps: boolean
  onChange: (t: TimerState) => void
}

export function Timer({ timer, limitSec, intervalSec, beeps, onChange }: Props) {
  const running = timer.runningSince !== null
  const now = useNow(running)
  const elapsedSec = timerElapsedMs(timer, now) / 1000
  const intervalIndex = Math.floor(elapsedSec / intervalSec)
  const lastInterval = useRef(intervalIndex)

  useEffect(() => {
    if (running && beeps && intervalIndex > lastInterval.current) {
      beep(elapsedSec >= limitSec ? 440 : 880)
    }
    lastInterval.current = intervalIndex
  }, [intervalIndex, running, beeps, elapsedSec, limitSec])

  const intoInterval = elapsedSec - intervalIndex * intervalSec
  const over = elapsedSec > limitSec
  const pct = Math.min(100, (elapsedSec / limitSec) * 100)

  return (
    <div className={`timer ${over ? 'over' : ''}`}>
      <div className="timer-main">
        <div>
          <div className="timer-value">{formatTime(elapsedSec)}</div>
          <div className="timer-sub">
            objetivo {formatTime(limitSec)} · intervalo {formatTime(intervalSec - intoInterval)}
          </div>
        </div>
        <div className="timer-buttons">
          {running ? (
            <button className="btn" onClick={() => onChange(pauseTimer(timer))}>
              Pausa
            </button>
          ) : (
            <button className="btn primary" onClick={() => {
              if (beeps) beep(660, 80)
              onChange(startTimer(timer))
            }}>
              {timer.accumulatedMs > 0 ? 'Seguir' : 'Iniciar'}
            </button>
          )}
          {timer.accumulatedMs > 0 && !running && (
            <button className="btn ghost" onClick={() => onChange(STOPPED_TIMER)}>
              Reiniciar
            </button>
          )}
        </div>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
