import { useState, type ReactNode } from 'react'
import type { Session } from '../types'
import { formatTime, summarizeWeights, SWING_REPS_PER_SET, WARMUP, WARMUP_ROUNDS } from '../lib/program'

interface Props {
  session: Session
  bells: number[]
  onChange: (s: Session) => void
  live?: boolean
  swingTimer?: ReactNode
  getupTimer?: ReactNode
}

const RPE_LABELS = [
  '',
  'Nada',
  'Muy, muy fácil',
  'Muy fácil',
  'Fácil',
  'Fácil',
  'Fácil, pero se nota',
  'Moderado',
  'Duro',
  'Muy duro',
  'Máximo',
]

function parseTime(v: string): number | undefined {
  const t = v.trim()
  if (!t) return undefined
  const m = t.match(/^(\d+)(?::(\d{1,2}))?$/)
  if (!m) return undefined
  return m[2] === undefined ? Number(m[1]) * 60 : Number(m[1]) * 60 + Number(m[2])
}

function TimeInput({ label, value, onChange }: { label: string; value?: number; onChange: (v?: number) => void }) {
  const [text, setText] = useState(value !== undefined ? formatTime(value) : '')
  return (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        placeholder="m:ss"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const parsed = parseTime(text)
          onChange(parsed)
          setText(parsed !== undefined ? formatTime(parsed) : '')
        }}
      />
    </label>
  )
}

function WeightSelect({ value, bells, onChange }: { value: number; bells: number[]; onChange: (v: number) => void }) {
  const options = bells.includes(value) ? bells : [...bells, value].sort((a, b) => a - b)
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((b) => (
        <option key={b} value={b}>
          {b} kg
        </option>
      ))}
    </select>
  )
}

export function SessionForm({ session, bells, onChange, live = false, swingTimer, getupTimer }: Props) {
  const [editSwingWeights, setEditSwingWeights] = useState(false)
  const [editGetupWeights, setEditGetupWeights] = useState(false)
  const [showWarmup, setShowWarmup] = useState(live && !session.warmup)

  const swingsDone = session.swings.filter((s) => s.done).length
  const getupsDone = session.getups.filter((g) => g.done).length

  const setSwing = (i: number, patch: Partial<Session['swings'][number]>) =>
    onChange({ ...session, swings: session.swings.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const setGetup = (i: number, patch: Partial<Session['getups'][number]>) =>
    onChange({ ...session, getups: session.getups.map((g, j) => (j === i ? { ...g, ...patch } : g)) })

  return (
    <div className="session-form">
      {!live && (
        <label className="field">
          <span>Fecha</span>
          <input type="date" value={session.date} onChange={(e) => e.target.value && onChange({ ...session, date: e.target.value })} />
        </label>
      )}

      <section className="card">
        <div className="card-head" onClick={() => setShowWarmup((v) => !v)} role="button">
          <h3>
            <input
              type="checkbox"
              checked={session.warmup}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onChange({ ...session, warmup: e.target.checked })}
            />{' '}
            Calentamiento
          </h3>
          <span className="muted">{showWarmup ? 'ocultar' : 'ver'}</span>
        </div>
        {showWarmup && (
          <div className="warmup">
            <p className="muted">{WARMUP_ROUNDS} rondas de:</p>
            <ul>
              {WARMUP.map((w) => (
                <li key={w.name}>
                  <strong>{w.name}</strong> × {w.reps}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Swings a una mano</h3>
          <span className="pill">
            {swingsDone * SWING_REPS_PER_SET}/{session.swings.length * SWING_REPS_PER_SET}
          </span>
        </div>
        <p className="muted small">10 series de 10, alternando manos. {summarizeWeights(session.swings.map((s) => s.weight))}</p>
        {swingTimer}
        <div className="set-grid">
          {session.swings.map((s, i) => (
            <button
              key={i}
              className={`set-btn ${s.done ? 'done' : ''}`}
              onClick={() => setSwing(i, { done: !s.done })}
              aria-pressed={s.done}
            >
              <span className="set-num">{i + 1}</span>
              <span className="set-weight">{s.weight}</span>
              <span className="set-hand">{i % 2 === 0 ? 'Izq' : 'Der'}</span>
            </button>
          ))}
        </div>
        <button className="link" onClick={() => setEditSwingWeights((v) => !v)}>
          {editSwingWeights ? 'Listo' : 'Cambiar pesas'}
        </button>
        {editSwingWeights && (
          <WeightEditor
            weights={session.swings.map((s) => s.weight)}
            bells={bells}
            labelFor={(i) => `Serie ${i + 1}`}
            onSet={(i, w) => setSwing(i, { weight: w })}
            onSetAll={(w) => onChange({ ...session, swings: session.swings.map((s) => ({ ...s, weight: w })) })}
          />
        )}
        {!live && (
          <TimeInput label="Tiempo swings" value={session.swingTimeSec} onChange={(v) => onChange({ ...session, swingTimeSec: v })} />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Turkish get-ups</h3>
          <span className="pill">
            {getupsDone}/{session.getups.length}
          </span>
        </div>
        <p className="muted small">10 reps alternando lados (1 por minuto). {summarizeWeights(session.getups.map((g) => g.weight))}</p>
        {getupTimer}
        <div className="set-grid">
          {session.getups.map((g, i) => (
            <button
              key={i}
              className={`set-btn ${g.done ? 'done' : ''}`}
              onClick={() => setGetup(i, { done: !g.done })}
              aria-pressed={g.done}
            >
              <span className="set-num">{i + 1}</span>
              <span className="set-weight">{g.weight}</span>
              <span className="set-hand">{g.side === 'L' ? 'Izq' : 'Der'}</span>
            </button>
          ))}
        </div>
        <button className="link" onClick={() => setEditGetupWeights((v) => !v)}>
          {editGetupWeights ? 'Listo' : 'Cambiar pesas'}
        </button>
        {editGetupWeights && (
          <WeightEditor
            weights={session.getups.map((g) => g.weight)}
            bells={bells}
            labelFor={(i) => `Rep ${i + 1} (${session.getups[i].side === 'L' ? 'Izq' : 'Der'})`}
            onSet={(i, w) => setGetup(i, { weight: w })}
            onSetAll={(w) => onChange({ ...session, getups: session.getups.map((g) => ({ ...g, weight: w })) })}
          />
        )}
        {!live && (
          <TimeInput label="Tiempo get-ups" value={session.getupTimeSec} onChange={(v) => onChange({ ...session, getupTimeSec: v })} />
        )}
      </section>

      <section className="card">
        <h3>¿Cómo se sintió?</h3>
        <p className="muted small">RPE (esfuerzo percibido). Pavel recomienda que la mayoría de sesiones se sientan fáciles.</p>
        <div className="rpe-row">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`rpe-btn rpe-${n <= 6 ? 'easy' : n <= 8 ? 'mid' : 'hard'} ${session.rpe === n ? 'selected' : ''}`}
              onClick={() => onChange({ ...session, rpe: session.rpe === n ? undefined : n })}
            >
              {n}
            </button>
          ))}
        </div>
        {session.rpe !== undefined && (
          <p className="muted small">
            {session.rpe}: {RPE_LABELS[session.rpe]}
          </p>
        )}
        <label className="field">
          <span>Notas</span>
          <textarea
            rows={2}
            value={session.notes ?? ''}
            placeholder="Técnica, sensaciones, dolencias…"
            onChange={(e) => onChange({ ...session, notes: e.target.value })}
          />
        </label>
      </section>
    </div>
  )
}

function WeightEditor({
  weights,
  bells,
  labelFor,
  onSet,
  onSetAll,
}: {
  weights: number[]
  bells: number[]
  labelFor: (i: number) => string
  onSet: (i: number, w: number) => void
  onSetAll: (w: number) => void
}) {
  return (
    <div className="weight-editor">
      <div className="chips">
        <span className="muted small">Todas:</span>
        {bells.map((b) => (
          <button key={b} className="chip" onClick={() => onSetAll(b)}>
            {b}
          </button>
        ))}
      </div>
      <div className="weight-list">
        {weights.map((w, i) => (
          <label key={i} className="weight-item">
            <span>{labelFor(i)}</span>
            <WeightSelect value={w} bells={bells} onChange={(v) => onSet(i, v)} />
          </label>
        ))}
      </div>
    </div>
  )
}
