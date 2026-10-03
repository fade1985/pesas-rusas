import { useState } from 'react'
import type { Session } from './types'
import { useAppData } from './hooks/useAppData'
import { createSession, suggestNext } from './lib/program'
import { TrainView } from './components/TrainView'
import { HistoryView } from './components/HistoryView'
import { ProgressView } from './components/ProgressView'
import { SettingsView } from './components/SettingsView'

type Tab = 'train' | 'history' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'train', label: 'Entrenar', icon: 'M8 9a4 4 0 0 1 8 0M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12z' },
  { id: 'history', label: 'Historial', icon: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5' },
  { id: 'progress', label: 'Progreso', icon: 'M4 20V4M4 20h16M7 15l4-4 3 3 5-6' },
  { id: 'settings', label: 'Ajustes', icon: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4' },
]

export default function App() {
  const [data, update, replace] = useAppData()
  const [tab, setTab] = useState<Tab>('train')
  const [editing, setEditing] = useState<Session | null>(null)

  const logPast = () => {
    const sug = suggestNext(data.sessions, data.settings.bells)
    const s = createSession(sug.swings, sug.getups)
    s.swings.forEach((x) => (x.done = true))
    s.getups.forEach((x) => (x.done = true))
    s.warmup = true
    setEditing(s)
    setTab('history')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="28" height="28">
            <path d="M10 11a6 6 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="16" cy="20" r="9" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1>Simple &amp; Sinister</h1>
          <p className="muted small">Tracker de pesas rusas</p>
        </div>
        {data.draft && tab !== 'train' && (
          <button className="pill live" onClick={() => setTab('train')}>
            ● En curso
          </button>
        )}
      </header>

      <main>
        {tab === 'train' && <TrainView data={data} update={update} onLogPast={logPast} />}
        {tab === 'history' && <HistoryView data={data} update={update} editing={editing} setEditing={setEditing} />}
        {tab === 'progress' && <ProgressView data={data} />}
        {tab === 'settings' && <SettingsView data={data} update={update} replace={replace} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              setTab(t.id)
              if (t.id !== 'history') setEditing(null)
            }}
          >
            <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden>
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
