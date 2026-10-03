import { describe, expect, it } from 'vitest'
import { parseWeight } from './WeightInput'

describe('parseWeight', () => {
  it('accepts positive numbers and comma decimals', () => {
    expect(parseWeight('24')).toBe(24)
    expect(parseWeight(' 22,5 ')).toBe(22.5)
  })
  it('rejects empty, zero, negative and absurd values', () => {
    expect(parseWeight('')).toBeNull()
    expect(parseWeight('0')).toBeNull()
    expect(parseWeight('-8')).toBeNull()
    expect(parseWeight('500')).toBeNull()
    expect(parseWeight('abc')).toBeNull()
  })
})
