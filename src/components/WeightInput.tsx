import { useEffect, useState } from 'react'

export const MAX_WEIGHT_KG = 200

export function parseWeight(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= MAX_WEIGHT_KG ? Math.round(n * 10) / 10 : null
}

interface Props {
  value: number
  onCommit: (v: number) => void
  ariaLabel?: string
  className?: string
}

/** Numeric kg field; commits on blur/Enter so intermediate keystrokes don't reshape the session. */
export function WeightInput({ value, onCommit, ariaLabel, className = '' }: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    const parsed = parseWeight(text)
    if (parsed === null) setText(String(value))
    else if (parsed !== value) onCommit(parsed)
  }

  return (
    <span className={`weight-input ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        aria-label={ariaLabel}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span className="unit">kg</span>
    </span>
  )
}

interface GroupsProps {
  weights: number[]
  onChange: (weights: number[]) => void
  label: string
}

/** Edits a mixed-weight plan (e.g. 8×20 + 2×24) one distinct weight at a time. */
export function WeightGroupsInput({ weights, onChange, label }: GroupsProps) {
  const groups: { weight: number; count: number }[] = []
  for (const w of weights) {
    const g = groups.find((x) => x.weight === w)
    if (g) g.count++
    else groups.push({ weight: w, count: 1 })
  }
  groups.sort((a, b) => a.weight - b.weight)

  return (
    <div className="weight-groups">
      {groups.map((g, i) => (
        <span key={g.weight} className="weight-group">
          {i > 0 && <span className="muted">+</span>}
          {groups.length > 1 && <span className="muted">{g.count}×</span>}
          <WeightInput
            className="large"
            value={g.weight}
            ariaLabel={`${label}: peso${groups.length > 1 ? ` del grupo de ${g.count}` : ''}`}
            onCommit={(v) => onChange(weights.map((w) => (w === g.weight ? v : w)))}
          />
        </span>
      ))}
    </div>
  )
}
