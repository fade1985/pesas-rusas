import type { AppData, Session } from '../types'
import { achievement, formatTime, globalStats, sessionStats, startOfWeekISO, STANDARDS, todayISO, type Level } from '../lib/program'

export function ProgressView({ data }: { data: AppData }) {
  const { sessions, settings } = data
  const stats = globalStats(sessions)
  const complete = sessions.filter((s) => sessionStats(s).complete)
  const bestSwing = Math.max(0, ...complete.map((s) => sessionStats(s).minSwingWeight))
  const bestGetup = Math.max(0, ...complete.map((s) => sessionStats(s).minGetupWeight))
  const firstAchieved = (level: Level) =>
    [...sessions].sort((a, b) => a.date.localeCompare(b.date)).find((s) => achievement(s, settings.profile, level) === 'timed')

  return (
    <div className="view">
      <div className="stat-grid">
        <Stat label="Sesiones" value={stats.totalSessions} />
        <Stat label="Esta semana" value={stats.sessionsThisWeek} />
        <Stat label="Racha (semanas)" value={stats.weekStreak} />
        <Stat label="Swings totales" value={stats.totalSwings.toLocaleString('es')} />
        <Stat label="Get-ups totales" value={stats.totalGetups.toLocaleString('es')} />
        <Stat label="Toneladas movidas" value={(stats.totalKg / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} />
      </div>

      {(['simple', 'sinister'] as const).map((level) => {
        const std = STANDARDS[settings.profile][level]
        const done = firstAchieved(level)
        return (
          <section key={level} className={`card goal ${level}`}>
            <div className="card-head">
              <h3>{level === 'simple' ? 'Simple' : 'Sinister'}</h3>
              {done ? <span className="badge simple">Logrado · {done.date}</span> : <span className="muted small">con tiempo: 5:00 + 10:00</span>}
            </div>
            <GoalBar label="Swings" current={bestSwing} goal={std.swing} />
            <GoalBar label="Get-ups" current={bestGetup} goal={std.getup} />
          </section>
        )
      })}

      {stats.bestSwingTimeAtMax && (
        <section className="card">
          <h3>Mejor tiempo de swings</h3>
          <p>
            <span className="big">{formatTime(stats.bestSwingTimeAtMax.time)}</span>{' '}
            <span className="muted">con {stats.bestSwingTimeAtMax.weight} kg en todas las series</span>
          </p>
        </section>
      )}

      <section className="card">
        <h3>Peso medio por sesión</h3>
        {sessions.length >= 2 ? <WeightChart sessions={sessions} goals={STANDARDS[settings.profile]} /> : <p className="muted">Registra al menos 2 sesiones para ver la gráfica.</p>}
      </section>

      <section className="card">
        <h3>Constancia (últimas 16 semanas)</h3>
        <Calendar sessions={sessions} />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  )
}

function GoalBar({ label, current, goal }: { label: string; current: number; goal: number }) {
  const pct = Math.min(100, (current / goal) * 100)
  return (
    <div className="goal-bar">
      <div className="goal-label">
        <span>{label}</span>
        <span className={current >= goal ? 'ok' : 'muted'}>
          {current || '–'} / {goal} kg
        </span>
      </div>
      <div className="progress">
        <div className={`progress-fill ${current >= goal ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function WeightChart({ sessions, goals }: { sessions: Session[]; goals: (typeof STANDARDS)['hombre'] }) {
  const pts = [...sessions].sort((a, b) => a.date.localeCompare(b.date)).slice(-40)
  const sw = pts.map((s) => sessionStats(s).avgSwingWeight)
  const gu = pts.map((s) => sessionStats(s).avgGetupWeight)
  const W = 320
  const H = 180
  const pad = { l: 28, r: 8, t: 10, b: 20 }
  const maxY = Math.max(goals.sinister.swing, ...sw, ...gu) + 4
  const minY = Math.max(0, Math.min(...sw, ...gu) - 8)
  const x = (i: number) => pad.l + (i / Math.max(1, pts.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * (H - pad.t - pad.b)
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks = [minY, (minY + maxY) / 2, maxY].map((v) => Math.round(v))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Gráfica de peso medio">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" className="axis">
              {t}
            </text>
          </g>
        ))}
        {[goals.simple.swing, goals.sinister.swing].map((g, i) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="goal-line" />
            <text x={W - pad.r} y={y(g) - 3} textAnchor="end" className="axis">
              {i ? 'Sinister' : 'Simple'} {g}
            </text>
          </g>
        ))}
        <path d={line(sw)} className="series swing" />
        <path d={line(gu)} className="series getup" />
        {sw.map((v, i) => (
          <circle key={`s${i}`} cx={x(i)} cy={y(v)} r={2.5} className="dot swing" />
        ))}
        {gu.map((v, i) => (
          <circle key={`g${i}`} cx={x(i)} cy={y(v)} r={2.5} className="dot getup" />
        ))}
        <text x={pad.l} y={H - 4} className="axis">
          {pts[0].date}
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="axis">
          {pts[pts.length - 1].date}
        </text>
      </svg>
      <div className="legend">
        <span>
          <i className="swatch swing" /> Swings
        </span>
        <span>
          <i className="swatch getup" /> Get-ups
        </span>
      </div>
    </div>
  )
}

function Calendar({ sessions }: { sessions: Session[] }) {
  const byDate = new Map<string, Session>()
  for (const s of sessions) byDate.set(s.date, s)
  const today = todayISO()
  const [y, m, d] = startOfWeekISO(today).split('-').map(Number)
  const start = new Date(y, m - 1, d - 15 * 7)
  const weeks: string[][] = []
  for (let w = 0; w < 16; w++) {
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      days.push(todayISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)))
    }
    weeks.push(days)
  }
  return (
    <div className="calendar">
      <div className="cal-labels">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      {weeks.map((days) => (
        <div key={days[0]} className="cal-week">
          {days.map((day) => {
            const s = byDate.get(day)
            const rpe = s?.rpe
            const cls = s ? (rpe === undefined ? 'on' : rpe <= 6 ? 'on easy' : rpe <= 8 ? 'on mid' : 'on hard') : day > today ? 'future' : ''
            return <span key={day} className={`cal-day ${cls}`} title={s ? `${day} · RPE ${rpe ?? '–'}` : day} />
          })}
        </div>
      ))}
    </div>
  )
}
