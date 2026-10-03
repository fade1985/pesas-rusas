import { useState } from 'react'
import type { AppData, Session } from '../types'
import { achievement, formatTime, sessionStats, sortByDateDesc, summarizeWeights, SWING_TIME_LIMIT_SEC, GETUP_TIME_LIMIT_SEC } from '../lib/program'
import { SessionForm } from './SessionForm'

interface Props {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  editing: Session | null
  setEditing: (s: Session | null) => void
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function Badges({ session, profile }: { session: Session; profile: AppData['settings']['profile'] }) {
  const sinister = achievement(session, profile, 'sinister')
  const simple = achievement(session, profile, 'simple')
  if (sinister) return <span className="badge sinister">Sinister{sinister === 'timeless' ? ' (sin tiempo)' : ''}</span>
  if (simple) return <span className="badge simple">Simple{simple === 'timeless' ? ' (sin tiempo)' : ''}</span>
  return null
}

export function HistoryView({ data, update, editing, setEditing }: Props) {
  const sessions = sortByDateDesc(data.sessions)
  const isNew = editing !== null && !data.sessions.some((s) => s.id === editing.id)

  if (editing) {
    return <EditSession key={editing.id} initial={editing} isNew={isNew} data={data} update={update} close={() => setEditing(null)} />
  }

  if (!sessions.length) {
    return (
      <div className="view">
        <div className="empty card">
          <h3>Aún no hay sesiones</h3>
          <p className="muted">Completa tu primer entrenamiento desde la pestaña Entrenar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      {sessions.map((s) => {
        const st = sessionStats(s)
        return (
          <button key={s.id} className="card history-item" onClick={() => setEditing(s)}>
            <div className="history-head">
              <strong>{formatDate(s.date)}</strong>
              <Badges session={s} profile={data.settings.profile} />
            </div>
            <div className="history-body">
              <div>
                <span className="muted small">Swings</span>
                <div>
                  {st.swingReps} · {summarizeWeights(s.swings.map((x) => x.weight))}
                </div>
                {s.swingTimeSec !== undefined && (
                  <div className={`small ${s.swingTimeSec <= SWING_TIME_LIMIT_SEC ? 'ok' : 'warn'}`}>⏱ {formatTime(s.swingTimeSec)}</div>
                )}
              </div>
              <div>
                <span className="muted small">Get-ups</span>
                <div>
                  {st.getupReps} · {summarizeWeights(s.getups.map((x) => x.weight))}
                </div>
                {s.getupTimeSec !== undefined && (
                  <div className={`small ${s.getupTimeSec <= GETUP_TIME_LIMIT_SEC ? 'ok' : 'warn'}`}>⏱ {formatTime(s.getupTimeSec)}</div>
                )}
              </div>
              <div>
                <span className="muted small">RPE</span>
                <div>{s.rpe ?? '–'}</div>
              </div>
            </div>
            {s.notes && <p className="muted small notes">{s.notes}</p>}
          </button>
        )
      })}
    </div>
  )
}

function EditSession({
  initial,
  isNew,
  data,
  update,
  close,
}: {
  initial: Session
  isNew: boolean
  data: AppData
  update: Props['update']
  close: () => void
}) {
  const [session, setSession] = useState(initial)
  const save = () => {
    const s = { ...session }
    if (!s.notes?.trim()) delete s.notes
    update((d) => ({
      ...d,
      sessions: isNew ? [...d.sessions, s] : d.sessions.map((x) => (x.id === s.id ? s : x)),
    }))
    close()
  }
  const remove = () => {
    if (!confirm('¿Eliminar esta sesión?')) return
    update((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== session.id) }))
    close()
  }
  return (
    <div className="view">
      <div className="view-title">
        <button className="link" onClick={close}>
          ← Volver
        </button>
        <h2>{isNew ? 'Registrar sesión' : 'Editar sesión'}</h2>
      </div>
      <SessionForm session={session} bells={data.settings.bells} onChange={setSession} />
      <div className="actions sticky">
        {!isNew && (
          <button className="btn danger" onClick={remove}>
            Eliminar
          </button>
        )}
        <button className="btn primary" onClick={save}>
          Guardar
        </button>
      </div>
    </div>
  )
}
