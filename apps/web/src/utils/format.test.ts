import { describe, expect, it } from 'vitest'
import { avatarHue, initials, joinedAt, plural, relativeTime } from './format'

describe('plural', () => {
  const forms: [string, string, string] = ['пост', 'поста', 'постов']

  it.each([
    [0, 'постов'],
    [1, 'пост'],
    [2, 'поста'],
    [5, 'постов'],
    [11, 'постов'],
    [12, 'постов'],
    [21, 'пост'],
    [22, 'поста'],
    [111, 'постов'],
    [101, 'пост'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, forms)).toBe(expected)
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-10-08T12:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it('formats recent moments', () => {
    expect(relativeTime(ago(10_000), now)).toBe('только что')
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 мин')
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('3 ч')
  })

  it('formats older dates and adds the year only when it differs', () => {
    expect(relativeTime('2026-05-12T12:00:00Z', now)).toMatch(/12 мая/)
    expect(relativeTime('2026-05-12T12:00:00Z', now)).not.toMatch(/2026/)
    expect(relativeTime('2024-05-12T12:00:00Z', now)).toMatch(/2024/)
  })
})

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Алексей Сильвейструк')).toBe('АС')
    expect(initials('vova')).toBe('V')
    expect(initials('  ')).toBe('?')
  })
})

describe('avatarHue', () => {
  it('is stable and within the hue range', () => {
    expect(avatarHue('alex')).toBe(avatarHue('alex'))
    expect(avatarHue('alex')).toBeGreaterThanOrEqual(0)
    expect(avatarHue('alex')).toBeLessThan(360)
  })
})

describe('joinedAt', () => {
  it('uses the genitive month', () => {
    expect(joinedAt('2026-09-08T12:00:00Z')).toBe('С нами с сентября 2026')
    expect(joinedAt('2025-03-15T12:00:00Z')).toBe('С нами с марта 2025')
  })
})
