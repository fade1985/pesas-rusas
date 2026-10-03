import { useRef, useState } from 'react'
import type { AppData } from '../types'
import { DEFAULT_BELLS, STANDARDS } from '../lib/program'
import { emptyData, parseData } from '../lib/storage'

interface Props {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  replace: (d: AppData) => void
}

export function SettingsView({ data, update, replace }: Props) {
  const { settings } = data
  const fileRef = useRef<HTMLInputElement>(null)
  const [custom, setCustom] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const allBells = [...new Set([...DEFAULT_BELLS, ...settings.bells])].sort((a, b) => a - b)

  const setSettings = (patch: Partial<AppData['settings']>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))

  const toggleBell = (b: number) => {
    const has = settings.bells.includes(b)
    if (has && settings.bells.length === 1) return
    setSettings({ bells: has ? settings.bells.filter((x) => x !== b) : [...settings.bells, b].sort((a, c) => a - c) })
  }

  const addCustom = () => {
    const n = Number(custom.replace(',', '.'))
    if (n > 0 && n < 200 && !settings.bells.includes(n)) setSettings({ bells: [...settings.bells, n].sort((a, c) => a - c) })
    setCustom('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...data, draft: null }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simple-sinister-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const parsed = parseData(JSON.parse(await file.text()))
      if (!confirm(`Importar ${parsed.sessions.length} sesiones? Esto reemplaza tus datos actuales.`)) return
      replace(parsed)
      setStatus(`Importadas ${parsed.sessions.length} sesiones.`)
    } catch (e) {
      setStatus(`No se pudo importar: ${(e as Error).message}`)
    }
  }

  const std = STANDARDS[settings.profile]

  return (
    <div className="view">
      <section className="card">
        <h3>Estándares</h3>
        <div className="segmented">
          {(['hombre', 'mujer'] as const).map((p) => (
            <button key={p} className={settings.profile === p ? 'active' : ''} onClick={() => setSettings({ profile: p })}>
              {p === 'hombre' ? 'Hombre' : 'Mujer'}
            </button>
          ))}
        </div>
        <table className="std-table">
          <thead>
            <tr>
              <th />
              <th>Swings</th>
              <th>Get-ups</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Simple</td>
              <td>{std.simple.swing} kg</td>
              <td>{std.simple.getup} kg</td>
            </tr>
            <tr>
              <td>Sinister</td>
              <td>{std.sinister.swing} kg</td>
              <td>{std.sinister.getup} kg</td>
            </tr>
          </tbody>
        </table>
        <p className="muted small">100 swings en 5 minutos, 1 minuto de descanso y 10 get-ups en 10 minutos.</p>
      </section>

      <section className="card">
        <h3>Mis pesas rusas</h3>
        <p className="muted small">Se usan para elegir pesos y sugerir la siguiente progresión.</p>
        <div className="chips">
          {allBells.map((b) => (
            <button key={b} className={`chip ${settings.bells.includes(b) ? 'active' : ''}`} onClick={() => toggleBell(b)}>
              {b} kg
            </button>
          ))}
        </div>
        <div className="inline-form">
          <input inputMode="decimal" placeholder="Otro peso (kg)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
          <button className="btn" onClick={addCustom}>
            Añadir
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Temporizador</h3>
        <label className="toggle">
          <input type="checkbox" checked={settings.intervalBeeps} onChange={(e) => setSettings({ intervalBeeps: e.target.checked })} />
          <span>Pitido en cada intervalo (30 s swings, 60 s get-ups)</span>
        </label>
      </section>

      <section className="card">
        <h3>Datos</h3>
        <p className="muted small">Todo se guarda en este navegador. Exporta una copia de seguridad de vez en cuando.</p>
        <div className="button-row">
          <button className="btn" onClick={exportData}>
            Exportar JSON
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <button
            className="btn danger"
            onClick={() => confirm('¿Borrar todas las sesiones y ajustes?') && replace(emptyData())}
          >
            Borrar todo
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importData(f)
            e.target.value = ''
          }}
        />
        {status && <p className="small">{status}</p>}
      </section>
    </div>
  )
}
